import { Buffer } from "node:buffer";
import { createClient } from "@supabase/supabase-js";
import { handleRevisionCors } from "../server/revisionCors.mjs";
import { createPedagogicalAnalysis, documentError, extractDocument } from "../server/revisionDocumentService.mjs";

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_BYTES = 3 * 1024 * 1024;

export function createHandler(dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const createSupabaseClient = dependencies.createClient ?? createClient;
  const extract = dependencies.extractDocument ?? ((bytes, mimeType) => extractDocument(bytes, mimeType, { env }));
  const structure = dependencies.createPedagogicalAnalysis ?? ((extraction, input) => createPedagogicalAnalysis(extraction, input, { env }));

  return async function handler(request, response) {
    if (handleRevisionCors(request, response, ["POST"])) return;
    if (request.method !== "POST") return response.status(405).json({ code: "method_not_allowed", message: "Méthode non autorisée." });
    try {
      const config = revisionConfig(env);
      const token = bearerToken(request);
      if (!token) throw documentError(401, "authentication_required", "Connexion requise.");
      const publicClient = createSupabaseClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const authenticated = await publicClient.auth.getUser(token);
      if (authenticated.error || !authenticated.data.user) throw documentError(401, "invalid_session", "Session invalide ou expirée.");

      const body = jsonBody(request);
      const mimeType = String(body.mimeType ?? "").toLowerCase();
      if (!ALLOWED_TYPES.has(mimeType)) throw documentError(415, "invalid_document_format", "Format incorrect. Utilise un PDF, JPEG ou PNG.");
      const bytes = decodeBase64(body.contentBase64);
      if (!bytes.length || bytes.length > MAX_BYTES) throw documentError(413, "document_too_large", "Le document doit peser moins de 3 Mo.");
      const fileName = clean(body.fileName, 180) || "document";
      const level = clean(body.level, 80);
      const selectedSubjects = Array.isArray(body.selectedSubjects) ? body.selectedSubjects.map(value => clean(value, 80)).filter(Boolean).slice(0, 20) : [];

      const extraction = await extract(bytes, mimeType);
      const analysis = await structure(extraction, { fileName, level, selectedSubjects });
      const admin = createSupabaseClient(config.url, config.secret, { auth: { persistSession: false, autoRefreshToken: false } });
      const inserted = await admin.from("revision_documents").insert({
        user_id: authenticated.data.user.id,
        file_name: fileName,
        mime_type: mimeType,
        title: analysis.title,
        subject_label: analysis.detectedSubject || null,
        student_level: level || null,
        detected_level: analysis.detectedLevel || null,
        document_type: analysis.documentType || null,
        status: "ready",
        analysis,
      }).select("id,created_at").single();
      if (inserted.error || !inserted.data) throw documentError(503, "document_storage_unavailable", "Impossible d’enregistrer l’analyse.");
      return response.status(201).json({ id: inserted.data.id, createdAt: inserted.data.created_at, status: "ready", analysis });
    } catch (error) {
      return response.status(error?.statusCode ?? 500).json({ code: error?.code ?? "document_analysis_error", message: error instanceof Error ? error.message : "Analyse impossible." });
    }
  };
}

function revisionConfig(env) {
  const url = String(env.REVISION_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const publishableKey = env.REVISION_SUPABASE_PUBLISHABLE_KEY || env.REVISION_SUPABASE_ANON_KEY;
  const secret = env.REVISION_SUPABASE_SECRET_KEY || env.REVISION_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !secret) throw documentError(503, "revision_configuration_missing", "Configuration Révision serveur incomplète.");
  return { url, publishableKey, secret };
}
function bearerToken(request) { const value = String(request.headers.authorization ?? ""); return value.startsWith("Bearer ") ? value.slice(7).trim() : ""; }
function jsonBody(request) { if (request.body && typeof request.body === "object") return request.body; try { return JSON.parse(request.body || "{}"); } catch { throw documentError(400, "invalid_payload", "Payload invalide."); } }
function decodeBase64(value) { const raw = String(value ?? ""); if (!raw || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) throw documentError(400, "invalid_document", "Document invalide."); return Buffer.from(raw, "base64"); }
function clean(value, max) { return String(value ?? "").replace(/[<>\u0000]/g, "").trim().slice(0, max); }

export default createHandler();
