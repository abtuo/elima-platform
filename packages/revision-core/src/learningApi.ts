import type { ApiClient } from "@elima/api-client";
import type { LearningCatalog, LearningContent, LearningDiscovery, LearningPath, LearningSession, LearningSuggestion, ValidationResult } from "./types.ts";

export type LearningApiDependencies = {
  apiFetch: ApiClient["apiFetch"];
  getAccessToken(): Promise<string | undefined>;
  isDemoMode(): boolean;
};

export function normalizeLearningCatalog(raw: Record<string, unknown>): LearningCatalog {
  const rawExercises = (raw.exercises ?? []) as Array<Record<string, unknown>>;
  if (raw.profile && (rawExercises.length === 0 || "estimatedMinutes" in rawExercises[0])) return raw as unknown as LearningCatalog;
  const exercises = rawExercises.map((item) => ({
    id: String(item.id), title: String(item.title), description: String(item.description ?? ""), country: String(item.country_code ?? ""), educationSystem: String(item.education_system ?? ""),
    level: String((item.level as { label?: string })?.label ?? ""), subject: String((item.subject as { label?: string })?.label ?? ""), chapter: String((item.chapter as { label?: string })?.label ?? ""),
    difficulty: String(item.difficulty), estimatedMinutes: Number(item.estimated_minutes), totalPoints: Number(item.total_points), sourceType: String(item.source_type), metadata: (item.metadata ?? {}) as LearningCatalog["exercises"][number]["metadata"],
    questions: ((item.questions ?? []) as Array<Record<string, unknown>>).sort((a, b) => Number(a.position) - Number(b.position)).map((question) => ({ id: String(question.id), externalId: String(question.external_id), title: String(question.title ?? "Question"), prompt: String(question.prompt), questionType: String(question.question_type), points: Number(question.points), skills: (question.skills ?? []) as string[], publicMetadata: (question.public_metadata ?? {}) as Record<string, unknown> })),
  }));
  const exams = ((raw.exams ?? []) as Array<Record<string, unknown>>).map((item) => ({
    id: String(item.id), slug: String(item.slug), title: String(item.title), country: String(item.country_code ?? ""), educationSystem: String(item.education_system ?? ""), level: String((item.level as { label?: string })?.label ?? ""), subject: String((item.subject as { label?: string })?.label ?? ""), year: Number(item.year), session: String(item.session ?? ""), examType: String(item.exam_type), durationMinutes: Number(item.duration_minutes), totalPoints: Number(item.total_points), coefficient: item.coefficient == null ? undefined : Number(item.coefficient), sourcePdfPath: item.source_pdf_path ? String(item.source_pdf_path) : undefined, instructions: (item.instructions ?? []) as string[], exerciseIds: ((item.items ?? []) as Array<{ exercise_id: string; position: number }>).sort((a, b) => a.position - b.position).map((entry) => entry.exercise_id), questionCount: 0,
  }));
  for (const exam of exams) exam.questionCount = exam.exerciseIds.reduce((sum, id) => sum + (exercises.find((exercise) => exercise.id === id)?.questions.length ?? 0), 0);
  const serverProfile = (raw.profile ?? {}) as Partial<LearningCatalog["profile"]>;
  return { profile: { level: serverProfile.level ?? "", country: serverProfile.country, educationSystem: serverProfile.educationSystem, isExamLevel: serverProfile.isExamLevel ?? false, subjects: serverProfile.subjects ?? [...new Set(exercises.map((item) => item.subject))] }, exercises, exams };
}

export function createLearningApi(dependencies: LearningApiDependencies) {
  async function call<T>(body: Record<string, unknown>): Promise<T> {
    const token = await dependencies.getAccessToken();
    const response = await dependencies.apiFetch("/api/learning", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ ...body, demo: dependencies.isDemoMode() }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Le service pédagogique est indisponible.");
    return payload as T;
  }

  return {
    async getCatalog() { return normalizeLearningCatalog(await call<Record<string, unknown>>({ action: "catalog" })); },
    async getDiscovery() { return call<LearningDiscovery>({ action: "discovery" }); },
    async suggest(input: { kind: "guided_exercise" | "exam"; subject: string; chapter: string }) { return call<LearningSuggestion>({ action: "suggest", ...input }); },
    async getPath(subject: string, chapter: string) { return call<LearningPath>({ action: "path", subject, chapter }); },
    async getContent(kind: "guided_exercise" | "exam", id: string) { return call<LearningContent>({ action: "content", kind, id }); },
    async validate(input: { session: LearningSession; questionId: string; answer: string; confidence: string; attemptsCount: number }) {
      const saved = input.session.answers[input.questionId];
      return call<ValidationResult>({ action: "validate", attemptId: input.session.id, questionId: input.questionId, answer: input.answer, steps: saved?.steps ?? [], confidence: input.confidence, attemptsCount: input.attemptsCount, hintsUsed: saved?.hints.length ?? 0 });
    },
    async getHint(session: LearningSession, questionId: string, level: number) { return call<{ content: string; level: number }>({ action: "hint", attemptId: session.id, questionId, level }); },
    async getSolution(session: LearningSession, questionId: string, allowed: boolean) { return call<{ steps: Array<string | { content: string }> }>({ action: "solution", attemptId: session.id, questionId, allowed }); },
    async getSignedExamPdf(path: string) { return call<{ url: string }>({ action: "signed-pdf", path }); },
  };
}
