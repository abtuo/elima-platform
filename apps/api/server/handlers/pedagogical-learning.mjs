import { createClient } from "@supabase/supabase-js";
import { authorizeRevisionRequest } from "../revisionAiQuota.mjs";
import { handleRevisionCors } from "../revisionCors.mjs";
import { PedagogicalApiError } from "../pedagogy/authorization.mjs";
import { createPedagogicalRevisionService } from "../pedagogy/revision/service.mjs";
import { createSupabasePedagogicalRevisionRepository } from "../pedagogy/revision/supabaseRepository.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function body(request) {
  if (request.body && typeof request.body === "object") return request.body;
  try { return JSON.parse(request.body || "{}"); } catch { return {}; }
}

function uuid(value, name) {
  const parsed = String(value ?? "");
  if (!UUID.test(parsed)) throw new PedagogicalApiError(`${name} invalide.`, 400, "invalid_request");
  return parsed;
}

function key(value, name) {
  const parsed = String(value ?? "").trim();
  if (parsed.length < 8 || parsed.length > 200) throw new PedagogicalApiError(`${name} invalide.`, 400, "invalid_request");
  return parsed;
}

function identifier(value, name) {
  const parsed = String(value ?? "").trim();
  if (!parsed || parsed.length > 200) throw new PedagogicalApiError(`${name} invalide.`, 400, "invalid_request");
  return parsed;
}

export function createHandler(dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const createSupabaseClient = dependencies.createClient ?? createClient;
  const authorize = dependencies.authorize ?? ((request) => authorizeRevisionRequest(request, { env, createSupabaseClient }));
  return async function pedagogicalLearning(request, response) {
    try {
      if (handleRevisionCors(request, response, ["POST"], env.REVISION_ALLOWED_ORIGINS)) return;
      if (request.method !== "POST") return response.status(405).json({ code: "method_not_allowed", message: "Méthode non autorisée." });
      const authorized = await authorize(request);
      const payload = body(request);
      const repository = dependencies.repository ?? createSupabasePedagogicalRevisionRepository(authorized.admin);
      const service = dependencies.service ?? createPedagogicalRevisionService(repository, dependencies.clock);
      const userId = authorized.user.id;
      if (payload.action === "list") return response.status(200).json(await service.list(userId));
      if (payload.action === "content") return response.status(200).json(await service.content(userId, uuid(payload.publicationId, "publicationId")));
      if (payload.action === "start") return response.status(201).json(await service.start(userId, uuid(payload.publicationId, "publicationId"), key(payload.idempotencyKey, "idempotencyKey")));
      if (payload.action === "answer") return response.status(200).json(await service.answer(userId, {
        attemptId: uuid(payload.attemptId, "attemptId"), questionId: identifier(payload.questionId, "questionId"),
        submissionKey: key(payload.submissionKey, "submissionKey"), answer: String(payload.answer ?? "").slice(0, 20000),
        structuredAnswer: payload.structuredAnswer && typeof payload.structuredAnswer === "object" ? payload.structuredAnswer : null,
      }));
      if (payload.action === "submit") return response.status(200).json(await service.submit(userId, uuid(payload.attemptId, "attemptId")));
      throw new PedagogicalApiError("Action invalide.", 400, "invalid_request");
    } catch (error) {
      const known = error instanceof PedagogicalApiError || Number(error?.statusCode) < 500;
      return response.status(known ? Number(error.statusCode) || 400 : 500).json({
        code: known ? String(error.code ?? "pedagogical_error") : "pedagogical_service_unavailable",
        message: known ? error.message : "Le service des supports est momentanément indisponible.",
      });
    }
  };
}

export default createHandler();
