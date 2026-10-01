import { createClient } from "@supabase/supabase-js";
import { handleRevisionCors } from "../revisionCors.mjs";
import { authorizeRevisionRequest, RevisionApiError } from "../revisionAiQuota.mjs";

export function createHandler(dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const createSupabaseClient = dependencies.createClient ?? createClient;
  const authorize = dependencies.authorize ?? ((request) => authorizeRevisionRequest(request, { env, createSupabaseClient }));
  return async function handler(request, response) {
    if (handleRevisionCors(request, response, ["POST"])) return;
    if (request.method !== "POST") return response.status(405).json({ code: "method_not_allowed", message: "Méthode non autorisée." });
    try {
      const authorized = await authorize(request);
      const documentId = String(request.body?.documentId ?? "").trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(documentId)) {
        throw new RevisionApiError("Document invalide.", 400, "invalid_document_id");
      }
      const deleted = await authorized.admin.rpc("delete_revision_document", { p_user_id: authorized.user.id, p_document_id: documentId });
      if (deleted.error) throw new RevisionApiError("La suppression du document est momentanément indisponible.", 503, "document_deletion_unavailable");
      if (deleted.data !== true) throw new RevisionApiError("Document introuvable.", 404, "document_not_found");
      return response.status(200).json({ ok: true });
    } catch (error) {
      const status = Number(error?.statusCode) || 500;
      return response.status(status).json({ code: error?.code ?? "document_deletion_failed", message: error?.statusCode ? error.message : "La suppression du document est momentanément indisponible." });
    }
  };
}

export default createHandler();
