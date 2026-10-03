import { apiFetch } from "./api/apiClient";
import type { RevisionProgress, QuizAttemptSummary, QuizItem, CourseSheet, QuizQuestion, LearningAttemptSummary } from "../types/revision";
import { isDemoModeActive } from "./env";
import { revisionDbClient } from "./revisionDbClient";
import { demoRevisionProgress, demoQuizzes, demoCourseSheets, demoQuizAttempts, demoQuizQuestions } from "../constants/revisionDemoData";
import { seededShuffle } from "../lib/seededShuffle";
import { subjectIdFromLabel } from "../lib/revisionSubjects";
import { browserSessionAuthStorage } from "@elima/auth";
import { subscriptionRequest } from "./subscriptionService";
import {
  applyQuizScore,
  cleanAnswerText,
  createRevisionGenerationService,
  pickQuizItem,
  readGeneratedQuiz,
  type HintUsage,
  type RevisionGenerationInput,
} from "@elima/revision-core";

const PROGRESS_KEY = "elima-mobile-progress";
const ATTEMPTS_KEY = "elima-mobile-quiz-attempts";
const GENERATED_SHEETS_KEY = "elima-mobile-generated-sheets:";
const QUIZ_FEEDBACK_KEY = "elima-mobile-quiz-feedback";
const MAX_DAILY_HINTS = 5;

function generatedSheetsKey(userId?: string) { return `${GENERATED_SHEETS_KEY}${userId ?? "guest"}`; }
function attemptsKey(userId?: string) { return `${ATTEMPTS_KEY}:${userId ?? "guest"}`; }

function readGeneratedSheets(userId?: string): CourseSheet[] {
  try { return JSON.parse(localStorage.getItem(generatedSheetsKey(userId)) ?? "[]") as CourseSheet[]; } catch { return []; }
}

function writeGeneratedSheets(userId: string | undefined, sheets: CourseSheet[]) {
  localStorage.setItem(generatedSheetsKey(userId), JSON.stringify(sheets.slice(0, 30)));
}

const revisionGeneration = createRevisionGenerationService({
  apiFetch,
  async getAccessToken() {
    if (!revisionDbClient) throw new Error("La génération en temps réel nécessite une connexion à Elima.");
    return (await revisionDbClient.auth.getSession()).data.session?.access_token;
  },
  sessionStorage: browserSessionAuthStorage,
  randomUUID: () => crypto.randomUUID(),
});

export async function getStudentRevisionLevel(userId?: string): Promise<string> {
  if (!revisionDbClient || !userId || isDemoModeActive()) return "Collège / lycée";
  const { data } = await revisionDbClient.from("students").select("class:classes(level, name)").eq("user_id", userId).maybeSingle();
  const klass = data?.class as { level?: string; name?: string } | null | undefined;
  return String(klass?.level ?? klass?.name ?? "Collège / lycée");
}

export async function generateRealtimeQuiz(input: RevisionGenerationInput, shuffleSeed: string): Promise<{ id: string; questions: QuizQuestion[] }> {
  return revisionGeneration.generateQuiz(input, shuffleSeed);
}

export async function generateRealtimeSheet(input: RevisionGenerationInput, userId: string): Promise<CourseSheet> {
  const content = await revisionGeneration.generateSheet(input);
  const cacheKey = `realtime:${crypto.randomUUID()}`;
  const base = {
    user_id: userId,
    cache_key: cacheKey,
    level_id: input.level,
    level_label: input.level,
    subject_id: subjectIdFromLabel(input.subject),
    subject_label: input.subject,
    topic: input.topic,
    content,
    is_shared: false,
  };
  const { data, error } = await revisionDbClient!.from("user_course_summaries").insert(base).select("id, created_at").single();
  const sheet: CourseSheet = {
    id: data?.id ? String(data.id) : cacheKey,
    title: input.topic,
    subject: input.subject,
    topic: input.topic,
    content,
    createdAt: String(data?.created_at ?? new Date().toISOString()).slice(0, 10),
  };
  if (error) {
    const local = readGeneratedSheets(userId);
    writeGeneratedSheets(userId, [sheet, ...local.filter((item) => item.id !== sheet.id)]);
  }
  return sheet;
}

function readLocalProgress(): RevisionProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw) as RevisionProgress;
  } catch { /* ignore */ }
  return { ...demoRevisionProgress };
}

