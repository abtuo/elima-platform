import type { ApiClient } from "@elima/api-client";
import type { StudentResourceView } from "@elima/pedagogy";

export type PedagogicalSupport = {
  publicationId: string; assignmentId: string; resourceId: string; versionId: string;
  title: string; subject: string; level: string; chapter?: string;
  activityMode: "training" | "evaluation"; availableFrom?: string; availableUntil?: string;
  maxAttempts?: number;
};

export type PedagogicalAttempt = {
  id: string; publicationId: string; versionId: string; status: "in_progress" | "submitted" | "completed";
  activityMode: "training" | "evaluation"; attemptNumber: number; answeredCount: number;
  questionCount: number; score: number; maxScore: number; pendingReviewCount: number;
};

export type PedagogicalSupportContent = {
  publication: PedagogicalSupport & { correctionsPolicy: string };
  version: { id: string; versionNumber: number };
  view: StudentResourceView;
  attempts: PedagogicalAttempt[];
};

export function createPedagogicalLearningApi(dependencies: {
  apiFetch: ApiClient["apiFetch"];
  getAccessToken(): Promise<string | undefined>;
}) {
  async function call<T>(payload: Record<string, unknown>): Promise<T> {
    const token = await dependencies.getAccessToken();
    const response = await dependencies.apiFetch("/api/pedagogical-learning", {
      method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Les supports de l’enseignant sont indisponibles.");
    return result as T;
  }
  return {
    list: () => call<{ items: PedagogicalSupport[] }>({ action: "list" }),
    content: (publicationId: string) => call<PedagogicalSupportContent>({ action: "content", publicationId }),
    start: (publicationId: string, idempotencyKey: string) => call<PedagogicalAttempt>({ action: "start", publicationId, idempotencyKey }),
    answer: (input: { attemptId: string; questionId: string; answer: string; structuredAnswer?: unknown; submissionKey: string }) => call<Record<string, unknown>>({ action: "answer", ...input }),
    submit: (attemptId: string) => call<PedagogicalAttempt>({ action: "submit", attemptId }),
  };
}
