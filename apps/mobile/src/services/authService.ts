import {normalizePhone,phoneToEmail} from '@elima/auth';
import {mainDbClient} from './mainDbClient';
import {signInWithElimaPassword,clearElimaIdentitySession} from './elimaIdentityService';
export {normalizePhone,phoneToEmail};
export async function getCurrentSession(){return (await mainDbClient?.auth.getSession())?.data.session??null;}
export async function signInWithIdentifier(identifier:string,password:string){await signInWithElimaPassword(identifier,password);return {data:{session:await getCurrentSession()},error:null};}
export const signOut=clearElimaIdentitySession;
export async function getBearerToken(){const session=await getCurrentSession();return session?`Bearer ${session.access_token}`:null;}
