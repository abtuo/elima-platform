import {useEffect,useState,type ReactNode} from 'react';
import type {Session} from '@supabase/supabase-js';
import {AuthContext,useAuth} from '@/features/auth/AuthProvider';
import {ensureRevisionSession} from '@/services/elimaIdentityService';
import {revisionDbClient} from '@/services/revisionDbClient';
import type {UserProfile} from '@/types/roles';
export function RevisionBoundary({children}:{children:ReactNode}){
 const auth=useAuth();const [local,setLocal]=useState<{session:Session;profile:UserProfile}|null>(null);const [error,setError]=useState('');const [retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setLocal(null);setError('');
  if(auth.isDemo)return;
  ensureRevisionSession().then(async session=>{
   const {data,error}=await revisionDbClient!.from('student_profiles').select('school_level_id,declared_school_name,declared_school_city').eq('id',session.user.id).maybeSingle();
   if(error)throw new Error('Profil Révision indisponible.');
   if(active)setLocal({session,profile:{...auth.profile,id:session.user.id,schoolLevelId:data?.school_level_id??auth.profile.schoolLevelId,className:data?.school_level_id??auth.profile.className,declaredSchoolName:data?.declared_school_name??null,declaredSchoolCity:data?.declared_school_city??null}});
  }).catch(()=>{if(active)setError('Révision est momentanément indisponible. Réessaie.');});return()=>{active=false;};
 },[auth.profile.id,retry,auth.isDemo]);
 if(auth.isDemo)return <>{children}</>;
 if(error)return <div role="alert" className="p-5">{error}<button className="ml-3 text-primary" onClick={()=>setRetry(v=>v+1)}>Réessayer</button></div>;
 if(!local)return <p role="status" className="p-5">Connexion à Révision…</p>;
 return <AuthContext.Provider value={{...auth,...local}}>{children}</AuthContext.Provider>;
}
