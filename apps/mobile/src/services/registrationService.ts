import {createWhatsAppAuthApi} from '@elima/auth';
import {apiFetch} from './api/apiClient';
const shared=createWhatsAppAuthApi(apiFetch);
export type RegistrationRole='school_head'|'school_staff'|'teacher'|'parent'|'student';
type AccountRegistrationInput={role:Exclude<RegistrationRole,'school_head'>;firstName:string;lastName:string;identifier:string;password:string;schoolCode?:string;schoolLevel?:string;declaredSchoolName?:string;declaredSchoolCity?:string;verificationPhone:string;verificationId:string;verificationCode:string};
const proofs=new Map<string,Awaited<ReturnType<typeof shared.checkVerificationCode>>>();
async function verify(phone:string,requestToken:string,code:string){
 let proof=proofs.get(requestToken);
 if(!proof){proof=await shared.checkVerificationCode({phone,requestToken,code});proofs.set(requestToken,proof);}
 return proof;
}
export async function requestRegistrationCode(input:{identifier:string;phone:string}){
 const result=await shared.requestRegistrationCode(input.phone);return {challengeId:result.requestToken,expiresIn:result.expiresIn};
}
export async function requestPasswordResetCode(input:{identifier:string;phone:string}){
 const result=await shared.requestPasswordResetCode(input.phone);return {challengeId:result.requestToken,expiresIn:result.expiresIn};
}
export async function confirmPasswordReset(input:{identifier:string;phone:string;challengeId:string;code:string;password:string}){
 const proof=await verify(input.phone,input.challengeId,input.code);
 if(proof.purpose!=='password_reset')throw new Error('Autorisation de réinitialisation invalide.');
 const result=await shared.confirmPasswordReset({phone:proof.phone,authorization:proof.authorization,password:input.password});proofs.delete(input.challengeId);return result;
}
export async function registerElimaAccount(input:AccountRegistrationInput){
 if(input.role!=='student')throw new Error('La création de ce compte nécessite votre établissement. Contactez son administration.');
 const proof=await verify(input.verificationPhone,input.verificationId,input.verificationCode);
 if(proof.accountExists||proof.purpose!=='signup')throw new Error('Ce numéro possède déjà un compte. Connecte-toi ou réinitialise ton mot de passe.');
 const result=await shared.registerElimaAccount({role:'student',phone:proof.phone,authorization:proof.authorization,firstName:input.firstName,lastName:input.lastName,password:input.password,schoolLevel:input.schoolLevel??'',declaredSchoolName:input.declaredSchoolName,declaredSchoolCity:input.declaredSchoolCity});
 proofs.delete(input.verificationId);return {...result,loginIdentifier:proof.phone};
}
export type SchoolRegistrationRequest = {
  firstName: string;
  lastName: string;
  identifier: string;
  schoolName: string;
  schoolCity: string;
  jobTitle?: string;
  studentCount?: string;
};

export async function submitSchoolRegistrationRequest(input: SchoolRegistrationRequest) {
  const response = await apiFetch("/api/registration-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message ?? "Envoi impossible.");
  return body;
}