function writeLocalProgress(progress: RevisionProgress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export async function getRevisionProgress(userId?: string): Promise<RevisionProgress> {
  if (isDemoModeActive() || !revisionDbClient || !userId) return readLocalProgress();

  const { data, error } = await revisionDbClient
    .from("user_progress")
    .select("xp, streak_days, completed_quiz_count, average_score")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { xp: 0, level: 1, streakDays: 0, completedQuizCount: 0, averageScore: 0 };

  const xp = Number(data.xp ?? 0);
  return {
    xp,
    level: Math.floor(xp / 100) + 1,
    streakDays: Number(data.streak_days ?? 0),
    completedQuizCount: Number(data.completed_quiz_count ?? 0),
    averageScore: Number(data.average_score ?? 0),
  };
}

export async function recordQuizCompletion(input: {
  userId?: string;
  quizRef: string;
  subject: string;
  topic?: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  source?: "catalog" | "generated" | "document";
  sourceDocumentId?: string;
}) {
  if (revisionDbClient && !isDemoModeActive()) {
    const { data: attemptData, error } = await revisionDbClient.rpc("record_quiz_attempt", {
      p_quiz_ref: input.quizRef,
      p_subject_label: input.subject,
      p_score: input.score,
      p_total_questions: input.totalQuestions,
      p_correct_answers: input.correctAnswers,
      p_completed_at: new Date().toISOString(),
    });
    if (error) throw error;
    const attemptId = attemptData && typeof attemptData === "object" && "id" in attemptData ? String(attemptData.id) : "";
    if (attemptId && (input.topic || input.source)) {
      await revisionDbClient.from("quiz_attempts").update({ topic: input.topic || null, source: input.source ?? (input.quizRef.startsWith("generated:") ? "generated" : "catalog"), source_document_id: input.sourceDocumentId || null }).eq("id", attemptId);
    }
    const { data } = await revisionDbClient.auth.getUser();
    return getRevisionProgress(data.user?.id);
  }

  const progress = applyQuizScore(readLocalProgress(), input.score);
  writeLocalProgress(progress);
  const attempts = readLocalAttempts(input.userId);
  attempts.unshift({ id: crypto.randomUUID(), quizRef: input.quizRef, subject: input.subject, topic: input.topic, score: input.score, totalQuestions: input.totalQuestions, correctAnswers: input.correctAnswers, completedAt: new Date().toISOString(), source: input.source, sourceDocumentId: input.sourceDocumentId });
  localStorage.setItem(attemptsKey(input.userId), JSON.stringify(attempts.slice(0, 50)));
  return progress;
}

export async function submitQuizFeedback(input: {
  quizRef: string;
  subject: string;
  rating: number;
  difficulty: "too_easy" | "balanced" | "too_hard";
}) {
  const feedback = {
    id: crypto.randomUUID(),
    quiz_ref: input.quizRef,
    subject_label: input.subject,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    difficulty_perception: input.difficulty,
    created_at: new Date().toISOString(),
  };

  if (revisionDbClient && !isDemoModeActive()) {
    const { data: auth } = await revisionDbClient.auth.getUser();
    if (auth.user) {
      const { error } = await revisionDbClient.from("quiz_feedback").insert({ ...feedback, user_id: auth.user.id });
      if (!error) return;
    }
  }

  try {
    const existing = JSON.parse(localStorage.getItem(QUIZ_FEEDBACK_KEY) ?? "[]") as Array<typeof feedback>;
    localStorage.setItem(QUIZ_FEEDBACK_KEY, JSON.stringify([feedback, ...existing].slice(0, 100)));
  } catch { /* stockage local indisponible */ }
}

function readLocalAttempts(userId?: string): QuizAttemptSummary[] {
  try {
    const scoped = localStorage.getItem(attemptsKey(userId));
    if (scoped) return JSON.parse(scoped) as QuizAttemptSummary[];
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? "[]") as QuizAttemptSummary[];
  } catch { return []; }
}

