import { apiFetch } from "./api/apiClient";
import { isDemoHost, isDemoModeActive } from "@/services/env";
import { mainDbClient } from "@/services/mainDbClient";
import type { LearningCatalog, LearningContent, LearningDiscovery, LearningPath, LearningSession, LearningSuggestion, ValidationResult } from "@/types/learning";

const SESSION_PREFIX = "elima_learning_session:";
const useDemoLearning = () => isDemoModeActive() || isDemoHost();

async function api<T>(body: Record<string, unknown>): Promise<T> {
  const token = (await mainDbClient?.auth.getSession())?.data.session?.access_token;
  const response = await apiFetch("/api/learning", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ ...body, demo: useDemoLearning() }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Le service pédagogique est indisponible.");
  return payload as T;
}

function normalizeCatalog(raw: Record<string, unknown>): LearningCatalog {
  const rawExercises = (raw.exercises ?? []) as Array<Record<string, unknown>>;
  if (raw.profile && (rawExercises.length === 0 || "estimatedMinutes" in rawExercises[0])) return raw as unknown as LearningCatalog;
  const exercises = ((raw.exercises ?? []) as Array<Record<string, unknown>>).map((item) => ({
    id: String(item.id), title: String(item.title), description: String(item.description ?? ""), country: String(item.country_code ?? ""), educationSystem: String(item.education_system ?? ""),
    level: String((item.level as { label?: string })?.label ?? ""), subject: String((item.subject as { label?: string })?.label ?? ""), chapter: String((item.chapter as { label?: string })?.label ?? ""),
    difficulty: String(item.difficulty), estimatedMinutes: Number(item.estimated_minutes), totalPoints: Number(item.total_points), sourceType: String(item.source_type), metadata: (item.metadata ?? {}) as LearningCatalog["exercises"][number]["metadata"],
    questions: ((item.questions ?? []) as Array<Record<string, unknown>>).sort((a, b) => Number(a.position) - Number(b.position)).map((q) => ({ id: String(q.id), externalId: String(q.external_id), title: String(q.title ?? "Question"), prompt: String(q.prompt), questionType: String(q.question_type), points: Number(q.points), skills: (q.skills ?? []) as string[], publicMetadata: (q.public_metadata ?? {}) as Record<string, unknown> })),
  }));
  const exams = ((raw.exams ?? []) as Array<Record<string, unknown>>).map((item) => ({
    id: String(item.id), slug: String(item.slug), title: String(item.title), country: String(item.country_code ?? ""), educationSystem: String(item.education_system ?? ""), level: String((item.level as { label?: string })?.label ?? ""), subject: String((item.subject as { label?: string })?.label ?? ""), year: Number(item.year), session: String(item.session ?? ""), examType: String(item.exam_type), durationMinutes: Number(item.duration_minutes), totalPoints: Number(item.total_points), coefficient: item.coefficient == null ? undefined : Number(item.coefficient), sourcePdfPath: item.source_pdf_path ? String(item.source_pdf_path) : undefined, instructions: (item.instructions ?? []) as string[], exerciseIds: ((item.items ?? []) as Array<{ exercise_id: string; position: number }>).sort((a, b) => a.position - b.position).map((entry) => entry.exercise_id), questionCount: 0,
  }));
  for (const exam of exams) exam.questionCount = exam.exerciseIds.reduce((sum, id) => sum + (exercises.find((e) => e.id === id)?.questions.length ?? 0), 0);
  const serverProfile = (raw.profile ?? {}) as Partial<LearningCatalog["profile"]>;
  return { profile: { level: serverProfile.level ?? "", country: serverProfile.country, educationSystem: serverProfile.educationSystem, isExamLevel: serverProfile.isExamLevel ?? false, subjects: serverProfile.subjects ?? [...new Set(exercises.map((item) => item.subject))] }, exercises, exams };
}

export async function getLearningCatalog(): Promise<LearningCatalog> {
  return normalizeCatalog(await api<Record<string, unknown>>({ action: "catalog" }));
}

