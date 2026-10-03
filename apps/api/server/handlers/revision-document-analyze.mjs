import { Buffer } from "node:buffer";
import { createClient } from "@supabase/supabase-js";
import { handleRevisionCors } from "../revisionCors.mjs";
import { createPedagogicalAnalysis, documentError, extractDocument } from "../revisionDocumentService.mjs";
import { applyRevisionApiError, authorizeRevisionRequest, consumeRevisionAiQuota } from "../revisionAiQuota.mjs";
import { reserveRevisionQuota, refundFailedRevisionQuota } from "../revisionEntitlement.mjs";

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_BYTES = 10 * 1024 * 1024;
const UPLOAD_BUCKET = "revision-document-uploads";

export function createHandler(dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const createSupabaseClient = dependencies.createClient ?? createClient;
  const authorize = dependencies.authorize ?? ((request) => authorizeRevisionRequest(request, { env, createSupabaseClient }));
  const consumeQuota = dependencies.consumeQuota ?? consumeRevisionAiQuota;
  const consumeEntitlement = dependencies.consumeEntitlement ?? reserveRevisionQuota;
  const extract = dependencies.extractDocument ?? ((bytes, mimeType) => extractDocument(bytes, mimeType, { env }));
  const structure = dependencies.createPedagogicalAnalysis ?? ((extraction, input) => createPedagogicalAnalysis(extraction, input, { env }));

  return async function handler(request, response) {
    if (handleRevisionCors(request, response, ["POST"])) return;
    if (request.method !== "POST") return response.status(405).json({ code: "method_not_allowed", message: "Méthode non autorisée." });
    let uploadedPath = "";
    let admin = null;
    let reservation;
    try {
      const authorized = await authorize(request);
      admin = authorized.admin;

      const body = jsonBody(request);
      const mimeType = String(body.mimeType ?? "").toLowerCase();
      if (!ALLOWED_TYPES.has(mimeType)) throw documentError(415, "invalid_document_format", "Format incorrect. Utilise un PDF, JPEG ou PNG.");
      const fileName = clean(body.fileName, 180) || "document";
      const storagePath = cleanStoragePath(body.storagePath, authorized.user.id);
      uploadedPath = storagePath;
      const bytes = storagePath ? await downloadUpload(admin, storagePath) : decodeBase64(body.contentBase64);
      if (!bytes.length || bytes.length > MAX_BYTES) throw documentError(413, "document_too_large", "Le document doit peser 10 Mo maximum.");
      if (!matchesFileSignature(bytes, mimeType)) throw documentError(415, "invalid_document_signature", "Le contenu du fichier ne correspond pas à son format annoncé.");
      const level = clean(body.level, 80);
      const selectedSubjects = Array.isArray(body.selectedSubjects) ? body.selectedSubjects.map(value => clean(value, 80)).filter(Boolean).slice(0, 20) : [];
      await consumeQuota(admin, authorized.user.id, {
        action: "revision_document_analyze",
        windowSeconds: 60 * 60,
        windowLimit: 30,
        dailyLimit: 100,
      });
      reservation = await consumeEntitlement(admin, authorized.user.id, "document_scan");

      const extraction = await extract(bytes, mimeType);
      const analysis = await structure(extraction, { fileName, level, selectedSubjects });
      reservation = null; // A produced analysis remains consumed, even if persistence fails.
      const inserted = await admin.from("revision_documents").insert({
        user_id: authorized.user.id,
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
      if (inserted.error || !inserted.data) throw documentError(503, "document_storage_unavailable", "Impossible d’enregistrer l’analyse pour le moment.");
      return response.status(201).json({ id: inserted.data.id, createdAt: inserted.data.created_at, status: "ready", analysis });
    } catch (error) {
      try { await refundFailedRevisionQuota(admin,reservation,error); } catch (refundError) { error=refundError; }
      return applyRevisionApiError(response, error, "L’analyse du document est momentanément indisponible.");
    } finally {
      if (admin && uploadedPath) {
        const removed = await admin.storage.from(UPLOAD_BUCKET).remove([uploadedPath]);
        if (removed.error) console.error("revision_document_cleanup_failed", { code: String(removed.error.code ?? "storage_error") });
      }
    }
  };
}

async function downloadUpload(admin, storagePath) {
  const downloaded = await admin.storage.from(UPLOAD_BUCKET).download(storagePath);
  if (downloaded.error || !downloaded.data) throw documentError(400, "document_upload_missing", "Le document importé est introuvable. Importe-le à nouveau.");
  return Buffer.from(await downloaded.data.arrayBuffer());
}

function cleanStoragePath(value, userId) {
  const path = String(value ?? "").trim();
  if (!path) return "";
  if (path.length > 300 || path.includes("..") || !path.startsWith(`${userId}/`) || !/^[A-Za-z0-9_./-]+$/.test(path)) {
    throw documentError(400, "invalid_storage_path", "Référence de document invalide.");
  }
  return path;
}

export function matchesFileSignature(bytes, mimeType) {
  if (mimeType === "application/pdf") return bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return false;
}

function jsonBody(request) { if (request.body && typeof request.body === "object") return request.body; try { return JSON.parse(request.body || "{}"); } catch { throw documentError(400, "invalid_payload", "Payload invalide."); } }
function decodeBase64(value) { const raw = String(value ?? ""); if (!raw || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) throw documentError(400, "invalid_document", "Document invalide."); return Buffer.from(raw, "base64"); }
function clean(value, max) { return String(value ?? "").replace(/[<>\u0000]/g, "").trim().slice(0, max); }

export default createHandler();