export async function getQuizAttempts(userId?: string): Promise<QuizAttemptSummary[]> {
  const local = readLocalAttempts(userId);
  if (isDemoModeActive()) return [...local, ...demoQuizAttempts.filter((demo) => !local.some((attempt) => attempt.id === demo.id))].slice(0, 50);
  if (revisionDbClient && userId) {
    const { data } = await revisionDbClient.from("quiz_attempts").select("id, quiz_ref, subject_label, topic, source, source_document_id, score, total_questions, correct_answers, completed_at").eq("user_id", userId).order("completed_at", { ascending: false }).limit(50);
    if (data?.length) {
      const quizzes = await getAvailableQuizzes();
      return data.map((row) => {
        const quizRef = String(row.quiz_ref ?? "");
        const quiz = quizzes.find((item) => item.id === quizRef);
        return { id: String(row.id), quizRef: quizRef || undefined, subject: String(row.subject_label ?? "Quiz"), topic: row.topic ? String(row.topic) : quiz?.topic, source: row.source ? String(row.source) as QuizAttemptSummary["source"] : undefined, sourceDocumentId: row.source_document_id ? String(row.source_document_id) : undefined, score: Number(row.score ?? 0), totalQuestions: Number(row.total_questions ?? 0) || undefined, correctAnswers: Number(row.correct_answers ?? 0), completedAt: String(row.completed_at) };
      });
    }
  }
  return local;
}

type LearningAttemptRow = {
  id: unknown;
  content_type: unknown;
  exercise_id: unknown;
  exam_subject_id: unknown;
  status: unknown;
  started_at: unknown;
  completed_at: unknown;
  elapsed_seconds: unknown;
  adjusted_score: unknown;
  max_score: unknown;
  exercise?: unknown;
  exam?: unknown;
};

function relatedRow(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) return value[0] as Record<string, unknown> | undefined;
  return value && typeof value === "object" ? value as Record<string, unknown> : undefined;
}

function relatedLabel(value: unknown): string | undefined {
  const row = relatedRow(value);
  return row?.label ? String(row.label) : undefined;
}

function mapLearningAttempt(row: LearningAttemptRow): LearningAttemptSummary | null {
  const contentType = row.content_type === "exam" ? "exam" : "guided_exercise";
  const contentId = String(contentType === "exam" ? row.exam_subject_id ?? "" : row.exercise_id ?? "");
  if (!contentId) return null;

  const content = relatedRow(contentType === "exam" ? row.exam : row.exercise);
  const maxScore = Number(row.max_score ?? 0);
  const adjustedScore = Number(row.adjusted_score ?? 0);
  const status = ["in_progress", "submitted", "completed", "abandoned"].includes(String(row.status))
    ? String(row.status) as LearningAttemptSummary["status"]
    : "in_progress";

  return {
    id: String(row.id),
    contentType,
    contentId,
    title: content?.title ? String(content.title) : contentType === "exam" ? "Sujet d’examen" : "Exercice guidé",
    subject: relatedLabel(content?.subject),
    chapter: relatedLabel(content?.chapter),
    status,
    startedAt: String(row.started_at ?? ""),
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    elapsedSeconds: Number(row.elapsed_seconds ?? 0),
    score: maxScore > 0 ? Math.round((adjustedScore / maxScore) * 100) : undefined,
  };
}

export async function getLearningAttempts(userId?: string): Promise<LearningAttemptSummary[]> {
  if (!revisionDbClient || !userId || isDemoModeActive()) return [];

  const fields = "id, content_type, exercise_id, exam_subject_id, status, started_at, completed_at, elapsed_seconds, adjusted_score, max_score, exercise:learning_exercises(title, subject:learning_subjects(label), chapter:learning_chapters(label)), exam:exam_subjects(title, subject:learning_subjects(label))";
  const { data, error } = await revisionDbClient
    .from("learning_attempts")
    .select(fields)
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return (data as unknown as LearningAttemptRow[])
    .map(mapLearningAttempt)
    .filter((attempt): attempt is LearningAttemptSummary => Boolean(attempt));
}

export async function getAvailableQuizzes(): Promise<QuizItem[]> {
  if (isDemoModeActive() || !revisionDbClient) return demoQuizzes;

  const { data, error } = await revisionDbClient
    .from("quiz_sets")
    .select("id, subject, subject_label, topic, question_count, difficulty, play_count")
    .order("play_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(250);

  if (error || !data?.length) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    subject: String(row.subject_label ?? row.subject ?? "Matière"),
    topic: String(row.topic ?? "—"),
    questionCount: Number(row.question_count ?? 10),
    difficulty: Number(row.difficulty ?? 3) <= 2 ? "Facile" : Number(row.difficulty ?? 3) >= 4 ? "Difficile" : "Moyen",
  }));
}

export async function pickQuiz(options: { subject?: string; topic?: string; random?: boolean }): Promise<QuizItem | null> {
  const quizzes = await getAvailableQuizzes();
  return pickQuizItem(quizzes, options);
}

