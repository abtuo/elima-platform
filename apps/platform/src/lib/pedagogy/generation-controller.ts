import { PedagogicalGenerationRequestSchema, type PedagogicalGenerationRequest } from "@elima/pedagogy";
import type { PedagogicalApi } from "./client";
import type { GenerationJob, GenerationStep } from "./types";

export const GENERATION_STEPS: Array<{ id: GenerationStep; label: string }> = [
  { id: "plan", label: "Préparation du plan" },
  { id: "content", label: "Rédaction du cours" },
  { id: "exercises", label: "Création des exercices" },
  { id: "corrections", label: "Génération des corrigés" },
  { id: "validate", label: "Vérification pédagogique" },
  { id: "persist", label: "Enregistrement" },
];

export function validateGenerationRequest(input: unknown) {
  return PedagogicalGenerationRequestSchema.safeParse(input);
}

export function generationIdempotencyKey(request: PedagogicalGenerationRequest, nonce = Date.now()) {
  const signature = [request.subject, request.level, request.chapter, nonce].join("|");
  let hash = 2166136261;
  for (let index = 0; index < signature.length; index += 1) hash = Math.imul(hash ^ signature.charCodeAt(index), 16777619);
  return `platform-${nonce}-${(hash >>> 0).toString(16)}`;
}

export const GENERATION_STORAGE_KEY = "elima.pedagogical-generation-ids.v1";

export function loadGenerationIds(storage: Pick<Storage, "getItem">): string[] {
  try {
    const parsed = JSON.parse(storage.getItem(GENERATION_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string").slice(0, 20) : [];
  } catch { return []; }
}

export function rememberGenerationId(storage: Pick<Storage, "getItem" | "setItem">, id: string) {
  storage.setItem(GENERATION_STORAGE_KEY, JSON.stringify([id, ...loadGenerationIds(storage).filter((value) => value !== id)].slice(0, 20)));
}

export async function advanceGeneration(api: Pick<PedagogicalApi, "generationStatus" | "processGeneration">, id: string): Promise<GenerationJob> {
  const status = await api.generationStatus(id);
  if (!["queued", "running"].includes(status.status)) return status;
  try {
    return await api.processGeneration(id);
  } catch (error) {
    const clientError = error as { status?: number; retryAfterMs?: number };
    if (clientError && (clientError.status === 409 || clientError.status === 429)) {
      await new Promise((resolve) => setTimeout(resolve, clientError.retryAfterMs ?? 1_500));
      return api.generationStatus(id);
    }
    throw error;
  }
}

