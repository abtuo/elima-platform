import { createClient } from "@supabase/supabase-js";
import { authorizeRevisionRequest } from "../revisionAiQuota.mjs";
import { handleRevisionCors } from "../revisionCors.mjs";
import { PedagogicalApiError } from "./authorization.mjs";
import { createPedagogicalResourceService } from "./service.mjs";
import { createSupabasePedagogyRepository, resolvePedagogicalActor } from "./supabaseRepository.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function object(value, name = "payload") {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PedagogicalApiError(`${name} invalide.`, 400, "invalid_request");
  return value;
}

function uuid(value, name) {
  const parsed = String(value ?? "");
  if (!UUID.test(parsed)) throw new PedagogicalApiError(`${name} invalide.`, 400, "invalid_request");
  return parsed;
}

function oneOf(value, choices, name) {
  if (!choices.includes(value)) throw new PedagogicalApiError(`${name} invalide.`, 400, "invalid_request");
  return value;
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new PedagogicalApiError(`${name} invalide.`, 400, "invalid_request");
  return parsed;
}

function optionalDate(value, name) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new PedagogicalApiError(`${name} invalide.`, 400, "invalid_request");
  return parsed.toISOString();
}

function query(request) {
  const url = new URL(request.url ?? "/", "http://api.local");
  return { ...Object.fromEntries(url.searchParams), ...(request.query ?? {}) };
}

function body(request) {
  return object(request.body ?? {});
}

function errorResponse(response, error) {
  const known = error instanceof PedagogicalApiError || Number(error?.statusCode) < 500;
  const status = known ? Number(error.statusCode) || 400 : 500;
  return response.status(status).json({
    code: known ? String(error.code ?? "pedagogical_error") : "pedagogical_service_unavailable",
    message: known ? error.message : "Le service pédagogique est momentanément indisponible.",
    ...(known && error.details ? { details: error.details } : {}),
  });
}

