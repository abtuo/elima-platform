import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAndroidBack} from '@/hooks/useAndroidBack';
export function QuotaNotice(){
  const [notice,setNotice]=useState<{feature?:string;resetAt?:string}|null>(null);
  useAndroidBack(()=>{if(!notice)return false;setNotice(null);return true;},100);
  useEffect(()=>{const show=(event:Event)=>setNotice((event as CustomEvent).detail);window.addEventListener('revision-quota-exceeded',show);return()=>window.removeEventListener('revision-quota-exceeded',show);},[]);
  if(!notice)return null;
  return <aside role="alert" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md rounded-2xl border bg-white p-4 shadow-xl"><button type="button" className="float-right px-2" aria-label="Fermer" onClick={()=>setNotice(null)}>×</button><p className="font-semibold">Limite atteinte pour cette fonctionnalité</p><p className="mt-2 text-sm">Tes quiz existants, ta progression et ton historique restent disponibles.</p>{notice.resetAt&&<p className="mt-1 text-xs">Renouvellement : {new Date(notice.resetAt).toLocaleString('fr-FR')}</p>}<Link to="/student/abonnement" onClick={()=>setNotice(null)} className="mt-3 block text-sm font-semibold text-revision">Passer à Standard ou Premium →</Link></aside>;
}
