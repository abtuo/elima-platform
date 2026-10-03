import { createClient } from '@supabase/supabase-js';
import { resolveRevisionServerConfig,applyRevisionApiError } from '../revisionAiQuota.mjs';
import { verifyRtdnAuthorization } from '../googlePlayBilling.mjs';
import { verifyRevisionPurchase } from '../revisionEntitlement.mjs';
export default async function handler(request,response) {
  if(request.method!=='POST') return response.status(405).end();
  try {
    await verifyRtdnAuthorization(request.headers?.authorization);
    let notification;
    try { notification=JSON.parse(Buffer.from(request.body?.message?.data??'','base64').toString()); } catch { return response.status(400).end(); }
    if(notification.packageName!==process.env.GOOGLE_PLAY_PACKAGE_NAME) return response.status(400).end();
    if(notification.testNotification) return response.status(204).end();
    const token=notification.subscriptionNotification?.purchaseToken;
    if(typeof token!=='string') return response.status(204).end();
    const config=resolveRevisionServerConfig();
    const admin=createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await admin.from('revision_play_purchases').select('identity_user_id,superseded_by').eq('purchase_token',token).maybeSingle();
    if(error) throw error;
    // Unknown purchase will be verified by the authenticated purchase/restore flow.
    if(data && !data.superseded_by) await verifyRevisionPurchase(admin,data.identity_user_id,token,{revocationNotice:notification.subscriptionNotification.notificationType===12});
    return response.status(204).end();
  } catch(error) { return applyRevisionApiError(response,error,'Notification momentanément indisponible.'); }
}