export async function getLearningDiscovery() {
  return api<LearningDiscovery>({ action: "discovery" });
}

export async function suggestLearningContent(input: { kind: "guided_exercise" | "exam"; subject: string; chapter: string }) {
  return api<LearningSuggestion>({ action: "suggest", ...input });
}

export async function getLearningPath(subject: string, chapter: string) {
  return api<LearningPath>({ action: "path", subject, chapter });
}

export async function getLearningContent(kind: "guided_exercise" | "exam", id: string) {
  return api<LearningContent>({ action: "content", kind, id });
}

export async function validateLearningAnswer(input: { session: LearningSession; questionId: string; answer: string; confidence: string; attemptsCount: number }) {
  const saved = input.session.answers[input.questionId];
  return api<ValidationResult>({ action: "validate", attemptId: input.session.id, questionId: input.questionId, answer: input.answer, steps: saved?.steps ?? [], confidence: input.confidence, attemptsCount: input.attemptsCount, hintsUsed: saved?.hints.length ?? 0 });
}

export async function getLearningHint(session: LearningSession, questionId: string, level: number) {
  return api<{ content: string; level: number }>({ action: "hint", attemptId: session.id, questionId, level });
}

export async function getLearningSolution(session: LearningSession, questionId: string, allowed: boolean) {
  return api<{ steps: Array<string | { content: string }> }>({ action: "solution", attemptId: session.id, questionId, allowed });
}

export async function getSignedExamPdf(path: string) {
  return api<{ url: string }>({ action: "signed-pdf", path });
}

export function sessionKey(contentType: LearningSession["contentType"], contentId: string) {
  return `${SESSION_PREFIX}${contentType}:${contentId}`;
}

export function readLearningSession(contentType: LearningSession["contentType"], contentId: string) {
  try { return JSON.parse(localStorage.getItem(sessionKey(contentType, contentId)) ?? "null") as LearningSession | null; } catch { return null; }
}

export function learningSessionScore(contentId: string, totalPoints?: number) {
  const session = readLearningSession("guided_exercise", contentId);
  if (!session || (session.status !== "submitted" && session.status !== "completed")) return null;
  const assessed = Object.values(session.answers).filter((answer) => answer.result);
  if (!assessed.length) return 0;
  const earned = assessed.reduce((sum, answer) => sum + Number(answer.result?.score || 0), 0);
  const maximum = Math.max(Number(totalPoints || assessed.length), 1);
  return Math.round(earned * 100 / maximum);
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
  const session: LearningSession = { id, contentType, contentId, mode, status: "in_progress", startedAt: new Date().toISOString(), elapsedSeconds: 0, currentQuestion: 0, answers: {}, marked: [] };
  saveLearningSession(session);
  return session;
}

export function saveLearningSession(session: LearningSession) {
  localStorage.setItem(sessionKey(session.contentType, session.contentId), JSON.stringify(session));
}

export async function autosaveLearningAnswer(session: LearningSession, questionId: string) {
  saveLearningSession(session);
  if (!mainDbClient || useDemoLearning()) return;
  const answer = session.answers[questionId];
  await mainDbClient.from("learning_answers").upsert({ attempt_id: session.id, question_id: questionId, raw_answer: answer?.value ?? "", structured_answer: { steps: answer?.steps ?? [] }, confidence_level: answer?.confidence ?? "medium", attempts_count: answer?.attempts ?? 0, hints_used: answer?.hints.length ?? 0 }, { onConflict: "attempt_id,question_id" });
}

export async function submitLearningSession(session: LearningSession) {
  const next = { ...session, status: "submitted" as const, elapsedSeconds: Math.max(session.elapsedSeconds, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000)) };
  saveLearningSession(next);
  if (mainDbClient && !useDemoLearning()) await mainDbClient.from("learning_attempts").update({ status: "submitted", completed_at: new Date().toISOString(), elapsed_seconds: next.elapsedSeconds }).eq("id", session.id);
  return next;
}
