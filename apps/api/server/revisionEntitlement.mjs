import { createGooglePlayClient, normalizePlaySubscription, obfuscatedAccountId, billingError } from './googlePlayBilling.mjs';

export const REVISION_ENTITLEMENT_REVALIDATION_MS=15*60*1000;
export const REVISION_ENTITLEMENT_MAX_STALE_MS=24*60*60*1000;

export async function revisionIdentity(admin,userId) {
  const {data,error}=await admin.from('identity_links').select('external_subject').eq('local_user_id',userId).eq('issuer','https://nnsgvnjzfrcmbxfwlyow.supabase.co/auth/v1').maybeSingle();
  if(error || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data?.external_subject??'')) throw billingError('identity_link_missing');
  return data.external_subject;
}
export async function verifyRevisionPurchase(admin,identity,token,{google=createGooglePlayClient(),env=process.env,revocationNotice=false}={}) {
  if(typeof token!=='string' || token.length<8 || token.length>4096) throw billingError('invalid_purchase',400);
  const verifiedAt=new Date().toISOString();
  const purchase=await google.get(token);
  const snapshot=normalizePlaySubscription(purchase,obfuscatedAccountId(identity,env));
  if(revocationNotice && snapshot.status==='expired') snapshot.status='revoked';
  const {error}=await admin.rpc('revision_apply_play_purchase',{p_identity:identity,p_token:token,p_linked_token:purchase.linkedPurchaseToken??null,p_snapshot:snapshot,p_verified_at:verifiedAt});
  if(error) {
    const known=['trial_already_used','purchase_owner_mismatch','subscription_conflict'].find(code=>String(error.message).includes(code));
    throw billingError(known??'billing_storage_unavailable',known?409:503);
  }
  // Persist entitlement first; retry acknowledgement on restoration/notification.
  if(purchase.acknowledgementState==='ACKNOWLEDGEMENT_STATE_PENDING' && ['trial','active','grace_period','canceled_but_active'].includes(snapshot.status)) await google.acknowledge(token,snapshot.productId);
  return snapshot;
}
export async function refreshRevisionSubscription(admin,identity,{force=false,now=Date.now(),...dependencies}={}) {
  const {data,error}=await admin.from('revision_subscriptions').select('purchase_token,current_period_end,verified_at').eq('identity_user_id',identity).maybeSingle();
  if(error) throw billingError('billing_storage_unavailable');
  if(data?.purchase_token) {
    const verifiedAt=Date.parse(data.verified_at??'');
    const verificationAge=Number.isFinite(verifiedAt)?now-verifiedAt:Number.POSITIVE_INFINITY;
    if(!force && verificationAge<REVISION_ENTITLEMENT_REVALIDATION_MS) return;
    try { await verifyRevisionPurchase(admin,identity,data.purchase_token,dependencies); }
    catch(error) {
      // Long-expired tokens can no longer be queried at Google. Never extend rights.
      if(error.code==='invalid_purchase' && Date.parse(data.current_period_end)<=now) return;
      // A short Google outage must not revoke a still-valid paid period, but stale
      // rights are never trusted for more than 24 hours without revalidation.
      const temporary=error?.statusCode>=500 || error?.code==='billing_unavailable';
      if(temporary && verificationAge<=REVISION_ENTITLEMENT_MAX_STALE_MS && Date.parse(data.current_period_end)>now) return;
      throw error;
    }
  }
}
export async function getRevisionEntitlement(admin,userId,{feature=null,reserve=false,...dependencies}={}) {
  const identity=await revisionIdentity(admin,userId);
  await refreshRevisionSubscription(admin,identity,{...dependencies,force:reserve});
  const {data,error}=await admin.rpc(reserve?'revision_reserve_quota':'revision_entitlement',{p_identity:identity,p_feature:feature});
  if(error || !data?.usage) throw billingError('quota_unavailable');
  if(data.allowed===false) {
    const failure=billingError('quota_exceeded',429);
    failure.message='Tu as atteint la limite de cette fonctionnalité. Choisis Standard ou Premium, ou attends le renouvellement du quota.';
    Object.assign(failure,{feature,plan:data.plan,resetAt:data.usage[feature]?.resetAt});
    throw failure;
  }
  return data;
}
export const consumeRevisionQuota=(admin,userId,feature)=>getRevisionEntitlement(admin,userId,{feature});
export const reserveRevisionQuota=(admin,userId,feature)=>getRevisionEntitlement(admin,userId,{feature,reserve:true});
export async function refundFailedRevisionQuota(admin,reservation,error) {
  if(!reservation?.reservationId || error?.refundableProviderFailure!==true) return;
  const {error:failure}=await admin.rpc('revision_refund_quota',{p_reservation:reservation.reservationId});
  if(failure) throw billingError('quota_refund_unavailable');
}
