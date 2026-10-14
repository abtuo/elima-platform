"use client";

import { createApiClient } from "@elima/api-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PedagogicalGenerationRequest, PedagogicalResourceBundle } from "@elima/pedagogy";
import type { GenerationJob, PedagogicalVersion, ResourceDetail, ResourcePage, Review } from "./types";

export class PedagogicalClientError extends Error {
  constructor(message: string, public status: number, public code: string, public details?: unknown, public retryAfterMs?: number) {
    super(message);
    this.name = "PedagogicalClientError";
  }
}

export type PedagogicalApi = ReturnType<typeof createPedagogicalApi>;

export function createPedagogicalApi(fetchImplementation: typeof fetch = globalThis.fetch) {
  const api = createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_REVISION_API_BASE_URL,
    environment: "production",
    requireRemoteBackend: true,
  }, fetchImplementation);
  const auth = createSupabaseBrowserClient();

  async function request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const session = (await auth.auth.getSession()).data.session;
    if (!session?.access_token) throw new PedagogicalClientError("Votre session a expiré. Reconnectez-vous.", 401, "authentication_required");
    let response: Response;
    try {
      response = await api.apiFetch(endpoint, {
        ...init,
        cache: "no-store",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, ...init.headers },
      });
    } catch {
      throw new PedagogicalClientError("Le réseau est indisponible. Vos modifications locales sont conservées.", 0, "network_unavailable");
    }
    const body = await response.json().catch(() => ({})) as { message?: string; code?: string; details?: unknown };
    if (!response.ok) {
      const retryAfter = Number(response.headers.get("retry-after"));
      throw new PedagogicalClientError(body.message ?? "Le service pédagogique est indisponible.", response.status, body.code ?? "pedagogical_error", body.details, Number.isFinite(retryAfter) ? retryAfter * 1_000 : undefined);
    }
    return body as T;
  }

  return {
    async currentUserId() { return (await auth.auth.getUser()).data.user?.id ?? null; },
    listResources(query: Record<string, string | number | undefined>) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
      return request<ResourcePage>(`/api/pedagogical-resources?${params}`);
    },
    getResource(resourceId: string, includePrivate: boolean) {
      return request<ResourceDetail>(`/api/pedagogical-resources?resourceId=${encodeURIComponent(resourceId)}&includePrivate=${includePrivate}`);
    },
    updateResource(resourceId: string, versionId: string, expectedLockVersion: number, bundle: PedagogicalResourceBundle) {
      return request<{ version: PedagogicalVersion }>("/api/pedagogical-resources", { method: "POST", body: JSON.stringify({ action: "update", resourceId, versionId, expectedLockVersion, bundle }) });
    },
    archiveResource(resourceId: string) {
      return request<void>("/api/pedagogical-resources", { method: "POST", body: JSON.stringify({ action: "archive", resourceId }) });
    },
    listVersions(resourceId: string) {
      return request<{ items: PedagogicalVersion[] }>(`/api/pedagogical-versions?resourceId=${encodeURIComponent(resourceId)}`);
    },
    getVersion(versionId: string, includePrivate: boolean) {
      return request<ResourceDetail>(`/api/pedagogical-versions?versionId=${encodeURIComponent(versionId)}&includePrivate=${includePrivate}`);
    },
    createVersion(resourceId: string) {
      return request<{ version: PedagogicalVersion }>("/api/pedagogical-versions", { method: "POST", body: JSON.stringify({ action: "create", resourceId }) });
    },
    submitReview(versionId: string) {
      return request<PedagogicalVersion>("/api/pedagogical-versions", { method: "POST", body: JSON.stringify({ action: "submit", versionId }) });
    },
    listReviews(versionId: string) {
      return request<{ items: Review[] }>(`/api/pedagogical-validation?versionId=${encodeURIComponent(versionId)}`);
    },
    runValidation(versionId: string) {
      return request<{ review: Review; validation: { success: boolean; errors: Review["errors"]; warnings: Review["warnings"] } }>("/api/pedagogical-validation", { method: "POST", body: JSON.stringify({ action: "run", versionId }) });
    },
    decideReview(versionId: string, decision: "approve" | "reject", reasons: string[]) {
      return request<{ version: PedagogicalVersion }>("/api/pedagogical-validation", { method: "POST", body: JSON.stringify({ action: "decide", versionId, decision, reasons }) });
    },
    publishVersion(versionId: string, options: { activityMode: "training" | "evaluation"; correctionsPolicy: "teacher_only" | "after_due_date" | "after_submission" | "never"; availableFrom?: string; availableUntil?: string; maxAttempts?: number; revealAfterAttempts?: number }) {
      return request<{ id: string } & Record<string, unknown>>("/api/pedagogical-publications", { method: "POST", body: JSON.stringify({ action: "publish", versionId, channel: "revision", audience: "assigned", ...options }) });
    },
    assignPublication(publicationId: string, classId: string, options: { activityMode?: "training" | "evaluation"; correctionsPolicy?: "teacher_only" | "after_due_date" | "after_submission" | "never"; availableFrom?: string; availableUntil?: string; maxAttempts?: number; revealAfterAttempts?: number }) {
      return request<unknown>("/api/pedagogical-publications", { method: "POST", body: JSON.stringify({ action: "assign", publicationId, targetType: "class", targetId: classId, ...options }) });
    },
    withdrawPublication(publicationId: string, reason?: string) {
      return request<unknown>("/api/pedagogical-publications", { method: "POST", body: JSON.stringify({ action: "withdraw", publicationId, reason }) });
    },
    listPublications(resourceId?: string) {
      const query = resourceId ? `?resourceId=${encodeURIComponent(resourceId)}` : "";
      return request<{ items: Array<{ id: string; resource_id: string; version_id: string; state: string; activity_mode: string; published_at: string; available_until?: string; pedagogical_assignments?: Array<{ id: string; target_type: string; target_id: string }> }> }>(`/api/pedagogical-publications${query}`);
    },
    publicationTracking(publicationId: string) {
      return request<{ items: Array<Record<string, unknown>>; summary: { learners: number; started: number; submitted: number; pendingReview: number } }>(`/api/pedagogical-publications?publicationId=${encodeURIComponent(publicationId)}&tracking=true`);
    },
    exportPdf(versionId: string, audience: "student" | "teacher") {
      return request<{ fileName: string; mimeType: "application/pdf"; contentBase64: string; sha256: string; byteLength: number }>("/api/pedagogical-export", { method: "POST", body: JSON.stringify({ versionId, audience, includeAnswerSpaces: true, includeRubrics: true, includeTeacherComments: true }) });
    },
    submitGeneration(generationRequest: PedagogicalGenerationRequest, idempotencyKey: string) {
      return request<GenerationJob>("/api/pedagogical-generation", { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ action: "submit", request: generationRequest }) });
    },
    generationStatus(generationId: string) {
      return request<GenerationJob>(`/api/pedagogical-generation?generationId=${encodeURIComponent(generationId)}`);
    },
    processGeneration(generationId: string) {
      return request<GenerationJob>("/api/pedagogical-generation", { method: "POST", body: JSON.stringify({ action: "process", generationId }) });
    },
    generationAction(generationId: string, action: "cancel" | "retry") {
      return request<GenerationJob>("/api/pedagogical-generation", { method: "POST", body: JSON.stringify({ action, generationId }) });
    },
  };
}