export function createPedagogicalHandler(domain, dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const createSupabaseClient = dependencies.createClient ?? createClient;
  const authorize = dependencies.authorize ?? ((request) => authorizeRevisionRequest(request, { env, createSupabaseClient }));
  return async function handler(request, response) {
    try {
      const methods = ["GET", "POST"];
      if (handleRevisionCors(request, response, methods, env.REVISION_ALLOWED_ORIGINS)) return;
      if (!methods.includes(request.method)) throw new PedagogicalApiError("Méthode non autorisée.", 405, "method_not_allowed");
      const authorized = await authorize(request);
      const payload = request.method === "GET" ? query(request) : body(request);
      const actor = dependencies.actor
        ? await dependencies.actor(authorized, payload)
        : await resolvePedagogicalActor(authorized.admin, authorized.user.id, payload.schoolId);
      const repository = dependencies.repository ?? createSupabasePedagogyRepository(authorized.admin);
      const service = dependencies.service ?? createPedagogicalResourceService(repository, dependencies.clock);

      if (domain === "resources") {
        if (request.method === "GET" && payload.resourceId) {
          const result = await service.getResource(actor, uuid(payload.resourceId, "resourceId"), { includePrivate: payload.includePrivate === "true" });
          return response.status(200).json(result);
        }
        if (request.method === "GET") return response.status(200).json(await service.listResources(actor, payload));
        const action = oneOf(payload.action ?? "create", ["create", "update", "archive"], "action");
        if (action === "create") return response.status(201).json(await service.createResource(actor, { bundle: object(payload.bundle, "bundle"), visibility: oneOf(payload.visibility ?? "private", ["private", "school"], "visibility") }));
        if (action === "update") return response.status(200).json(await service.updateDraft(actor, {
          resourceId: uuid(payload.resourceId, "resourceId"), versionId: uuid(payload.versionId, "versionId"),
          expectedLockVersion: positiveInteger(payload.expectedLockVersion, "expectedLockVersion"), bundle: object(payload.bundle, "bundle"),
        }));
        return response.status(200).json(await service.archiveResource(actor, uuid(payload.resourceId, "resourceId")));
      }

      if (domain === "versions") {
        if (request.method === "GET" && payload.versionId) {
          return response.status(200).json(await service.getVersion(actor, uuid(payload.versionId, "versionId"), { includePrivate: payload.includePrivate === "true" }));
        }
        if (request.method === "GET") return response.status(200).json({ items: await service.listVersions(actor, uuid(payload.resourceId, "resourceId")) });
        const action = oneOf(payload.action ?? "create", ["create", "submit"], "action");
        if (action === "submit") return response.status(200).json(await service.submitForReview(actor, uuid(payload.versionId, "versionId")));
        return response.status(201).json(await service.createVersion(actor, { resourceId: uuid(payload.resourceId, "resourceId"), bundle: payload.bundle }));
      }

      if (domain === "validation") {
        if (request.method === "GET") return response.status(200).json({ items: await service.getReviews(actor, uuid(payload.versionId, "versionId")) });
        const action = oneOf(payload.action ?? "run", ["run", "decide"], "action");
        if (action === "run") return response.status(200).json(await service.validateVersion(actor, uuid(payload.versionId, "versionId")));
        return response.status(200).json(await service.decideReview(actor, {
          versionId: uuid(payload.versionId, "versionId"),
          decision: oneOf(payload.decision, ["approve", "reject"], "decision"),
          reasons: Array.isArray(payload.reasons) ? payload.reasons.map(String).slice(0, 20) : [],
        }));
      }

      if (request.method === "GET" && payload.publicationId && payload.tracking === "true") {
        return response.status(200).json(await service.publicationTracking(actor, uuid(payload.publicationId, "publicationId")));
      }
      if (request.method === "GET") return response.status(200).json(await service.listPublications(actor, payload));
      const action = oneOf(payload.action ?? "publish", ["publish", "assign", "withdraw"], "action");
      if (action === "withdraw") return response.status(200).json(await service.withdrawPublication(actor, {
        publicationId: uuid(payload.publicationId, "publicationId"), reason: payload.reason ? String(payload.reason).slice(0, 1000) : null,
      }));
      if (action === "publish") return response.status(201).json(await service.publishVersion(actor, {
        versionId: uuid(payload.versionId, "versionId"),
        channel: oneOf(payload.channel, ["revision", "student_pdf", "teacher_pdf", "api"], "channel"),
        correctionsPolicy: oneOf(payload.correctionsPolicy ?? "teacher_only", ["teacher_only", "after_due_date", "after_submission", "never"], "correctionsPolicy"),
        availableFrom: optionalDate(payload.availableFrom, "availableFrom"), availableUntil: optionalDate(payload.availableUntil, "availableUntil"),
        activityMode: oneOf(payload.activityMode ?? "training", ["training", "evaluation"], "activityMode"),
        audience: oneOf(payload.audience ?? "assigned", ["assigned", "school"], "audience"),
        maxAttempts: payload.maxAttempts == null ? null : positiveInteger(payload.maxAttempts, "maxAttempts"),
        revealAfterAttempts: payload.revealAfterAttempts == null ? null : positiveInteger(payload.revealAfterAttempts, "revealAfterAttempts"),
      }));
      return response.status(201).json(await service.createAssignment(actor, {
        publicationId: uuid(payload.publicationId, "publicationId"),
        targetType: oneOf(payload.targetType, ["class", "student"], "targetType"),
        targetId: uuid(payload.targetId, "targetId"), correctionsPolicy: payload.correctionsPolicy,
        availableFrom: optionalDate(payload.availableFrom, "availableFrom"), availableUntil: optionalDate(payload.availableUntil, "availableUntil"),
        activityMode: payload.activityMode == null ? null : oneOf(payload.activityMode, ["training", "evaluation"], "activityMode"),
        maxAttempts: payload.maxAttempts == null ? null : positiveInteger(payload.maxAttempts, "maxAttempts"),
        revealAfterAttempts: payload.revealAfterAttempts == null ? null : positiveInteger(payload.revealAfterAttempts, "revealAfterAttempts"),
      }));
    } catch (error) {
      return errorResponse(response, error);
    }
  };
}

