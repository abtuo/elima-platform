import type { RevisionProgress, QuizAttemptSummary, QuizItem, CourseSheet, QuizQuestion } from "../types/revision";
import { isDemoModeActive } from "./env";
import { revisionDbClient } from "./revisionDbClient";
import { demoRevisionProgress, demoQuizzes, demoCourseSheets, demoQuizQuestions } from "../constants/demoData";

const PROGRESS_KEY = "elima-mobile-progress";
const ATTEMPTS_KEY = "elima-mobile-quiz-attempts";

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

export async function recordQuizCompletion(score: number, subject = "Quiz") {
  const progress = readLocalProgress();
  const xpGain = Math.max(10, Math.round(score * 0.5));
  progress.xp += xpGain;
  progress.level = Math.floor(progress.xp / 100) + 1;
  progress.completedQuizCount += 1;
  progress.averageScore = Math.round((progress.averageScore + score) / 2);
  writeLocalProgress(progress);
  const attempts = readLocalAttempts();
  attempts.unshift({ id: crypto.randomUUID(), subject, score, completedAt: new Date().toISOString() });
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts.slice(0, 50)));
  return progress;
}

function readLocalAttempts(): QuizAttemptSummary[] {
  try { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? "[]") as QuizAttemptSummary[]; } catch { return []; }
}

export async function getQuizAttempts(userId?: string): Promise<QuizAttemptSummary[]> {
  if (revisionDbClient && userId) {
    const { data } = await revisionDbClient.from("quiz_attempts").select("id, subject_label, score, completed_at").eq("user_id", userId).order("completed_at", { ascending: false }).limit(50);
    if (data?.length) return data.map((row) => ({ id: String(row.id), subject: String(row.subject_label ?? "Quiz"), score: Number(row.score ?? 0), completedAt: String(row.completed_at) }));
  }
  return readLocalAttempts();
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
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const wantedSubject = normalize(options.subject ?? "");
  const wantedTopic = normalize(options.topic ?? "");
  let pool = quizzes.filter((quiz) => !wantedSubject || normalize(quiz.subject) === wantedSubject || normalize(quiz.subject).includes(wantedSubject));
  if (wantedTopic) {
    const topicMatches = pool.filter((quiz) => normalize(`${quiz.topic} ${quiz.subject}`).includes(wantedTopic));
    if (!topicMatches.length) return null;
    pool = topicMatches;
  }
  if (!pool.length) return null;
  return options.random ? pool[Math.floor(Math.random() * pool.length)] : pool[0];
}

export async function getCourseSheets(userId?: string): Promise<CourseSheet[]> {
  if (isDemoModeActive() || !revisionDbClient || !userId) return demoCourseSheets;

  const { data, error } = await revisionDbClient
    .from("user_course_summaries")
    .select("id, title, subject, topic, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data?.length) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    subject: String(row.subject ?? "—"),
    topic: String(row.topic ?? "—"),
    content: String(row.content ?? ""),
    createdAt: String(row.created_at ?? "").slice(0, 10),
  }));
}

export async function getQuizQuestions(quizSetId?: string): Promise<QuizQuestion[]> {
  if (isDemoModeActive() || !revisionDbClient) {
    return demoQuizQuestions.map((question) => ({ ...question }));
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
    const answers = ((row.answers ?? []) as Array<{ answer_text: string; is_correct: boolean; answer_order: number }>).sort((a, b) => a.answer_order - b.answer_order);
    return { id: String(row.id), question: String(row.prompt), options: answers.map((answer) => answer.answer_text), correctIndex: Math.max(0, answers.findIndex((answer) => answer.is_correct)), hint: row.hint ? String(row.hint) : undefined, explanation: row.explanation ? String(row.explanation) : undefined };
  });
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
