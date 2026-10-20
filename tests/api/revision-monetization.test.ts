/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {GOOGLE_PLAY_WIF,createGooglePlayAuthClient,createGooglePlayClient,isGooglePlayBillingEnabled,isGooglePlayPurchaseConfigured,isGooglePlayServerConfigured,isGooglePlayWifConfigured,normalizePlaySubscription,obfuscatedAccountId,resolveGooglePlayAuthMode} from '../../apps/api/server/googlePlayBilling.mjs';
import {verifyRevisionPurchase,consumeRevisionQuota} from '../../apps/api/server/revisionEntitlement.mjs';

const identity='00000000-0000-4000-8000-000000000001';
const env={GOOGLE_PLAY_ACCOUNT_HASH_SECRET:'test-only-secret'};
const accountId=obfuscatedAccountId(identity,env);

test('Google Play server configuration fails closed without exposing configuration values',()=>{
  assert.equal(isGooglePlayServerConfigured({}),false);
  const purchaseConfig={
    GOOGLE_PLAY_PACKAGE_NAME:'ci.elima.revision',
    GOOGLE_PLAY_ACCOUNT_HASH_SECRET:'x'.repeat(32),
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'billing@example.test',private_key:'private'}),
  };
  assert.equal(isGooglePlayPurchaseConfigured(purchaseConfig),true);
  assert.equal(isGooglePlayServerConfigured(purchaseConfig),false);
  const fullConfig={...purchaseConfig,GOOGLE_PLAY_RTDN_AUDIENCE:'https://api.example.test/api/google-play-rtdn',GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL:'push@example.test'};
  assert.equal(isGooglePlayServerConfigured(fullConfig),true);
  assert.equal(isGooglePlayBillingEnabled(fullConfig),false);
  assert.equal(isGooglePlayBillingEnabled({...fullConfig,GOOGLE_PLAY_BILLING_ENABLED:'true'}),true);
  assert.equal(isGooglePlayServerConfigured({
    GOOGLE_PLAY_PACKAGE_NAME:'ci.elima.identity',
    GOOGLE_PLAY_ACCOUNT_HASH_SECRET:'x'.repeat(32),
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'billing@example.test',private_key:'private'}),
    GOOGLE_PLAY_RTDN_AUDIENCE:'https://api.example.test/api/google-play-rtdn',
    GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL:'push@example.test',
  }),false);
});

test('Vercel OIDC WIF uses the pinned Elima provider and refuses static JSON in production',async()=>{
  const wif={
    VERCEL_ENV:'production',
    GOOGLE_PLAY_PACKAGE_NAME:'ci.elima.revision',
    GOOGLE_PLAY_ACCOUNT_HASH_SECRET:'x'.repeat(32),
    GCP_PROJECT_ID:GOOGLE_PLAY_WIF.projectId,
    GCP_PROJECT_NUMBER:GOOGLE_PLAY_WIF.projectNumber,
    GCP_WORKLOAD_IDENTITY_POOL_ID:GOOGLE_PLAY_WIF.poolId,
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID:GOOGLE_PLAY_WIF.providerId,
    GCP_SERVICE_ACCOUNT_EMAIL:GOOGLE_PLAY_WIF.serviceAccountEmail,
  };
  assert.equal(isGooglePlayWifConfigured(wif),true);
  assert.equal(resolveGooglePlayAuthMode(wif),'vercel_oidc');
  assert.equal(isGooglePlayPurchaseConfigured(wif),true);
  assert.equal(resolveGooglePlayAuthMode({...wif,GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'legacy@example.test',private_key:'secret'})}),null);
  const requested:string[]=[];
  const client=await createGooglePlayAuthClient(wif,{getOidcToken:async(options)=>{requested.push(String(options?.expirationBufferMs));return 'vercel-request-context-token';}});
  assert.equal(await client.retrieveSubjectToken(),'vercel-request-context-token');
  assert.deepEqual(requested,[String(5*60*1000)]);
  assert.equal(client.scopes?.includes('https://www.googleapis.com/auth/androidpublisher'),true);
  const requests:any[]=[];
  const google=createGooglePlayClient(wif,{authClient:{async request(options:any){requests.push(options);return {data:{subscriptions:[]}};}}});
  assert.deepEqual(await google.listSubscriptions(),{subscriptions:[]});
  assert.match(requests[0].url,/\/applications\/ci\.elima\.revision\/subscriptions$/);
  assert.deepEqual(requests[0].params,{pageSize:100});
  assert.equal(requests[0].method,undefined);
});

test('billing predeployment check is explicit, Revision-only and never prints secrets',async()=>{
  const script=await readFile(new URL('../../apps/api/scripts/check-revision-billing-config.mjs',import.meta.url),'utf8');
  assert.match(script,/rydnrvvmwixrkmnvpajf/);
  assert.match(script,/ci\.elima\.revision/);
  assert.match(script,/isGooglePlayPurchaseConfigured/);
  assert.match(script,/isGooglePlayRtdnConfigured/);
  assert.match(script,/--live/);
  assert.match(script,/listSubscriptions/);
  assert.doesNotMatch(script,/console\.(?:log|error)\([^\n]*(?:SERVICE_ACCOUNT_JSON|HASH_SECRET|private_key)/);
});

test('subscription verification stays server-side and fails closed until Billing is explicitly enabled',async()=>{
  const handler=await readFile(new URL('../../apps/api/server/handlers/revision-subscription.mjs',import.meta.url),'utf8');
  assert.match(handler,/if\(!isGooglePlayBillingEnabled\(\)\) throw billingError\('billing_configuration_missing'\)/);
  assert.match(handler,/verifyRevisionPurchase/);
  assert.doesNotMatch(handler,/plan\s*=\s*['"](?:standard|premium)/);
});

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
 
