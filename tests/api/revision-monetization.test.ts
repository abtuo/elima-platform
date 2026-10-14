/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizePlaySubscription,obfuscatedAccountId} from '../../apps/api/server/googlePlayBilling.mjs';
import {verifyRevisionPurchase,consumeRevisionQuota} from '../../apps/api/server/revisionEntitlement.mjs';

const identity='00000000-0000-4000-8000-000000000001';
const env={GOOGLE_PLAY_ACCOUNT_HASH_SECRET:'test-only-secret'};
const accountId=obfuscatedAccountId(identity,env);
function googlePurchase(plan='standard',state='SUBSCRIPTION_STATE_ACTIVE',trial=false) {
  return {subscriptionState:state,acknowledgementState:'ACKNOWLEDGEMENT_STATE_PENDING',startTime:new Date().toISOString(),externalAccountIdentifiers:{obfuscatedExternalAccountId:accountId},lineItems:[{productId:`elima_revision_${plan}`,latestSuccessfulOrderId:'GPA.fixture',expiryTime:new Date(Date.now()+86400000).toISOString(),autoRenewingPlan:{autoRenewEnabled:true},offerDetails:{basePlanId:'monthly',...(trial?{offerId:'trial-1-month'}:{})},offerPhase:trial?{freeTrial:{}}:{basePrice:{}}}]};
}
test('Google authoritative states: Standard/Premium, grace, hold, cancellation, expiry, invalid owner',()=>{
  for(const plan of ['standard','premium']) assert.equal(normalizePlaySubscription(googlePurchase(plan),accountId).plan,plan);
  assert.equal(normalizePlaySubscription(googlePurchase('standard','SUBSCRIPTION_STATE_ACTIVE',true),accountId).status,'trial');
  for(const state of ['SUBSCRIPTION_STATE_CANCELED','SUBSCRIPTION_STATE_IN_GRACE_PERIOD']) assert.equal(normalizePlaySubscription(googlePurchase('premium',state),accountId).plan,'premium');
  for(const state of ['SUBSCRIPTION_STATE_ON_HOLD','SUBSCRIPTION_STATE_EXPIRED','SUBSCRIPTION_STATE_PAUSED']) assert.equal(normalizePlaySubscription(googlePurchase('premium',state),accountId).plan,'free');
  const expired=googlePurchase();expired.lineItems[0].expiryTime='2000-01-01T00:00:00Z';assert.equal(normalizePlaySubscription(expired,accountId).plan,'free');
  assert.throws(()=>normalizePlaySubscription(googlePurchase(),'other'),/abonnement/);
  assert.throws(()=>normalizePlaySubscription(googlePurchase('invalid'),accountId));
  assert.throws(()=>normalizePlaySubscription(googlePurchase('standard','SUBSCRIPTION_STATE_PENDING'),accountId));
});

