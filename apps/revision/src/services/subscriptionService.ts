import { registerPlugin, Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { mainDbClient } from './mainDbClient';
import { apiFetch } from './api/apiClient';
import type { PlayProduct } from './playOffers';
export { choosePlayOffer, type PlayProduct, type PlayOffer } from './playOffers';
export type Plan = 'free' | 'standard' | 'premium';
export type Feature = 'ai_quiz' | 'ai_flashcard' | 'document_scan' | 'ai_hint';
export type Usage = {used:number;limit:number|null;remaining:number;unlimited:boolean;resetAt:string;period:'day'|'week'};
export type Entitlement = {plan:Plan;status:string;trialUsed:boolean;currentPeriodEnd:string|null;autoRenewing:boolean;accountId:string;usage:Record<Feature,Usage>};
type Purchases = {purchases:{purchaseToken:string;products:string[]}[]};
export const PlayBilling = registerPlugin<{
  addListener(event:'purchasesUpdated',listener:()=>void):Promise<PluginListenerHandle>;
  catalog():Promise<{products:PlayProduct[]}>;
  restore():Promise<Purchases>;
  purchase(options:{productId:string;offerToken:string;accountId:string}):Promise<Purchases>;
}>('RevisionBilling');
export const isPlayBillingAvailable = () => Capacitor.isNativePlatform() && Capacitor.getPlatform()==='android';
export async function subscriptionRequest(body?: Record<string,unknown>):Promise<Entitlement> {
  const token=(await mainDbClient?.auth.getSession())?.data.session?.access_token;
  if(!token) throw new Error('Reconnecte-toi pour consulter ton abonnement.');
  const response=await apiFetch('/api/revision-subscription',{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  if(!response.ok) throw new Error(data.message || 'Abonnement momentanément indisponible.');
  return data;
}
export async function restorePlayPurchases() {
  const owned=await PlayBilling.restore();
  for(const purchase of owned.purchases) await subscriptionRequest({action:'restore',purchaseToken:purchase.purchaseToken});
  return subscriptionRequest();
}
