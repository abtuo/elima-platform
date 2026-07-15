import type { RevisionProgress, QuizAttemptSummary, QuizItem, CourseSheet, QuizQuestion } from "../types/revision";
import { isDemoModeActive } from "./env";
import { revisionDbClient } from "./revisionDbClient";
import { demoRevisionProgress, demoQuizzes, demoCourseSheets, demoQuizQuestions } from "../constants/demoData";
import { seededShuffle } from "../lib/seededShuffle";
import { subjectIdFromLabel } from "../lib/revisionSubjects";

const PROGRESS_KEY = "elima-mobile-progress";
const ATTEMPTS_KEY = "elima-mobile-quiz-attempts";
const GENERATED_QUIZ_PREFIX = "generated:";
const GENERATED_QUIZ_KEY = "elima-mobile-generated-quiz:";
const GENERATED_SHEETS_KEY = "elima-mobile-generated-sheets:";
const QUIZ_FEEDBACK_KEY = "elima-mobile-quiz-feedback";
const MAX_DAILY_HINTS = 5;

type GenerationInput = { subject: string; topic: string; level: string };
type HintUsage = { used: number; limit: number; remaining: number };

function generatedSheetsKey(userId?: string) { return `${GENERATED_SHEETS_KEY}${userId ?? "guest"}`; }

function readGeneratedSheets(userId?: string): CourseSheet[] {
  try { return JSON.parse(localStorage.getItem(generatedSheetsKey(userId)) ?? "[]") as CourseSheet[]; } catch { return []; }
}

function writeGeneratedSheets(userId: string | undefined, sheets: CourseSheet[]) {
  localStorage.setItem(generatedSheetsKey(userId), JSON.stringify(sheets.slice(0, 30)));
}

async function callRevisionGenerator(kind: "quiz" | "sheet", input: GenerationInput) {
  if (!revisionDbClient) throw new Error("La génération en temps réel nécessite une connexion à Elima.");
  const { data } = await revisionDbClient.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Ta session a expiré. Reconnecte-toi puis réessaie.");

  const response = await fetch("/api/revision-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind, ...input }),
  });
  const raw = await response.text();
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(raw) as Record<string, unknown>; } catch { /* handled below */ }
  if (!response.ok) throw new Error(String(payload.error ?? `Génération impossible (${response.status}).`));
  return payload;
}

export async function getStudentRevisionLevel(userId?: string): Promise<string> {
  if (!revisionDbClient || !userId || isDemoModeActive()) return "Collège / lycée";
  const { data } = await revisionDbClient.from("students").select("class:classes(level, name)").eq("user_id", userId).maybeSingle();
  const klass = data?.class as { level?: string; name?: string } | null | undefined;
  return String(klass?.level ?? klass?.name ?? "Collège / lycée");
}

export async function generateRealtimeQuiz(input: GenerationInput, shuffleSeed: string): Promise<{ id: string; questions: QuizQuestion[] }> {
  const payload = await callRevisionGenerator("quiz", input);
  const rawQuestions = Array.isArray(payload.questions) ? payload.questions as Array<Record<string, unknown>> : [];
  const questions = rawQuestions.map((raw, questionIndex) => {
    const options = Array.isArray(raw.options) ? raw.options.map((value) => cleanAnswerText(String(value))) : [];
    const correctIndex = Number(raw.correctIndex);
    const shuffled = seededShuffle(options.map((text, index) => ({ text, correct: index === correctIndex })), `${shuffleSeed}|generated-${questionIndex}`);
    return {
      id: String(raw.id ?? `generated-${questionIndex + 1}`),
      question: String(raw.question ?? ""),
      options: shuffled.map((option) => option.text),
      correctIndex: shuffled.findIndex((option) => option.correct),
      hint: raw.hint ? String(raw.hint) : undefined,
      explanation: raw.explanation ? String(raw.explanation) : undefined,
    };
  }).filter((question) => question.question && question.options.length === 4 && question.correctIndex >= 0);
  if (!questions.length) throw new Error("Aucune question valide n’a été générée.");
  const id = `${GENERATED_QUIZ_PREFIX}${crypto.randomUUID()}`;
  sessionStorage.setItem(`${GENERATED_QUIZ_KEY}${id}`, JSON.stringify(questions));
  return { id, questions };
}

export async function generateRealtimeSheet(input: GenerationInput, userId: string): Promise<CourseSheet> {
  const payload = await callRevisionGenerator("sheet", input);
  const content = String(payload.content ?? "").trim();
  if (!content) throw new Error("La fiche générée est vide.");
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
  quizRef: string;
  subject: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
}) {
  if (revisionDbClient && !isDemoModeActive()) {
    const { error } = await revisionDbClient.rpc("record_quiz_attempt", {
      p_quiz_ref: input.quizRef,
      p_subject_label: input.subject,
      p_score: input.score,
      p_total_questions: input.totalQuestions,
      p_correct_answers: input.correctAnswers,
      p_completed_at: new Date().toISOString(),
    });
    if (error) throw error;
    const { data } = await revisionDbClient.auth.getUser();
    return getRevisionProgress(data.user?.id);
  }

  const progress = readLocalProgress();
  const xpGain = Math.max(10, Math.round(input.score * 0.5));
  progress.xp += xpGain;
  progress.level = Math.floor(progress.xp / 100) + 1;
  progress.completedQuizCount += 1;
  progress.averageScore = Math.round((progress.averageScore + input.score) / 2);
  writeLocalProgress(progress);
  const attempts = readLocalAttempts();
  attempts.unshift({ id: crypto.randomUUID(), subject: input.subject, score: input.score, completedAt: new Date().toISOString() });
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts.slice(0, 50)));
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
  if (quizSetId?.startsWith(GENERATED_QUIZ_PREFIX)) {
    try { return JSON.parse(sessionStorage.getItem(`${GENERATED_QUIZ_KEY}${quizSetId}`) ?? "[]") as QuizQuestion[]; } catch { return []; }
  }
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

function cleanAnswerText(value: string) {
  return value.trim().replace(/^\s*(?:[A-D]|[1-4])\s*[.):\-]\s+/i, "");
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
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await revisionDbClient.from("user_daily_hints").select("hints_used").eq("user_id", userId).eq("usage_date", today).maybeSingle();
  if (error) return readLocalHintUsage(userId);
  const used = Math.min(MAX_DAILY_HINTS, Number(data?.hints_used ?? 0));
  return { used, limit: MAX_DAILY_HINTS, remaining: Math.max(0, MAX_DAILY_HINTS - used) };
}

export async function consumeDailyHint(userId?: string): Promise<HintUsage & { ok: boolean }> {
  if (revisionDbClient && userId && !isDemoModeActive()) {
    const { data, error } = await revisionDbClient.rpc("consume_daily_hint", { p_max_per_day: MAX_DAILY_HINTS });
    if (!error && data) {
      const used = Number(data.used ?? 0);
      return { ok: Boolean(data.ok), used, limit: MAX_DAILY_HINTS, remaining: Number(data.remaining ?? Math.max(0, MAX_DAILY_HINTS - used)) };
    }
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