test('PostgreSQL: exact quotas, serialized consumption, daily/weekly resets, trial once and replacements',async(t)=>{
  const db=new PGlite();t.after(()=>db.close());
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(await readFile(new URL('../../supabase/migrations/20261003160000_revision_monetization.sql',import.meta.url),'utf8'));
  const call=async(feature:string|null=null)=>((await db.query('select revision_entitlement($1,$2) as result',[identity,feature])).rows[0] as any).result;
  const clear=()=>db.exec('delete from revision_usage');
  await call();
  for(const [plan,limits] of Object.entries({free:[2,2,2,5],standard:[10,3,3,25],premium:[500,200,100,1000]})) {
    await clear();
    await db.query("update revision_subscriptions set plan=$1,status='active',current_period_end=now()+interval '1 day' where identity_user_id=$2",[plan,identity]);
    const features=['ai_quiz','ai_flashcard','document_scan','ai_hint'];
    for(let i=0;i<features.length;i++) {
      const f=features[i];const first=await call(f);
      assert.equal(first.usage[f].limit,plan==='premium'?null:limits[i]);
      assert.equal(first.usage[f].unlimited,plan==='premium');
      await db.query('update revision_usage set count=$1 where identity_user_id=$2 and feature=$3',[limits[i]-1,identity,f]);
      assert.equal((await call(f)).allowed,true);
      assert.equal((await call(f)).allowed,false);
    }
  }
  await clear();await db.query("update revision_subscriptions set plan='free' where identity_user_id=$1",[identity]);
  const parallel=await Promise.all(Array.from({length:30},()=>call('ai_quiz')));
  assert.equal(parallel.filter(r=>r.allowed).length,2);
  await db.exec("update revision_usage set period=period-interval '1 day'");assert.equal((await call('ai_quiz')).allowed,true);
  await call('document_scan');await call('document_scan');assert.equal((await call('document_scan')).allowed,false);
  await db.exec("update revision_usage set period=period-interval '8 days'");assert.equal((await call('document_scan')).allowed,true);
  await assert.rejects(call('random_quiz'));
  await db.query("update revision_subscriptions set plan='premium',status='active',current_period_end=now()-interval '1 second' where identity_user_id=$1",[identity]);assert.equal((await call()).plan,'free');
  const admin={async rpc(name:string,args:any){try{await db.query('select revision_apply_play_purchase($1,$2,$3,$4,$5)',[args.p_identity,args.p_token,args.p_linked_token,JSON.stringify(args.p_snapshot),args.p_verified_at]);return {error:null};}catch(error){return {error};}}};
  let purchase:any=googlePurchase('standard','SUBSCRIPTION_STATE_ACTIVE',true);let acknowledgements=0;
  const google={async get(){return purchase;},async acknowledge(){acknowledgements++;}};
  await verifyRevisionPurchase(admin,identity,'purchase-token-1',{google,env});assert.equal((await call()).plan,'standard');
  await verifyRevisionPurchase(admin,identity,'purchase-token-1',{google,env});assert.equal((await call()).trialUsed,true);
  purchase=googlePurchase('premium');purchase.linkedPurchaseToken='purchase-token-1';
  await verifyRevisionPurchase(admin,identity,'purchase-token-2',{google,env});assert.equal((await call()).plan,'premium');
  // Older RTDN/restoration cannot replace the new purchase.
  purchase=googlePurchase('standard');await verifyRevisionPurchase(admin,identity,'purchase-token-1',{google,env});assert.equal((await call()).plan,'premium');
  purchase=googlePurchase('standard','SUBSCRIPTION_STATE_ACTIVE',true);purchase.linkedPurchaseToken='purchase-token-2';
  await assert.rejects(verifyRevisionPurchase(admin,identity,'purchase-token-3',{google,env}),{code:'trial_already_used'});
  purchase=googlePurchase('premium','SUBSCRIPTION_STATE_CANCELED');await verifyRevisionPurchase(admin,identity,'purchase-token-2',{google,env});assert.equal((await call()).plan,'premium');
  // Deferred downgrade still reports current Premium until Google switches it.
  purchase=googlePurchase('premium');purchase.linkedPurchaseToken='purchase-token-2';
  await verifyRevisionPurchase(admin,identity,'purchase-token-4',{google,env});assert.equal((await call()).plan,'premium');
  purchase=googlePurchase('standard');await verifyRevisionPurchase(admin,identity,'purchase-token-4',{google,env});assert.equal((await call()).plan,'standard');
  assert.ok(acknowledgements>0);
  purchase=googlePurchase('standard','SUBSCRIPTION_STATE_EXPIRED');
  await verifyRevisionPurchase(admin,identity,'purchase-token-4',{google,env,revocationNotice:true});
  assert.equal((await call()).plan,'free');
  assert.equal((await call()).status,'revoked');
  await db.exec('set role authenticated');await assert.rejects(db.query('select * from revision_subscriptions'));await assert.rejects(call());
});

test('quota_exceeded carries safe feature/plan/resetAt; missing identity fails closed',async()=>{
  const resetAt='2030-01-07T00:00:00Z';
  const admin={from(table:string){const chain:any={select(){return chain;},eq(){return chain;},async maybeSingle(){return {data:table==='identity_links'?{external_subject:identity}:null,error:null};}};return chain;},async rpc(){return {data:{allowed:false,plan:'free',usage:{ai_quiz:{resetAt}}},error:null};}};
  await assert.rejects(consumeRevisionQuota(admin,'local-user','ai_quiz'),{code:'quota_exceeded',statusCode:429,feature:'ai_quiz',plan:'free',resetAt});
  const missing={from(){const chain:any={select(){return chain;},eq(){return chain;},async maybeSingle(){return {data:null,error:null};}};return chain;}};
  await assert.rejects(consumeRevisionQuota(missing,'unknown','ai_quiz'),{code:'identity_link_missing'});
});

test('invalid Google purchase never writes entitlement or acknowledges',async()=>{
  let writes=0,acks=0;
  const admin={async rpc(){writes++;return {error:null};}};
  const google={async get(){return {...googlePurchase(),externalAccountIdentifiers:{obfuscatedExternalAccountId:'other-account'}};},async acknowledge(){acks++;}};
  await assert.rejects(verifyRevisionPurchase(admin,identity,'invalid-token',{google,env}),{code:'purchase_owner_mismatch'});
  assert.equal(writes,0);assert.equal(acks,0);
});
 
