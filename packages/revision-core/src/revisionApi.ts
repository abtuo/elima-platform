import type { ApiClient } from "@elima/api-client";
import type { AuthStorage } from "@elima/auth";
import { seededShuffle } from "./random.ts";
import type { QuizItem, QuizQuestion, RevisionGenerationInput } from "./types.ts";

const GENERATED_QUIZ_PREFIX = "generated:";
const GENERATED_QUIZ_KEY = "elima-mobile-generated-quiz:";

export type RevisionGenerationDependencies = {
  apiFetch: ApiClient["apiFetch"];
  getAccessToken(): Promise<string | undefined>;
  sessionStorage: AuthStorage;
  randomUUID(): string;
};

export function cleanAnswerText(value: string) {
  return value.trim().replace(/^\s*(?:[A-D]|[1-4])\s*[.):-]\s+/i, "");
}

export function mapGeneratedQuizQuestions(rawQuestions: Array<Record<string, unknown>>, shuffleSeed: string): QuizQuestion[] {
  return rawQuestions.map((raw, questionIndex) => {
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
}

export function createRevisionGenerationService(dependencies: RevisionGenerationDependencies) {
  async function call(kind: "quiz" | "sheet", input: RevisionGenerationInput) {
    const token = await dependencies.getAccessToken();
    if (!token) throw new Error("Ta session a expiré. Reconnecte-toi puis réessaie.");
    const response = await dependencies.apiFetch("/api/revision-generate", {
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

  return {
    async generateQuiz(input: RevisionGenerationInput, shuffleSeed: string) {
      const payload = await call("quiz", input);
      const rawQuestions = Array.isArray(payload.questions) ? payload.questions as Array<Record<string, unknown>> : [];
      const questions = mapGeneratedQuizQuestions(rawQuestions, shuffleSeed);
      if (!questions.length) throw new Error("Aucune question valide n’a été générée.");
      const id = `${GENERATED_QUIZ_PREFIX}${dependencies.randomUUID()}`;
      dependencies.sessionStorage.setItem(`${GENERATED_QUIZ_KEY}${id}`, JSON.stringify(questions));
      return { id, questions };
    },
    async generateSheet(input: RevisionGenerationInput) {
      const payload = await call("sheet", input);
      const content = String(payload.content ?? "").trim();
      if (!content) throw new Error("La fiche générée est vide.");
      return content;
    },
  };
}

export function readGeneratedQuiz(storage: AuthStorage, quizSetId: string): QuizQuestion[] {
  if (!quizSetId.startsWith(GENERATED_QUIZ_PREFIX)) return [];
  try { return JSON.parse(storage.getItem(`${GENERATED_QUIZ_KEY}${quizSetId}`) ?? "[]") as QuizQuestion[]; } catch { return []; }
}

export function pickQuizItem(quizzes: QuizItem[], options: { subject?: string; topic?: string; random?: boolean }, random = Math.random): QuizItem | null {
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
  return options.random ? pool[Math.floor(random() * pool.length)] : pool[0];
}
