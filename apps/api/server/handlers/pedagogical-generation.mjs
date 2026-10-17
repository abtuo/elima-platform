import { createClient } from "@supabase/supabase-js";
import { authorizeRevisionRequest } from "../revisionAiQuota.mjs";
import { handleRevisionCors } from "../revisionCors.mjs";
import { PedagogicalApiError } from "../pedagogy/authorization.mjs";
import { createSupabasePedagogyRepository, resolvePedagogicalActor } from "../pedagogy/supabaseRepository.mjs";
import { createPedagogicalResourceService } from "../pedagogy/service.mjs";
import { createAzurePedagogicalGenerationClient } from "../pedagogy/generation/azureClient.mjs";
import { createPedagogicalGenerationService } from "../pedagogy/generation/service.mjs";
import { createSupabaseGenerationRepository } from "../pedagogy/generation/supabaseRepository.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function jobId(value) { const id = String(value ?? ""); if (!UUID.test(id)) throw new PedagogicalApiError("generationId invalide.", 400, "invalid_request"); return id; }
function payload(request) { if (request.method === "GET") return { ...Object.fromEntries(new URL(request.url ?? "/", "http://api.local").searchParams), ...(request.query ?? {}) }; return request.body && typeof request.body === "object" ? request.body : {}; }

export function createHandler(dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const createSupabaseClient = dependencies.createClient ?? createClient;
  const authorize = dependencies.authorize ?? ((request) => authorizeRevisionRequest(request, { env, createSupabaseClient }));
  return async function handler(request, response) {
    if (handleRevisionCors(request, response, ["GET", "POST"], env.REVISION_ALLOWED_ORIGINS)) return;
    try {
      if (!["GET", "POST"].includes(request.method)) throw new PedagogicalApiError("Méthode non autorisée.", 405, "method_not_allowed");
      const authorized = await authorize(request);
      const input = payload(request);
      const actor = dependencies.actor ? await dependencies.actor(authorized, input) : await resolvePedagogicalActor(authorized.admin, authorized.user.id);
      const generationRepository = dependencies.generationRepository ?? createSupabaseGenerationRepository(authorized.admin);
      const resourceRepository = dependencies.resourceRepository ?? createSupabasePedagogyRepository(authorized.admin);
      const resourceService = dependencies.resourceService ?? createPedagogicalResourceService(resourceRepository);
      const service = dependencies.generationService ?? createPedagogicalGenerationService({
        repository: generationRepository,
        aiClient: dependencies.aiClient ?? createAzurePedagogicalGenerationClient({ env }),
        resourceService,
      });
      if (request.method === "GET") return response.status(200).json(await service.status(actor, jobId(input.generationId), { includePrivate: input.includePrivate === "true" }));
      const action = String(input.action ?? "submit");
      if (action === "submit") {
        const key = request.headers?.["idempotency-key"] ?? input.idempotencyKey;
        return response.status(202).json(await service.submit(actor, input.request, key));
      }
      if (action === "process") return response.status(200).json(await service.processNextStep(actor, jobId(input.generationId)));
      if (action === "cancel") return response.status(200).json(await service.cancel(actor, jobId(input.generationId)));
      if (action === "retry") return response.status(200).json(await service.retry(actor, jobId(input.generationId)));
      throw new PedagogicalApiError("Action de génération inconnue.", 400, "invalid_request");
    } catch (error) {
      const known = error instanceof PedagogicalApiError || Number(error?.statusCode) < 500;
      return response.status(known ? Number(error.statusCode) || 400 : 500).json({
        code: known ? String(error.code ?? "pedagogical_generation_error") : "pedagogical_generation_unavailable",
        message: known ? error.message : "La génération pédagogique est momentanément indisponible.",
        ...(known && error.details ? { details: error.details } : {}),
      });
    }
  };
}

export default createHandler();

