import { handleRevisionCors } from '../revisionCors.mjs';
import { authorizeRevisionRequest,applyRevisionApiError } from '../revisionAiQuota.mjs';
import { getRevisionEntitlement,revisionIdentity,verifyRevisionPurchase,consumeRevisionQuota } from '../revisionEntitlement.mjs';
import { billingError,isGooglePlayBillingEnabled,obfuscatedAccountId } from '../googlePlayBilling.mjs';

export default async function handler(request,response) {
  response.setHeader('Cache-Control','no-store');
  if(handleRevisionCors(request,response,['GET','POST'])) return;
  if(!['GET','POST'].includes(request.method)) return response.status(405).json({message:'Méthode non autorisée.'});
  try {
    const {admin,user}=await authorizeRevisionRequest(request);
    if(request.method==='POST') {
      const body=typeof request.body==='string'?JSON.parse(request.body):request.body??{};
      if(body.action==='hint') return response.status(200).json(await consumeRevisionQuota(admin,user.id,'ai_hint'));
      if(!['verify','restore'].includes(body.action)) return response.status(400).json({code:'invalid_action',message:'Action inconnue.'});
      if(!isGooglePlayBillingEnabled()) throw billingError('billing_configuration_missing');
      await verifyRevisionPurchase(admin,await revisionIdentity(admin,user.id),body.purchaseToken);
    }
    const entitlement=await getRevisionEntitlement(admin,user.id);
    const identity=await revisionIdentity(admin,user.id);
    const billingAvailable=isGooglePlayBillingEnabled();
    return response.status(200).json({...entitlement,billingAvailable,accountId:billingAvailable?obfuscatedAccountId(identity):null});
  } catch(error) { return applyRevisionApiError(response,error,'Abonnement momentanément indisponible.'); }
}
