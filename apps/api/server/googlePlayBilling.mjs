import { createHmac } from 'node:crypto';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { RevisionApiError } from './revisionAiQuota.mjs';

export const PLAY_PRODUCTS = { elima_revision_standard: 'standard', elima_revision_premium: 'premium' };
export const billingError = (code='billing_unavailable', status=503) => new RevisionApiError('Le service d’abonnement est momentanément indisponible. Réessaie ou restaure tes achats.',status,code);
export function obfuscatedAccountId(identity,env=process.env) {
  if (!env.GOOGLE_PLAY_ACCOUNT_HASH_SECRET) throw billingError('billing_configuration_missing');
  return createHmac('sha256',env.GOOGLE_PLAY_ACCOUNT_HASH_SECRET).update(identity).digest('hex');
}
export function normalizePlaySubscription(purchase,accountId,now=Date.now()) {
  if(!Number.isFinite(Date.parse(purchase.startTime))) throw billingError('invalid_purchase',400);
  if(purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId!==accountId) throw billingError('purchase_owner_mismatch',403);
  const items=(purchase.lineItems??[]).filter(item=>PLAY_PRODUCTS[item.productId] && item.autoRenewingPlan && item.offerDetails?.basePlanId==='monthly' && Number.isFinite(Date.parse(item.expiryTime)));
  // Deferred replacement items without a completed order must not grant the future plan.
  const item=items.filter(i=>i.latestSuccessfulOrderId).sort((a,b)=>Date.parse(b.expiryTime)-Date.parse(a.expiryTime))[0];
  if(!item) throw billingError('invalid_purchase',400);
  const state=purchase.subscriptionState;
  if(['SUBSCRIPTION_STATE_PENDING','SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED'].includes(state)) throw billingError('purchase_pending',409);
  const trial=Object.hasOwn(item.offerPhase??{},'freeTrial');
  const states={SUBSCRIPTION_STATE_ACTIVE:trial?'trial':'active',SUBSCRIPTION_STATE_IN_GRACE_PERIOD:'grace_period',SUBSCRIPTION_STATE_ON_HOLD:'on_hold',SUBSCRIPTION_STATE_PAUSED:'on_hold',SUBSCRIPTION_STATE_CANCELED:'canceled_but_active',SUBSCRIPTION_STATE_EXPIRED:'expired'};
  let status=states[state];
  if(!status) throw billingError('invalid_purchase',400);
  // Google revocations normally expire immediately; no access beyond expiryTime.
  if(Date.parse(item.expiryTime)<=now) status='expired';
  const entitled=['trial','active','grace_period','canceled_but_active'].includes(status);
  return {plan:entitled?PLAY_PRODUCTS[item.productId]:'free',productId:item.productId,status,periodEnd:item.expiryTime,startedAt:purchase.startTime,autoRenewing:item.autoRenewingPlan.autoRenewEnabled===true,trial,usedTrial:trial || item.offerDetails?.offerId==='trial-1-month'};
}
export function createGooglePlayClient(env=process.env) {
  let credentials;
  try { credentials=JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON??''); } catch { throw billingError('billing_configuration_missing'); }
  if(env.GOOGLE_PLAY_PACKAGE_NAME!=='ci.elima.revision' || !credentials.client_email || !credentials.private_key) throw billingError('billing_configuration_missing');
  const auth=new GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/androidpublisher']});
  const base=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${env.GOOGLE_PLAY_PACKAGE_NAME}/purchases`;
  return {
    async get(token) {
      try { const client=await auth.getClient();return (await client.request({url:`${base}/subscriptionsv2/tokens/${encodeURIComponent(token)}`,timeout:15000})).data; }
      catch(error) { throw billingError([400,404,410].includes(error?.response?.status)?'invalid_purchase':'billing_unavailable',[400,404,410].includes(error?.response?.status)?400:503); }
    },
    async acknowledge(token,productId) {
      try { const client=await auth.getClient();await client.request({url:`${base}/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`,method:'POST',data:{},timeout:15000}); }
      catch {
        // A concurrent verifier may already have acknowledged the same purchase.
        if((await this.get(token)).acknowledgementState!=='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') throw billingError();
      }
    },
  };
}
export async function verifyRtdnAuthorization(header,env=process.env) {
  if(!env.GOOGLE_PLAY_RTDN_AUDIENCE || !env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL) throw billingError('billing_configuration_missing');
  try {
    const ticket=await new OAuth2Client().verifyIdToken({idToken:String(header??'').replace(/^Bearer /,''),audience:env.GOOGLE_PLAY_RTDN_AUDIENCE});
    const p=ticket.getPayload();
    if(p?.email!==env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL || p.email_verified!==true) throw Error();
  } catch { throw billingError('invalid_notification',401); }
}
