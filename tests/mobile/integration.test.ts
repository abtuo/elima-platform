/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createRevisionDataService,createRevisionDocumentService,createSubjectPreferencesService,createSubscriptionApi} from '../../packages/revision-core/src/index.ts';
import {createWhatsAppAuthApi} from '../../packages/auth/src/whatsapp.ts';
import type {SupabaseClient} from '@supabase/supabase-js';
const read=(file:string)=>readFile(new URL('../../'+file,import.meta.url),'utf8');

test('Mobile authenticates centrally without OAuth/direct password login; Revision scope uses bridge UUID',async()=>{
 const login=await read('apps/mobile/src/features/auth/LoginPage.tsx');
 assert.match(login,/await signIn\(identifier, password\)/);assert.doesNotMatch(login,/const profile = !isElimaIdentityConfigured/);
 const service=await read('apps/mobile/src/services/elimaIdentityService.ts');
 assert.match(service,/\/api\/elima-password-login/);assert.match(service,/password\}\)/);assert.doesNotMatch(service,/signInWithPassword|oauth\/token/);
 assert.match(service,/data\?\.external_subject===identity\.user\.id/);assert.match(service,/\/api\/identity-bridge/);assert.match(service,/revisionDbClient.auth.verifyOtp/);
 const boundary=await read('apps/mobile/src/features/revision/RevisionBoundary.tsx');assert.match(boundary,/id:session.user.id/);
 const env=await read('apps/mobile/src/services/env.ts');assert.match(env,/nnsgvnjzfrcmbxfwlyow/);assert.match(env,/rydnrvvmwixrkmnvpajf/);assert.match(env,/import.meta.env.DEV &&/);
});

test('Mobile and standalone facades share all engines, Scanner and subject storage',async()=>{
 for(const file of ['revisionDataService','revisionDocumentService','learningService','subjectPreferencesService','subscriptionService']){
  for(const app of ['mobile','revision']){const text=await read(`apps/${app}/src/services/${file}.ts`);assert.match(text,/@elima\/revision-core/);assert.doesNotMatch(text,/record_quiz_attempt|from\("quiz_attempts"\)/);}
 }
 const scanner=await read('apps/mobile/src/features/revision/DocumentScannerPanel.tsx');assert.match(scanner,/@elima\/revision-ui/);assert.doesNotMatch(scanner,/apps\/revision|takeNativePhoto/);
 const config=JSON.parse(await read('apps/mobile/vercel.json'));assert.equal(config.framework,'vite');assert.equal(config.outputDirectory,'dist');assert.equal(config.ignoreCommand,undefined);assert.deepEqual(config.rewrites,[{source:'/(.*)',destination:'/index.html'}]);
});

test('WhatsApp signup/reset use request -> check -> authorization; existing phone cannot become a new signup',async()=>{
 const calls:Array<{path:string;body:any}>=[];
 const api=createWhatsAppAuthApi(async(path,init)=>{calls.push({path,body:JSON.parse(String(init?.body))});return Response.json(path.endsWith('request')?{requestToken:'otp-request'}:path.endsWith('check')?{purpose:'phone_control',accountExists:true,phone:'+2250500000000',authorization:'proof'}:{ok:true});});
 const requested=await api.requestRegistrationCode('+2250500000000');const checked=await api.checkVerificationCode({phone:'+2250500000000',code:'123456',requestToken:requested.requestToken});
 assert.equal(checked.accountExists,true);assert.equal(checked.purpose,'phone_control');
 await api.confirmPasswordReset({phone:'+2250500000000',authorization:'reset-proof',password:' intact password '});
 assert.equal(calls[2].path,'/api/auth-password-reset');assert.equal(calls[2].body.password,' intact password ');
 assert.match(await read('apps/mobile/src/services/registrationService.ts'),/proof.accountExists\|\|proof.purpose!=='signup'/);
});

test('two app instances see the same Revision quiz/progression, sheets, documents, subjects and subscription',async()=>{
 const localId='revision-local-uuid';const rows:Record<string,any[]>={quiz_attempts:[],user_progress:[{user_id:localId,xp:0,streak_days:0,completed_quiz_count:0,average_score:0}],quiz_sets:[],user_course_summaries:[{id:'sheet',user_id:localId,subject_label:'Maths',topic:'Fractions',content:'Cours'}],revision_documents:[{id:'doc',user_id:localId,file_name:'cours.pdf',status:'ready',title:'Cours',analysis:{}}],student_revision_subject_preferences:[{user_id:localId,subject_id:'maths'}]};
 const client={auth:{async getSession(){return {data:{session:{access_token:'revision-token',user:{id:localId}}}};},async getUser(){return {data:{user:{id:localId}}};}},
  async rpc(name:string,args:any){assert.equal(name,'record_quiz_attempt');rows.quiz_attempts.push({id:String(rows.quiz_attempts.length+1),user_id:localId,quiz_ref:args.p_quiz_ref,subject_label:args.p_subject_label,score:args.p_score,correct_answers:args.p_correct_answers,completed_at:args.p_completed_at});rows.user_progress[0].completed_quiz_count++;return {data:{id:String(rows.quiz_attempts.length)},error:null};},
  from(table:string){const filters:Array<[string,unknown]>=[];let single=false;const query={select(){return query;},eq(k:string,v:unknown){filters.push([k,v]);return query;},order(){return query;},limit(){return query;},maybeSingle(){single=true;return query;},then(resolve:(value:any)=>unknown){const selected=rows[table].filter(r=>filters.every(([k,v])=>r[k]===v));return Promise.resolve({data:single?selected[0]:selected,error:null}).then(resolve);}};return query;}
 } as unknown as SupabaseClient;
 const apiFetch=async(_path:string,init?:RequestInit)=>{assert.equal((init?.headers as any).Authorization,'Bearer revision-token');return Response.json({plan:'standard',usage:{}});};
 const subscription=createSubscriptionApi(apiFetch,async()=> 'revision-token');
 const make=()=>createRevisionDataService({revisionDbClient:client,apiFetch,isDemoModeActive:()=>false,subscriptionRequest:subscription});
 const mobile=make(),standalone=make();
 const attempt={userId:localId,quizRef:'quiz-1',subject:'Maths',score:80,totalQuestions:10,correctAnswers:8};
 await mobile.recordQuizCompletion(attempt);assert.equal((await standalone.getQuizAttempts(localId)).length,1);
 await standalone.recordQuizCompletion(attempt);assert.equal((await mobile.getQuizAttempts(localId)).length,2);assert.equal((await mobile.getRevisionProgress(localId)).completedQuizCount,2);
 assert.deepEqual(await mobile.getCourseSheets(localId),await standalone.getCourseSheets(localId));
 const documents=()=>createRevisionDocumentService({mainDbClient:client,apiFetch});assert.deepEqual(await documents().getRevisionDocuments(localId),await documents().getRevisionDocuments(localId));
 assert.deepEqual(await createSubjectPreferencesService({mainDbClient:client}).getSubjectPreferences(localId),['maths']);
 assert.equal((await subscription()).plan,'standard');
});
 
