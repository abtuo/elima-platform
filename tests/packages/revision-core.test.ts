import assert from "node:assert/strict";
import test from "node:test";
import {
  applyQuizScore,
  createLearningApi,
  createLocalLearningSession,
  learningSessionScore,
  mapGeneratedQuizQuestions,
  pickQuizItem,
  recommendExercises,
  saveLearningSession,
  seededShuffle,
  subjectIdFromLabel,
  type LearningExercise,
} from "../../packages/revision-core/src/index.ts";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
    removeItem(key: string) { values.delete(key); },
  };
}

test("revision-core calcule progression et niveau sans dépendre de l'UI", () => {
  assert.deepEqual(applyQuizScore({ xp: 90, level: 1, streakDays: 2, completedQuizCount: 3, averageScore: 60 }, 80), {
    xp: 130, level: 2, streakDays: 2, completedQuizCount: 4, averageScore: 70,
  });
});

test("revision-core persiste et score une session Learning", () => {
  const storage = memoryStorage();
  const session = createLocalLearningSession("guided_exercise", "exercise-1", "guided", "attempt-1", new Date("2026-01-01T00:00:00Z"));
  session.status = "completed";
  session.answers.q1 = { value: "4", confidence: "high", hints: [], attempts: 1, result: { status: "correct", score: 2, reachedStep: 1, errorType: null, message: "", nextAction: "", hintAvailable: false, correctionAllowed: false, validator: "deterministic" } };
  saveLearningSession(storage, session);
  assert.equal(learningSessionScore(storage, "exercise-1", 2), 100);
});

test("revision-core mélange les questions de façon déterministe", () => {
  assert.deepEqual(seededShuffle([1, 2, 3, 4], "seed"), seededShuffle([1, 2, 3, 4], "seed"));
  const questions = mapGeneratedQuizQuestions([{ question: "2+2", options: ["3", "4", "5", "6"], correctIndex: 1 }], "student");
  assert.equal(questions.length, 1);
  assert.equal(questions[0].options[questions[0].correctIndex], "4");
});

test("revision-core sélectionne les quiz par matière et thème", () => {
  const quizzes = [
    { id: "1", subject: "Mathématiques", topic: "Algèbre", questionCount: 10, difficulty: "Moyen" },
    { id: "2", subject: "Français", topic: "Poésie", questionCount: 10, difficulty: "Moyen" },
  ];
  assert.equal(pickQuizItem(quizzes, { subject: "mathematiques", topic: "algèbre" })?.id, "1");
  assert.equal(pickQuizItem(quizzes, { subject: "SVT" }), null);
});

test("revision-core conserve les identifiants de matières", () => {
  assert.equal(subjectIdFromLabel("Physique-Chimie"), "physique-chimie");
  assert.equal(subjectIdFromLabel("Mathématiques"), "maths");
});

test("revision-core recommande seulement au même niveau et dans la même matière", () => {
  const exercise = (id: string, level: string, subject: string, skills: string[]): LearningExercise => ({ id, level, subject, title: id, description: "", country: "", educationSystem: "", chapter: "A", difficulty: "", estimatedMinutes: 5, totalPoints: 1, sourceType: "", metadata: {}, questions: [{ id: `${id}-q`, externalId: "", title: "", prompt: "", questionType: "", points: 1, skills, publicMetadata: {} }] });
  const current = exercise("current", "3e", "Mathématiques", []);
  const result = recommendExercises(current, [exercise("best", "3e", "Mathématiques", ["fractions"]), exercise("wrong", "2de", "Mathématiques", ["fractions"])], ["fractions"]);
  assert.deepEqual(result.map((item) => item.id), ["best"]);
});

test("revision-core injecte le client API et préserve le contrat Learning", async () => {
  let request: { endpoint: string; init?: RequestInit } | undefined;
  const api = createLearningApi({
    apiFetch: async (endpoint, init) => {
      request = { endpoint, init };
      return new Response(JSON.stringify({ profile: { level: "3e", isExamLevel: false, subjects: [] }, exercises: [], exams: [] }), { status: 200 });
    },
    async getAccessToken() { return "token"; },
    isDemoMode() { return true; },
  });
  await api.getCatalog();
  assert.equal(request?.endpoint, "/api/learning");
  assert.equal((request?.init?.headers as Record<string, string>).Authorization, "Bearer token");
  assert.match(String(request?.init?.body), /"demo":true/);
});
