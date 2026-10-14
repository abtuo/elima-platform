/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {azureChat} from '../../apps/api/server/azureOpenAi.mjs';
import {refundFailedRevisionQuota} from '../../apps/api/server/revisionEntitlement.mjs';
const identity='00000000-0000-4000-8000-000000000001';
const env={AZURE_OPENAI_ENDPOINT:'https://azure.example',AZURE_OPENAI_DEPLOYMENT:'test',AZURE_OPENAI_API_KEY:'test'};

test('refunds are atomic/idempotent, use the original bucket, and remain server-only',async(t)=>{
  const db=new PGlite();t.after(()=>db.close());
  await db.exec('create role anon; create role authenticated; create role service_role;');
  for(const file of ['20261003160000_revision_monetization.sql','20261003170000_revision_quota_refunds.sql']) await db.exec(await readFile(new URL(`../../supabase/migrations/${file}`,import.meta.url),'utf8'));
  const reserve=async()=>((await db.query('select revision_reserve_quota($1,$2) as value',[identity,'ai_quiz'])).rows[0] as any).value;
  const first=await reserve(); const second=await reserve();
  assert.equal((await reserve()).allowed,false);
  const refunds=await Promise.all(Array.from({length:10},()=>db.query('select revision_refund_quota($1) as refunded',[first.reservationId])));
  assert.equal(refunds.filter(r=>(r.rows[0] as any).refunded).length,1);
  assert.equal((await reserve()).allowed,true);
  assert.equal((await reserve()).allowed,false);
  // A delayed refund after midnight must not subtract from today's consumption.
  await db.exec("update revision_usage set period=period-interval '1 day'; update revision_quota_reservations set period=period-interval '1 day';");
  await reserve();await db.query('select revision_refund_quota($1)',[second.reservationId]);
  const today=await db.query("select count from revision_usage where period=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'");
  assert.equal((today.rows[0] as any).count,1);
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select revision_refund_quota($1)',[first.reservationId]),/permission denied/);
});

test('only Azure supplier/network/timeout errors refund; invalid requests and produced responses stay charged',async()=>{
  let refunds=0;
  const admin={async rpc(name:string){assert.equal(name,'revision_refund_quota');refunds++;return {error:null};}};
  const receipt={reservationId:'receipt'};
  for(const status of [400,403,422,408,429,500,503]) {
    const before=refunds;
    try { await azureChat([],{},env,async()=>new Response('{}',{status})); }
    catch(error) { await refundFailedRevisionQuota(admin,receipt,error); }
    assert.equal(refunds-before,[408,429,500,503].includes(status)?1:0);
  }
  for(const failure of [new TypeError('fetch failed'),new DOMException('timeout','TimeoutError')]) {
    const before=refunds;
    try {await azureChat([],{},env,async()=>{throw failure;});}
    catch(error){await refundFailedRevisionQuota(admin,receipt,error);}
    assert.equal(refunds,before+1);
  }
  const before=refunds;
  const content=await azureChat([],{},env,async()=>Response.json({choices:[{message:{content:'produced but not JSON'}}]}));
  try{JSON.parse(content);}catch(error){await refundFailedRevisionQuota(admin,receipt,error);}
  await refundFailedRevisionQuota(admin,receipt,Object.assign(new Error('invalid'),{statusCode:400}));
  await refundFailedRevisionQuota(admin,null,Object.assign(new Error('network'),{refundableProviderFailure:true}));
  assert.equal(refunds,before);
});
 
