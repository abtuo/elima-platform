import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PrintableStudentViewSchema, projectPrintableTeacherView } from "../../../../packages/pedagogy/src/index.ts";
import { authorizeRevisionRequest } from "../revisionAiQuota.mjs";
import { handleRevisionCors } from "../revisionCors.mjs";
import { PedagogicalApiError } from "../pedagogy/authorization.mjs";
import { createPedagogicalResourceService } from "../pedagogy/service.mjs";
import { createSupabasePedagogyRepository, resolvePedagogicalActor } from "../pedagogy/supabaseRepository.mjs";
import { buildPedagogicalPdf } from "../pedagogy/pdf/service.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeFileName(value) {
  const stem = String(value ?? "support").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "support";
  return `${stem}.pdf`;
}

export function createHandler(dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const createSupabaseClient = dependencies.createClient ?? createClient;
  const authorize = dependencies.authorize ?? ((request) => authorizeRevisionRequest(request, { env, createSupabaseClient }));
  return async function pedagogicalExport(request, response) {
    try {
      if (handleRevisionCors(request, response, ["POST"], env.REVISION_ALLOWED_ORIGINS)) return;
      if (request.method !== "POST") return response.status(405).json({ code: "method_not_allowed", message: "Méthode non autorisée." });
      const payload = request.body && typeof request.body === "object" ? request.body : {};
      if (!UUID.test(String(payload.versionId ?? ""))) throw new PedagogicalApiError("versionId invalide.", 400, "invalid_request");
      if (!['student', 'teacher'].includes(payload.audience)) throw new PedagogicalApiError("audience invalide.", 400, "invalid_request");
      const authorized = await authorize(request);
      const actor = dependencies.actor ? await dependencies.actor(authorized, payload) : await resolvePedagogicalActor(authorized.admin, authorized.user.id, payload.schoolId);
      const repository = dependencies.repository ?? createSupabasePedagogyRepository(authorized.admin);
      const resourceService = dependencies.resourceService ?? createPedagogicalResourceService(repository);
      const teacher = payload.audience === "teacher";
      const detail = await resourceService.getVersion(actor, payload.versionId, { includePrivate: teacher });
      if (!detail.version?.view) throw new PedagogicalApiError("Version pédagogique introuvable.", 404, "pedagogical_version_not_found");
      const printView = teacher
        ? projectPrintableTeacherView({ document: detail.version.view.document, secrets: detail.version.view.secrets }, { includeRubrics: payload.includeRubrics !== false, includeTeacherComments: payload.includeTeacherComments !== false })
        : PrintableStudentViewSchema.parse({ audience: "student_print", document: detail.version.view.document, print: { includeAnswerSpaces: payload.includeAnswerSpaces !== false } });
      const bytes = await (dependencies.buildPdf ?? buildPedagogicalPdf)(printView, { generatedAt: dependencies.generatedAt?.() ?? new Date() });
      const suffix = teacher ? "enseignant" : "eleve";
      const fileName = safeFileName(`${detail.resource.title}-${suffix}-v${detail.version.versionNumber}`);
      return response.status(200).json({
        fileName, mimeType: "application/pdf", audience: payload.audience,
        versionId: detail.version.id, contentBase64: Buffer.from(bytes).toString("base64"),
        sha256: createHash("sha256").update(bytes).digest("hex"), byteLength: bytes.length,
      });
    } catch (error) {
      const known = error instanceof PedagogicalApiError || Number(error?.statusCode) < 500;
      return response.status(known ? Number(error.statusCode) || 400 : 500).json({ code: known ? String(error.code ?? "pedagogical_error") : "pedagogical_export_failed", message: known ? error.message : "La génération du PDF a échoué." });
    }
  };
}

export default createHandler();
