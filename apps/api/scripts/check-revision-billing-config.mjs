import { resolveRevisionServerConfig } from '../server/revisionAiQuota.mjs';
import { GOOGLE_PLAY_WIF,createGooglePlayClient,isGooglePlayBillingEnabled,isGooglePlayPurchaseConfigured,isGooglePlayRtdnConfigured,isGooglePlayWifConfigured,resolveGooglePlayAuthMode } from '../server/googlePlayBilling.mjs';

const expectedProjectRef='rydnrvvmwixrkmnvpajf';
let revisionDatabase=false;
try {
  const config=resolveRevisionServerConfig();
  revisionDatabase=new URL(config.url).hostname===`${expectedProjectRef}.supabase.co`;
} catch {
  revisionDatabase=false;
}

const result={
  target:'revision',
  expectedProjectRef,
  revisionDatabase,
  googlePlayPackage:process.env.GOOGLE_PLAY_PACKAGE_NAME==='ci.elima.revision',
  googlePlayAuthMode:resolveGooglePlayAuthMode(),
  vercelOidcWif:isGooglePlayWifConfigured(),
  staticJsonAbsentFromVercelProduction:!(process.env.VERCEL_ENV==='production' && process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON),
  initialGooglePlayCheckReady:isGooglePlayPurchaseConfigured(),
  googlePlayRtdnLifecycle:isGooglePlayRtdnConfigured(),
  billingActivationEnabled:isGooglePlayBillingEnabled(),
  expectedIssuer:GOOGLE_PLAY_WIF.issuer,
};

console.log(JSON.stringify(result,null,2));
const requiredInitialChecks=['revisionDatabase','googlePlayPackage','vercelOidcWif','staticJsonAbsentFromVercelProduction','initialGooglePlayCheckReady'];
if(requiredInitialChecks.some((name)=>result[name]!==true) || !result.googlePlayAuthMode) {
  console.error('Configuration Billing Révision incomplète. Aucun secret n’a été affiché.');
  process.exitCode=1;
}

if(process.argv.includes('--live')) {
  if(process.env.VERCEL!=='1' || process.env.VERCEL_ENV!=='production' || result.googlePlayAuthMode!=='vercel_oidc') {
    console.error('Le contrôle live est réservé à une exécution Vercel Production OIDC explicitement autorisée.');
    process.exitCode=1;
  } else {
    try {
      const catalog=await createGooglePlayClient().listSubscriptions();
      const subscriptions=Array.isArray(catalog?.subscriptions)?catalog.subscriptions:[];
      const expectedProducts=Object.keys({elima_revision_standard:true,elima_revision_premium:true});
      const summary=Object.fromEntries(expectedProducts.map((productId)=>{
        const product=subscriptions.find((item)=>item.productId===productId);
        const monthly=product?.basePlans?.find((plan)=>plan.basePlanId==='monthly');
        return [productId,{present:Boolean(product),monthlyBasePlanPresent:Boolean(monthly),monthlyBasePlanState:monthly?.state??null}];
      }));
      console.log(JSON.stringify({liveReadOnlyCheck:true,expectedCatalogReady:Object.values(summary).every((product)=>product.present && product.monthlyBasePlanPresent),billingActivationEnabled:isGooglePlayBillingEnabled()},null,2));
      if(Object.values(summary).some((product)=>!product.present || !product.monthlyBasePlanPresent)) process.exitCode=1;
    } catch {
      console.error('Échec du contrôle Google Play en lecture seule. Aucun jeton ni détail fournisseur n’a été affiché.');
      process.exitCode=1;
    }
  }
}