export async function getCourseSheets(userId?: string): Promise<CourseSheet[]> {
  const localSheets = readGeneratedSheets(userId);
  if (isDemoModeActive() || !revisionDbClient || !userId) return [...localSheets, ...demoCourseSheets];

  const { data, error } = await revisionDbClient
    .from("user_course_summaries")
    .select("id, subject_label, topic, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data?.length) return localSheets;

  const remoteSheets = data.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    title: String(row.topic ?? "Fiche de révision"),
    subject: String(row.subject_label ?? "—"),
    topic: String(row.topic ?? "—"),
    content: String(row.content ?? ""),
    createdAt: String(row.created_at ?? "").slice(0, 10),
  }));
  return [...remoteSheets, ...localSheets.filter((local) => !remoteSheets.some((remote) => remote.id === local.id))];
}

export async function getQuizQuestions(quizSetId?: string, shuffleSeed = "guest"): Promise<QuizQuestion[]> {
  if (quizSetId?.startsWith("generated:")) return readGeneratedQuiz(browserSessionAuthStorage, quizSetId);
  if (isDemoModeActive() || !revisionDbClient) {
    return demoQuizQuestions.map((question) => {
      const answers = seededShuffle(
        question.options.map((text, index) => ({ text, correct: index === question.correctIndex })),
        `${shuffleSeed}|${question.id}`,
      );
      return { ...question, options: answers.map((answer) => cleanAnswerText(answer.text)), correctIndex: answers.findIndex((answer) => answer.correct) };
    });
  }
  let selectedId = quizSetId;
  if (!selectedId) {
    const { data } = await revisionDbClient.from("quiz_sets").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
    selectedId = data?.id ? String(data.id) : undefined;
  }
  if (!selectedId) return [];
  const { data, error } = await revisionDbClient.from("quiz_questions").select("id, prompt, hint, explanation, answers:quiz_answers(id, answer_text, is_correct, answer_order)").eq("quiz_set_id", selectedId).order("question_order");
  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => {
    const answers = seededShuffle(
      ((row.answers ?? []) as Array<{ answer_text: string; is_correct: boolean; answer_order: number }>).sort((a, b) => a.answer_order - b.answer_order),
      `${shuffleSeed}|${String(row.id)}`,
    );
    return { id: String(row.id), question: String(row.prompt), options: answers.map((answer) => cleanAnswerText(answer.answer_text)), correctIndex: Math.max(0, answers.findIndex((answer) => answer.is_correct)), hint: row.hint ? String(row.hint) : undefined, explanation: row.explanation ? String(row.explanation) : undefined };
  });
}

function localHintKey(userId?: string) {
  return `elima-mobile-hints:${userId ?? "guest"}:${new Date().toISOString().slice(0, 10)}`;
}

function readLocalHintUsage(userId?: string): HintUsage {
  const used = Math.max(0, Number(localStorage.getItem(localHintKey(userId)) ?? 0));
  return { used, limit: MAX_DAILY_HINTS, remaining: Math.max(0, MAX_DAILY_HINTS - used) };
}

export async function getDailyHintUsage(userId?: string): Promise<HintUsage> {
  if (!revisionDbClient || !userId || isDemoModeActive()) return readLocalHintUsage(userId);
  const usage = (await subscriptionRequest()).usage.ai_hint;
  return { used: usage.used, limit: usage.limit ?? Infinity, remaining: usage.unlimited ? Infinity : usage.remaining };
}

export async function consumeDailyHint(userId?: string): Promise<HintUsage & { ok: boolean }> {
  if (revisionDbClient && userId && !isDemoModeActive()) {
    const usage = (await subscriptionRequest({ action: "hint" })).usage.ai_hint;
    return { ok: true, used: usage.used, limit: usage.limit ?? Infinity, remaining: usage.unlimited ? Infinity : usage.remaining };
  }
  const current = readLocalHintUsage(userId);
  if (current.remaining <= 0) return { ...current, ok: false };
  const used = current.used + 1;
  localStorage.setItem(localHintKey(userId), String(used));
  return { ok: true, used, limit: MAX_DAILY_HINTS, remaining: MAX_DAILY_HINTS - used };
}

export function isDailyQuizCompleted(userId?: string): boolean {
  const key = `elima-daily-quiz-${userId ?? "guest"}`;
  const today = new Date().toISOString().slice(0, 10);
  return localStorage.getItem(key) === today;
}

export function markDailyQuizCompleted(userId?: string) {
  const key = `elima-daily-quiz-${userId ?? "guest"}`;
  localStorage.setItem(key, new Date().toISOString().slice(0, 10));
}
