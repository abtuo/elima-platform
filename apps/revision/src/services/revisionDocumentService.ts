import { apiFetch } from "./api/apiClient";
import { mainDbClient } from "./mainDbClient";
import { subjectIdFromLabel } from "@/lib/revisionSubjects";

export type DocumentAnalysis = {
  title: string; detectedSubject: string; detectedLevel: string; documentType: string; summary: string;
  concepts: string[]; explanations: string[]; keyPoints: string[]; vocabulary: string[]; sourceWarnings: string[]; extractedText: string;
};

export type RevisionDocument = {
  id: string; fileName: string; status: "analyzing" | "ready" | "error"; subjectId?: string; subject: string; title: string;
  studentLevel?: string; quizRef?: string; createdAt: string; analysis: DocumentAnalysis;
};

const DOCUMENT_UPLOAD_BUCKET = "revision-document-uploads";
export const MAX_REVISION_DOCUMENT_BYTES = 10 * 1024 * 1024;
export type PreparedRevisionDocument = { file: File };

export async function prepareRevisionDocument(file: File): Promise<PreparedRevisionDocument> {
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) throw new Error("Utilise un fichier PDF, JPEG ou PNG.");
  const prepared = file.type.startsWith("image/") ? await compressRevisionPhoto(file) : file;
  if (prepared.size > MAX_REVISION_DOCUMENT_BYTES) throw new Error("Le document doit peser 10 Mo maximum.");
  return { file: prepared };
}

export async function analyzeRevisionDocument(prepared: PreparedRevisionDocument, input: { level: string; selectedSubjects: string[] }) {
  if (!mainDbClient) throw new Error("Service indisponible.");
  const token = (await mainDbClient.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error("Session expirée.");
  const user = (await mainDbClient.auth.getUser()).data.user;
  if (!user) throw new Error("Session expirée.");
  const safeName = prepared.file.name.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-120) || "document";
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const uploaded = await mainDbClient.storage.from(DOCUMENT_UPLOAD_BUCKET).upload(storagePath, prepared.file, { contentType: prepared.file.type, upsert: false });
  if (uploaded.error) throw new Error("L’import du document a échoué. Réessaie.");
  try {
    const response = await apiFetch("/api/revision-document-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fileName: prepared.file.name, mimeType: prepared.file.type, storagePath, ...input }),
    });
    const payload = await response.json().catch(() => null) as { id?: string; createdAt?: string; status?: "ready"; analysis?: DocumentAnalysis; message?: string } | null;
    if (!response.ok || !payload?.id || !payload.analysis) throw new Error(payload?.message ?? "Analyse impossible.");
    const subjectId = subjectIdFromLabel(payload.analysis.detectedSubject);
    await mainDbClient.from("revision_documents").update({ subject_id: subjectId }).eq("id", payload.id);
    return { id: payload.id, createdAt: payload.createdAt ?? new Date().toISOString(), status: payload.status ?? "ready", subjectId, analysis: payload.analysis };
  } finally {
    await mainDbClient.storage.from(DOCUMENT_UPLOAD_BUCKET).remove([storagePath]);
  }
}

async function compressRevisionPhoto(file: File) {
  if (typeof createImageBitmap !== "function") return file;
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    if (ratio === 1 && file.size <= 2 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.(png|jpe?g)$/i, "") || "photo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } finally { bitmap.close(); }
}

export async function getRevisionDocuments(userId: string): Promise<RevisionDocument[]> {
  if (!mainDbClient) return [];
  const { data, error } = await mainDbClient.from("revision_documents").select("id,file_name,status,subject_id,subject_label,title,student_level,quiz_ref,created_at,analysis").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
  if (error || !data) return [];
  return data.map(row => ({ id: String(row.id), fileName: String(row.file_name), status: row.status as RevisionDocument["status"], subjectId: row.subject_id ? String(row.subject_id) : undefined, subject: String(row.subject_label ?? "Document"), title: String(row.title), studentLevel: row.student_level ? String(row.student_level) : undefined, quizRef: row.quiz_ref ? String(row.quiz_ref) : undefined, createdAt: String(row.created_at), analysis: row.analysis as DocumentAnalysis }));
}

