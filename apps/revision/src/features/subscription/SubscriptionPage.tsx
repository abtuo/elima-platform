import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { AppHeader } from '@/components/common/AppHeader';
import { subscriptionRequest,isPlayBillingAvailable,PlayBilling,choosePlayOffer,restorePlayPurchases,type Entitlement,type PlayProduct,type Feature } from '@/services/subscriptionService';
const labels:Record<Feature,string>={ai_quiz:'Quiz IA',ai_flashcard:'Fiches générées',document_scan:'Scanner',ai_hint:'Indices IA'};
export function SubscriptionSummary() {
  const [data,setData]=useState<Entitlement|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{let active=true;subscriptionRequest().then(value=>{if(active)setData(value);}).catch(()=>{if(active)setError('Abonnement indisponible pour le moment.');});return()=>{active=false;};},[]);
  return <section className="card mt-5 min-w-0 p-5"><h2 className="font-title text-lg font-semibold">Mon abonnement</h2>{data?<><p className="mt-2 capitalize text-revision">{data.plan}</p><UsageList data={data}/></>:<p className="mt-2 text-sm text-gray-500">{error||'Chargement…'}</p>}<Link to="/student/abonnement" className="mt-3 inline-block text-sm font-semibold text-revision">Voir les offres et gérer mes achats →</Link></section>;
}
function UsageList({data}:{data:Entitlement}) {
  return <ul className="mt-3 space-y-2 text-sm">{Object.entries(data.usage).map(([feature,item])=><li key={feature} className="flex flex-wrap justify-between gap-2"><span>{labels[feature as Feature]}</span><span>{item.used} utilisé{item.used>1?'s':''} · {item.unlimited?'Illimité*':`${item.limit} / ${item.period==='week'?'semaine':'jour'}`}</span></li>)}</ul>;
}
export function SubscriptionPage() {
  const [data,setData]=useState<Entitlement|null>(null);
  const [products,setProducts]=useState<PlayProduct[]>([]);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const native=isPlayBillingAvailable();
  useEffect(()=>{let active=true;subscriptionRequest().then(value=>{if(active)setData(value);}).catch(e=>{if(active)setError(e.message);});if(native)PlayBilling.catalog().then(value=>{if(active)setProducts(value.products);}).catch(()=>{if(active)setError('Offres Google Play indisponibles. Vérifie ton compte Play et ta connexion.');});return()=>{active=false;};},[native]);
  async function purchase(productId:string,offerToken:string) {
    if(!data || busy)return;setBusy(true);setError('');setMessage('');
    try {
      const current=await subscriptionRequest();setData(current);
      const offer=choosePlayOffer(products.find(p=>p.productId===productId),current.trialUsed,current.plan);
      if(!offer || offer.token!==offerToken) throw new Error('Les offres ont changé. Vérifie le tarif et réessaie.');
      const result=await PlayBilling.purchase({productId,offerToken,accountId:current.accountId});
      if(!result.purchases.length){setMessage('Achat en attente de validation par Google Play. Restaure tes achats après confirmation.');return;}
      for(const item of result.purchases) await subscriptionRequest({action:'verify',purchaseToken:item.purchaseToken});
      setData(await subscriptionRequest());setMessage('Abonnement vérifié. Tes droits sont à jour.');
    } catch(e){setError(e instanceof Error?e.message:'Achat indisponible.');}finally{setBusy(false);}
  }
  async function restore(){setBusy(true);setError('');try{setData(await restorePlayPurchases());setMessage('Achats restaurés et vérifiés.');}catch(e){setError(e instanceof Error?e.message:'Restauration indisponible.');}finally{setBusy(false);}}
  return <PageContainer><AppHeader title="Mon abonnement" subtitle="Révise à ton rythme" accent="#7C3AED"/>
    {error&&<p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{message&&<p role="status" className="mb-4 rounded-2xl bg-green-50 p-4 text-sm text-primary">{message}</p>}
    {data?<section className="card mb-5 p-5"><p className="font-semibold capitalize">Offre actuelle : {data.plan}</p><UsageList data={data}/>{data.currentPeriodEnd&&<p className="mt-3 text-xs text-gray-500">Fin de période : {new Date(data.currentPeriodEnd).toLocaleDateString('fr-FR')}{!data.autoRenewing?' · renouvellement désactivé':''}</p>}</section>:<p className="mb-5 text-sm">Chargement de tes droits…</p>}
    <div className="grid min-w-0 gap-4 lg:grid-cols-3">{(['free','standard','premium'] as const).map(plan=>{
      const productId=`elima_revision_${plan}`;const product=products.find(p=>p.productId===productId);
      const offer=data?choosePlayOffer(product,data.trialUsed,data.plan):undefined;const trial=offer?.phases[0]?.micros===0;
      return <section key={plan} className="card min-w-0 p-5"><h2 className="font-title text-xl font-bold capitalize">{plan}</h2><p className="mt-3 font-semibold text-revision">{plan==='free'?'0 FCFA':offer?`${trial?'1 mois gratuit, puis ':''}${offer.phases.at(-1)?.price} / mois`:'Tarif disponible dans Google Play'}</p>
        <ul className="my-4 space-y-2 text-sm"><li>Quiz existants illimités</li><li>Quiz IA : {plan==='free'?'2/jour':plan==='standard'?'10/jour':'illimités*'}</li><li>Fiches et Scanner : {plan==='free'?'2/semaine chacun':plan==='standard'?'3/jour chacun':'illimités*'}</li><li>Indices IA : {plan==='free'?'5/jour':plan==='standard'?'25/jour':'illimités*'}</li><li>Progression et historique inclus</li></ul>
        {plan!=='free'&&<button type="button" disabled={!native||!offer||busy||data?.plan===plan} onClick={()=>offer&&void purchase(productId,offer.token)} className="w-full rounded-2xl bg-revision px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{data?.plan===plan?'Offre actuelle':`Passer à ${plan==='standard'?'Standard':'Premium'}`}</button>}</section>;
    })}</div>
    <p className="mt-4 text-xs text-gray-500">* Plafonds techniques anti-abus. Quotas journaliers à minuit UTC et hebdomadaires le lundi à minuit UTC. Les abonnements se renouvellent automatiquement ; Google Play confirme le tarif et l’éligibilité à l’essai avant paiement. Un seul essai par compte Elima.</p>
    {!native?<p className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm">Consulte tes droits ici. Pour acheter ou restaurer un abonnement Google Play, ouvre Elima Révision installé depuis Google Play sur Android.</p>:<><button type="button" disabled={busy} onClick={()=>void restore()} className="mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold">Restaurer mes achats</button><a className="ml-3 text-sm text-revision" href="https://play.google.com/store/account/subscriptions?package=ci.elima.revision" target="_blank" rel="noreferrer">Gérer ou annuler dans Google Play</a><p className="mt-3 text-xs text-gray-500">Passage à Premium immédiat avec ajustement Google Play ; passage à Standard à la prochaine échéance.</p></>}
  </PageContainer>;
}
