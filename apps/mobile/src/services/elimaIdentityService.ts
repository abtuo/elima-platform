import {normalizePhone} from '@elima/auth';
import {mainDbClient} from './mainDbClient';
import {revisionDbClient} from './revisionDbClient';
import {apiFetch} from './api/apiClient';
export type ElimaCentralProfile={id?:string;fullName?:string;role?:string;schoolId?:string|null;schoolName?:string|null;schoolLogoUrl?:string|null;avatarUrl?:string|null;studentId?:string|null;schoolLevel?:string|null;schoolClassName?:string|null};
let cached:ElimaCentralProfile|null=null;
export const getCachedElimaIdentityProfile=()=>cached;
export const isElimaIdentityConfigured=()=>Boolean(mainDbClient);
export async function completeElimaIdentitySession(tokens:{access_token:string;refresh_token?:string}) {
 if(!mainDbClient || !tokens.refresh_token)throw new Error('Configuration Identity ou session incomplète.');
 await bridgePending?.catch(()=>undefined);
 cached=null;
 await revisionDbClient?.auth.signOut({scope:'local'});
 const {data,error}=await mainDbClient.auth.setSession({access_token:tokens.access_token,refresh_token:tokens.refresh_token});
 if(error || !data.session)throw new Error('Connexion Elima impossible.');
 await refreshElimaIdentityProfile().catch(()=>null);
 return {localUserId:data.user?.id??null,centralProfile:cached};
}
export async function signInWithElimaPassword(identifier:string,password:string,_options?:{recentSignup?:boolean}) {
 const phone=normalizePhone(identifier);
 if(!phone || identifier.includes('@'))throw new Error('Saisis ton numéro WhatsApp au format international.');
 const response=await apiFetch('/api/elima-password-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:phone,password})});
 const tokens=await response.json();
 if(!response.ok||!tokens.access_token)throw new Error(tokens.message||'Numéro ou mot de passe incorrect.');
 return completeElimaIdentitySession(tokens);
}
export async function getValidElimaIdentityAccessToken(){return (await mainDbClient?.auth.getSession())?.data.session?.access_token??null;}
export const getElimaIdentityAccessToken=getValidElimaIdentityAccessToken;
export async function refreshElimaIdentityProfile(){
 const token=await getValidElimaIdentityAccessToken();if(!token){cached=null;return null;}
 const response=await apiFetch('/api/elima-profile',{headers:{Authorization:`Bearer ${token}`}});
 if(response.ok){const p=await response.json();cached={id:p.id,fullName:p.fullName,role:p.role,schoolId:p.schoolId,schoolName:p.school?.name,schoolLogoUrl:p.school?.logo_url,schoolClassName:p.student?.class?.name,schoolLevel:p.student?.class?.level};}
 return cached;
}
let bridgePending:Promise<NonNullable<Awaited<ReturnType<typeof localRevisionSession>>>>|null=null;
async function localRevisionSession(){return (await revisionDbClient?.auth.getSession())?.data.session??null;}
export async function ensureRevisionSession(){
 if(bridgePending)return bridgePending;
 bridgePending=(async()=>{
  const identity=(await mainDbClient?.auth.getSession())?.data.session;
  if(!identity || !revisionDbClient)throw new Error('Connexion Identity et configuration Révision requises.');
  const local=await localRevisionSession();
  // Verify the UUID link even when a technical session is already present.
  if(local){const {data,error}=await revisionDbClient.from('identity_links').select('external_subject').eq('local_user_id',local.user.id).eq('issuer','https://nnsgvnjzfrcmbxfwlyow.supabase.co/auth/v1').maybeSingle();if(!error&&data?.external_subject===identity.user.id)return local;}
  const response=await apiFetch('/api/identity-bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:identity.access_token})});
  const bridge=await response.json();
  if(!response.ok||!bridge.tokenHash)throw new Error('Révision momentanément indisponible.');
  const {data,error}=await revisionDbClient.auth.verifyOtp({token_hash:bridge.tokenHash,type:'magiclink'});
  if(error||!data.session)throw new Error('Impossible de restaurer la session Révision.');
  return data.session;
 })();
 try{return await bridgePending;}finally{bridgePending=null;}
}
export async function clearElimaIdentitySession(){
 const token=await getValidElimaIdentityAccessToken();
 try{if(token)await apiFetch('/api/elima-session',{method:'DELETE',headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(5000)});}
 finally{await bridgePending?.catch(()=>undefined);await Promise.all([mainDbClient?.auth.signOut({scope:'local'}),revisionDbClient?.auth.signOut({scope:'local'})]);cached=null;}
}
export async function beginElimaSignIn(_returnTo?:string){throw new Error('Utilise la connexion WhatsApp et mot de passe.');}
export async function completeElimaSignIn(_code:string,_state:string):Promise<string>{throw new Error('Utilise la connexion WhatsApp et mot de passe.');}
export function openElimaStudentSignup(){window.location.assign('/auth/inscription');}
