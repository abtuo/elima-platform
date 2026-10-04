export type RevisionPlan='free'|'standard'|'premium';
export type SubscriptionFeature='ai_quiz'|'ai_flashcard'|'document_scan'|'ai_hint';
export type SubscriptionUsage={used:number;limit:number|null;remaining:number;unlimited:boolean;resetAt:string;period:'day'|'week'};
export type RevisionEntitlement={plan:RevisionPlan;status:string;trialUsed:boolean;currentPeriodEnd:string|null;autoRenewing:boolean;accountId:string;usage:Record<SubscriptionFeature,SubscriptionUsage>};
export function createSubscriptionApi(apiFetch:(path:string,init?:RequestInit)=>Promise<Response>,getToken:()=>Promise<string|undefined>){
 return async(body?:Record<string,unknown>):Promise<RevisionEntitlement>=>{
  const token=await getToken();if(!token)throw new Error('Reconnecte-toi pour consulter ton abonnement.');
  const response=await apiFetch('/api/revision-subscription',{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok)throw new Error(data.message||'Abonnement momentanément indisponible.');return data;
 };
}
