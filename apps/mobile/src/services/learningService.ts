import { apiFetch } from "./api/apiClient";
import { isDemoHost, isDemoModeActive } from "@/services/env";
import { mainDbClient } from "@/services/mainDbClient";
import type { LearningCatalog, LearningSession } from "@/types/learning";
import { browserLocalAuthStorage } from "@elima/auth";
import {
  createLearningApi,
  createLocalLearningSession,
  learningSessionKey,
  learningSessionScore as getStoredLearningSessionScore,
  readLearningSession as readStoredLearningSession,
  saveLearningSession as saveStoredLearningSession,
  submitLocalLearningSession,
} from "@elima/revision-core";

const useDemoLearning = () => isDemoModeActive() || isDemoHost();
const learningApi = createLearningApi({
  apiFetch,
  async getAccessToken() { return (await mainDbClient?.auth.getSession())?.data.session?.access_token; },
  isDemoMode: useDemoLearning,
});

export async function getLearningCatalog(): Promise<LearningCatalog> {
  return learningApi.getCatalog();
}

export async function getLearningDiscovery() {
  return learningApi.getDiscovery();
}

export async function suggestLearningContent(input: { kind: "guided_exercise" | "exam"; subject: string; chapter: string }) {
  return learningApi.suggest(input);
}

export async function getLearningPath(subject: string, chapter: string) {
  return learningApi.getPath(subject, chapter);
}

export async function getLearningContent(kind: "guided_exercise" | "exam", id: string) {
  return learningApi.getContent(kind, id);
}

export async function validateLearningAnswer(input: { session: LearningSession; questionId: string; answer: string; confidence: string; attemptsCount: number }) {
  return learningApi.validate(input);
}

export async function getLearningHint(session: LearningSession, questionId: string, level: number) {
  return learningApi.getHint(session, questionId, level);
}

export async function getLearningSolution(session: LearningSession, questionId: string, allowed: boolean) {
  return learningApi.getSolution(session, questionId, allowed);
}

export async function getSignedExamPdf(path: string) {
  return learningApi.getSignedExamPdf(path);
}

export function sessionKey(contentType: LearningSession["contentType"], contentId: string) {
  return learningSessionKey(contentType, contentId);
}

export function readLearningSession(contentType: LearningSession["contentType"], contentId: string) {
  return readStoredLearningSession(browserLocalAuthStorage, contentType, contentId);
}

export function learningSessionScore(contentId: string, totalPoints?: number) {
  return getStoredLearningSessionScore(browserLocalAuthStorage, contentId, totalPoints);
}

export async function createLearningSession(contentType: LearningSession["contentType"], contentId: string, mode: LearningSession["mode"]): Promise<LearningSession> {
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

export function saveLearningSession(session: LearningSession) {
  saveStoredLearningSession(browserLocalAuthStorage, session);
}

export async function autosaveLearningAnswer(session: LearningSession, questionId: string) {
  saveLearningSession(session);
  if (!mainDbClient || useDemoLearning()) return;
  const answer = session.answers[questionId];
  await mainDbClient.from("learning_answers").upsert({ attempt_id: session.id, question_id: questionId, raw_answer: answer?.value ?? "", structured_answer: { steps: answer?.steps ?? [] }, confidence_level: answer?.confidence ?? "medium", attempts_count: answer?.attempts ?? 0, hints_used: answer?.hints.length ?? 0 }, { onConflict: "attempt_id,question_id" });
}

export async function submitLearningSession(session: LearningSession) {
  const next = submitLocalLearningSession(session);
  saveLearningSession(next);
  if (mainDbClient && !useDemoLearning()) await mainDbClient.from("learning_attempts").update({ status: "submitted", completed_at: new Date().toISOString(), elapsed_seconds: next.elapsedSeconds }).eq("id", session.id);
  return next;
}
