import { timingSafeEqual } from 'node:crypto';
import { createGooglePlayClient,isGooglePlayBillingEnabled,isGooglePlayPurchaseConfigured,isGooglePlayRtdnConfigured,resolveGooglePlayAuthMode } from '../googlePlayBilling.mjs';

function constantTimeEqual(left,right) {
  const a=Buffer.from(String(left??''));
  const b=Buffer.from(String(right??''));
  return a.length===b.length && a.length>0 && timingSafeEqual(a,b);
}

export function isGooglePlayDiagnosticAuthorized(request,env=process.env) {
  const secret=env.GOOGLE_PLAY_DIAGNOSTIC_SECRET;
  const authorization=String(request.headers?.authorization??'');
  const token=authorization.startsWith('Bearer ')?authorization.slice(7).trim():'';
  return env.VERCEL==='1'
    && env.VERCEL_ENV==='production'
    && env.GOOGLE_PLAY_DIAGNOSTIC_ENABLED==='true'
    && typeof secret==='string'
    && secret.length>=32
    && constantTimeEqual(token,secret);
}

export function createGooglePlayBillingDiagnosticHandler(dependencies={}) {
  return async function handler(request,response) {
    const env=dependencies.env??process.env;
    response.setHeader('Cache-Control','no-store');
    if(request.method!=='POST') return response.status(405).json({ok:false,code:'method_not_allowed'});
    if(!isGooglePlayDiagnosticAuthorized(request,env)) return response.status(404).json({ok:false,code:'not_found'});
    if(!isGooglePlayPurchaseConfigured(env) || resolveGooglePlayAuthMode(env)!=='vercel_oidc') return response.status(503).json({ok:false,code:'billing_configuration_incomplete'});
    if(isGooglePlayBillingEnabled(env)) return response.status(409).json({ok:false,code:'billing_already_enabled'});
    try {
      const catalog=await (dependencies.createGooglePlayClient??createGooglePlayClient)(env).listSubscriptions();
      const subscriptions=Array.isArray(catalog?.subscriptions)?catalog.subscriptions:[];
      const expected=['elima_revision_standard','elima_revision_premium'];
      const expectedCatalogReady=expected.every((productId)=>{
        const product=subscriptions.find((item)=>item.productId===productId);
        return product?.basePlans?.some((plan)=>plan.basePlanId==='monthly');
      });
      return response.status(expectedCatalogReady?200:503).json({
        ok:expectedCatalogReady,
        target:'revision',
        oidcProductionAccess:true,
        expectedCatalogReady,
        rtdnConfigured:isGooglePlayRtdnConfigured(env),
        billingActivationEnabled:false,
      });
    } catch(error) {
      const allowedCodes=new Set([
        'oidc_sts_exchange_failed',
        'service_account_impersonation_failed',
        'google_auth_rejected',
        'google_play_permission_denied',
        'google_play_app_not_found',
        'google_play_read_check_failed',
      ]);
      const code=allowedCodes.has(error?.code)?error.code:'google_play_read_check_failed';
      return response.status(503).json({ok:false,code});
    }
  };
}

export default createGooglePlayBillingDiagnosticHandler();