export async function attachDocumentQuiz(documentId: string, quizRef: string) {
  if (!mainDbClient) return;
  await mainDbClient.from("revision_documents").update({ quiz_ref: quizRef, updated_at: new Date().toISOString() }).eq("id", documentId);
}

export async function deleteRevisionDocument(documentId: string) {
  if (!mainDbClient) throw new Error("Service indisponible.");
  const token = (await mainDbClient.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error("Session expirée.");
  const response = await apiFetch("/api/revision-document-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ documentId }),
  });
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  if (!response.ok) throw new Error(payload?.message ?? "La suppression du document est momentanément indisponible.");
}

export function documentAnalysisMarkdown(analysis: DocumentAnalysis) {
  const sections = [`# ${analysis.title}`];
  if (analysis.summary) sections.push(`## Résumé\n\n${analysis.summary}`);
  if (analysis.concepts.length) sections.push(`## Notions importantes\n\n${analysis.concepts.map((item, index) => `${index + 1}. ${item}`).join("\n")}`);
  if (analysis.keyPoints.length) sections.push(`## À retenir\n\n${analysis.keyPoints.map((item) => `- ${item}`).join("\n")}`);
  if (analysis.explanations.length) sections.push(`## Explications\n\n${analysis.explanations.join("\n\n")}`);
  if (analysis.vocabulary.length) sections.push(`## Vocabulaire\n\n${analysis.vocabulary.map((item) => `- ${item}`).join("\n")}`);
  if (analysis.sourceWarnings.length) sections.push(`## Points de vigilance\n\n${analysis.sourceWarnings.map((item) => `> ${item}`).join("\n\n")}`);
  return sections.join("\n\n");
}

function documentSheetRow(userId: string, documentId: string, analysis: DocumentAnalysis, level: string) {
  const subject = analysis.detectedSubject || "Document";
  const normalizedLevel = level.trim() || analysis.detectedLevel || "Collège / lycée";
  return { user_id: userId, cache_key: `document-analysis:${documentId}`, level_id: normalizedLevel, level_label: normalizedLevel, subject_id: subjectIdFromLabel(subject), subject_label: subject, topic: analysis.title, content: documentAnalysisMarkdown(analysis), is_shared: false };
}

export async function saveDocumentAnalysisAsSheet(documentId: string, analysis: DocumentAnalysis, level: string) {
  if (!mainDbClient) throw new Error("Service indisponible.");
  const { data: auth } = await mainDbClient.auth.getUser();
  if (!auth.user) throw new Error("Session expirée.");
  const subject = analysis.detectedSubject || "Document";
  const { data, error } = await mainDbClient.from("user_course_summaries").upsert(documentSheetRow(auth.user.id, documentId, analysis, level), { onConflict: "user_id,cache_key" }).select("id,created_at").single();
  if (error || !data) throw new Error("Impossible d’enregistrer la fiche d’analyse.");
  return { id: String(data.id), title: analysis.title, subject, topic: analysis.title, content: documentAnalysisMarkdown(analysis), createdAt: String(data.created_at).slice(0, 10) };
}

export async function ensureDocumentAnalysisSheets(documents: RevisionDocument[]) {
  if (!mainDbClient || !documents.length) return;
  const { data: auth } = await mainDbClient.auth.getUser();
  if (!auth.user) return;
  const cacheKeys = documents.map((document) => `document-analysis:${document.id}`);
  const { data: existing } = await mainDbClient.from("user_course_summaries").select("cache_key").eq("user_id", auth.user.id).in("cache_key", cacheKeys);
  const existingKeys = new Set((existing ?? []).map((row) => String(row.cache_key)));
  const missing = documents.filter((document) => !existingKeys.has(`document-analysis:${document.id}`));
  if (!missing.length) return;
  await mainDbClient.from("user_course_summaries").insert(missing.map((document) => documentSheetRow(auth.user!.id, document.id, document.analysis, document.studentLevel || document.analysis.detectedLevel)));
}
