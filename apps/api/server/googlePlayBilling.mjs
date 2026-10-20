import { createHmac } from 'node:crypto';
import { getVercelOidcToken } from '@vercel/oidc';
import { ExternalAccountClient,GoogleAuth,OAuth2Client } from 'google-auth-library';
import { RevisionApiError } from './revisionAiQuota.mjs';

export const PLAY_PRODUCTS = { elima_revision_standard: 'standard', elima_revision_premium: 'premium' };
export const GOOGLE_PLAY_WIF = {
  projectId:'elima-production',
  projectNumber:'370984443240',
  poolId:'elima-vercel',
  providerId:'elima-vercel-prod',
  serviceAccountEmail:'elima-play-billing@elima-production.iam.gserviceaccount.com',
  issuer:'https://oidc.vercel.com/elima1',
};
const ANDROID_PUBLISHER_SCOPE='https://www.googleapis.com/auth/androidpublisher';
export const billingError = (code='billing_unavailable', status=503) => new RevisionApiError('Le service d’abonnement est momentanément indisponible. Réessaie ou restaure tes achats.',status,code);

function staticServiceAccountConfigured(env) {
  let credentials;
  try { credentials=JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON??''); } catch { return false; }
  return Boolean(credentials?.client_email && credentials?.private_key);
}
export function isGooglePlayWifConfigured(env=process.env) {
  return env.GCP_PROJECT_ID===GOOGLE_PLAY_WIF.projectId
    && env.GCP_PROJECT_NUMBER===GOOGLE_PLAY_WIF.projectNumber
    && env.GCP_WORKLOAD_IDENTITY_POOL_ID===GOOGLE_PLAY_WIF.poolId
    && env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID===GOOGLE_PLAY_WIF.providerId
    && env.GCP_SERVICE_ACCOUNT_EMAIL===GOOGLE_PLAY_WIF.serviceAccountEmail;
}
export function resolveGooglePlayAuthMode(env=process.env) {
  if(isGooglePlayWifConfigured(env) && !(env.VERCEL_ENV==='production' && env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)) return 'vercel_oidc';
  if(env.VERCEL_ENV!=='production' && staticServiceAccountConfigured(env)) return 'service_account_json';
  return null;
}
export function isGooglePlayPurchaseConfigured(env=process.env) {
  return env.GOOGLE_PLAY_PACKAGE_NAME==='ci.elima.revision'
    && typeof env.GOOGLE_PLAY_ACCOUNT_HASH_SECRET==='string' && env.GOOGLE_PLAY_ACCOUNT_HASH_SECRET.length>=32
    && resolveGooglePlayAuthMode(env)!==null;
}
export function isGooglePlayRtdnConfigured(env=process.env) {
  return typeof env.GOOGLE_PLAY_RTDN_AUDIENCE==='string' && env.GOOGLE_PLAY_RTDN_AUDIENCE.startsWith('https://')
    && typeof env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL==='string' && env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL.includes('@');
}
export function isGooglePlayServerConfigured(env=process.env) {
  return isGooglePlayPurchaseConfigured(env) && isGooglePlayRtdnConfigured(env);
}
export function isGooglePlayBillingEnabled(env=process.env) {
  return env.GOOGLE_PLAY_BILLING_ENABLED==='true' && isGooglePlayServerConfigured(env);
}
export function classifyGooglePlayReadError(error) {
  const url=String(error?.config?.url??error?.response?.config?.url??'');
  const status=Number(error?.response?.status??0);
  if(url.includes('sts.googleapis.com')) return 'oidc_sts_exchange_failed';
  if(url.includes('iamcredentials.googleapis.com')) return 'service_account_impersonation_failed';
  if(status===401) return 'google_auth_rejected';
  if(status===403) return 'google_play_permission_denied';
  if(status===404) return 'google_play_app_not_found';
  return 'google_play_read_check_failed';
}
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
export async function createGooglePlayAuthClient(env=process.env,{getOidcToken=getVercelOidcToken}={}) {
  const mode=resolveGooglePlayAuthMode(env);
  if(mode==='vercel_oidc') {
    const audience=`//iam.googleapis.com/projects/${env.GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${env.GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`;
    const client=ExternalAccountClient.fromJSON({
      type:'external_account',
      audience,
      subject_token_type:'urn:ietf:params:oauth:token-type:jwt',
      token_url:'https://sts.googleapis.com/v1/token',
      service_account_impersonation_url:`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(env.GCP_SERVICE_ACCOUNT_EMAIL)}:generateAccessToken`,
      service_account_impersonation:{token_lifetime_seconds:900},
      subject_token_supplier:{getSubjectToken:()=>getOidcToken({expirationBufferMs:5*60*1000})},
      scopes:[ANDROID_PUBLISHER_SCOPE],
    });
    if(!client) throw billingError('billing_configuration_missing');
    return client;
  }
  if(mode==='service_account_json') {
    let credentials;
    try { credentials=JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON); } catch { throw billingError('billing_configuration_missing'); }
    return new GoogleAuth({credentials,scopes:[ANDROID_PUBLISHER_SCOPE]}).getClient();
  }
  throw billingError('billing_configuration_missing');
}
export function createGooglePlayClient(env=process.env,dependencies={}) {
  if(!isGooglePlayPurchaseConfigured(env)) throw billingError('billing_configuration_missing');
  const getAuthClient=async()=>dependencies.authClient??createGooglePlayAuthClient(env,dependencies);
  const base=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${env.GOOGLE_PLAY_PACKAGE_NAME}/purchases`;
  const monetizationBase=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${env.GOOGLE_PLAY_PACKAGE_NAME}/subscriptions`;
  return {
    async get(token) {
      try { const client=await getAuthClient();return (await client.request({url:`${base}/subscriptionsv2/tokens/${encodeURIComponent(token)}`,timeout:15000})).data; }
      catch(error) { throw billingError([400,404,410].includes(error?.response?.status)?'invalid_purchase':'billing_unavailable',[400,404,410].includes(error?.response?.status)?400:503); }
    },
    async acknowledge(token,productId) {
      try { const client=await getAuthClient();await client.request({url:`${base}/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`,method:'POST',data:{},timeout:15000}); }
      catch {
        // A concurrent verifier may already have acknowledged the same purchase.
        if((await this.get(token)).acknowledgementState!=='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') throw billingError();
      }
    },
    async listSubscriptions() {
      try { const client=await getAuthClient();return (await client.request({url:monetizationBase,params:{pageSize:100},timeout:15000})).data; }
      catch(error) { throw billingError(classifyGooglePlayReadError(error),503); }
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
