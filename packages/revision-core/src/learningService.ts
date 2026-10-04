import type {SupabaseClient} from '@supabase/supabase-js';
import type {LearningCatalog,LearningSession} from './types.ts';
import {browserLocalAuthStorage} from '@elima/auth';
import {createLearningApi,createLocalLearningSession,learningSessionKey,learningSessionScore as getStoredLearningSessionScore,readLearningSession as readStoredLearningSession,saveLearningSession as saveStoredLearningSession,submitLocalLearningSession} from './index.ts';

export function createLearningService(dependencies:{mainDbClient:SupabaseClient|null;apiFetch:(path:string,init?:RequestInit)=>Promise<Response>;isDemoModeActive:()=>boolean}) {
const {mainDbClient,apiFetch,isDemoModeActive}=dependencies;

const useDemoLearning = () => isDemoModeActive();
const learningApi = createLearningApi({
  apiFetch,
  async getAccessToken() { return (await mainDbClient?.auth.getSession())?.data.session?.access_token; },
  isDemoMode: useDemoLearning,
});

async function getLearningCatalog(): Promise<LearningCatalog> {
  return learningApi.getCatalog();
}

async function getLearningDiscovery() {
  return learningApi.getDiscovery();
}

async function suggestLearningContent(input: { kind: "guided_exercise" | "exam"; subject: string; chapter: string }) {
  return learningApi.suggest(input);
}

async function getLearningPath(subject: string, chapter: string) {
  return learningApi.getPath(subject, chapter);
}

async function getLearningContent(kind: "guided_exercise" | "exam", id: string) {
  return learningApi.getContent(kind, id);
}

async function validateLearningAnswer(input: { session: LearningSession; questionId: string; answer: string; confidence: string; attemptsCount: number }) {
  return learningApi.validate(input);
}

async function getLearningHint(session: LearningSession, questionId: string, level: number) {
  return learningApi.getHint(session, questionId, level);
}

async function getLearningSolution(session: LearningSession, questionId: string, allowed: boolean) {
  return learningApi.getSolution(session, questionId, allowed);
}

async function getSignedExamPdf(path: string) {
  return learningApi.getSignedExamPdf(path);
}

function sessionKey(contentType: LearningSession["contentType"], contentId: string) {
  return learningSessionKey(contentType, contentId);
}

function readLearningSession(contentType: LearningSession["contentType"], contentId: string) {
  return readStoredLearningSession(browserLocalAuthStorage, contentType, contentId);
}

function learningSessionScore(contentId: string, totalPoints?: number) {
  return getStoredLearningSessionScore(browserLocalAuthStorage, contentId, totalPoints);
}

async function createLearningSession(contentType: LearningSession["contentType"], contentId: string, mode: LearningSession["mode"]): Promise<LearningSession> {
  const existing = readLearningSession(contentType, contentId);
  if (existing?.status === "in_progress") return existing;
  let id = crypto.randomUUID();
  if (mainDbClient && !useDemoLearning()) {
    const userId = (await mainDbClient.auth.getUser()).data.user?.id;
    if (!userId) throw new Error("Session utilisateur introuvable.");
    const row = { user_id: userId, content_type: contentType, exercise_id: contentType === "guided_exercise" ? contentId : null, exam_subject_id: contentType === "exam" ? contentId : null, mode, status: "in_progress" };
    const { data, error } = await mainDbClient.from("learning_attempts").insert(row).select("id").single();
    if (error) throw error;
    id = data.id;
  }
  const session = createLocalLearningSession(contentType, contentId, mode, id);
  saveLearningSession(session);
  return session;
}

function saveLearningSession(session: LearningSession) {
  saveStoredLearningSession(browserLocalAuthStorage, session);
}

async function autosaveLearningAnswer(session: LearningSession, questionId: string) {
  saveLearningSession(session);
  if (!mainDbClient || useDemoLearning()) return;
  const answer = session.answers[questionId];
  await mainDbClient.from("learning_answers").upsert({ attempt_id: session.id, question_id: questionId, raw_answer: answer?.value ?? "", structured_answer: { steps: answer?.steps ?? [] }, confidence_level: answer?.confidence ?? "medium", attempts_count: answer?.attempts ?? 0, hints_used: answer?.hints.length ?? 0 }, { onConflict: "attempt_id,question_id" });
}

async function submitLearningSession(session: LearningSession) {
  const next = submitLocalLearningSession(session);
  saveLearningSession(next);
  if (mainDbClient && !useDemoLearning()) await mainDbClient.from("learning_attempts").update({ status: "submitted", completed_at: new Date().toISOString(), elapsed_seconds: next.elapsedSeconds }).eq("id", session.id);
  return next;
}

return {getLearningCatalog,getLearningDiscovery,suggestLearningContent,getLearningPath,getLearningContent,validateLearningAnswer,getLearningHint,getLearningSolution,getSignedExamPdf,sessionKey,readLearningSession,learningSessionScore,createLearningSession,saveLearningSession,autosaveLearningAnswer,submitLearningSession};
}
