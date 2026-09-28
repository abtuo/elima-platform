import { apiFetch } from "./api/apiClient";
import { mainDbClient } from "./mainDbClient";
import { subjectIdFromLabel } from "@/lib/revisionSubjects";

export type DocumentAnalysis = {
  title: string;
  detectedSubject: string;
  detectedLevel: string;
  documentType: string;
  summary: string;
  concepts: string[];
  explanations: string[];
  keyPoints: string[];
  vocabulary: string[];
  sourceWarnings: string[];
  extractedText: string;
};

export type RevisionDocument = {
  id: string;
  fileName: string;
  status: "analyzing" | "ready" | "error";
  subjectId?: string;
  subject: string;
  title: string;
  studentLevel?: string;
  quizRef?: string;
  createdAt: string;
  analysis: DocumentAnalysis;
};

function fileBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du document impossible."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export async function analyzeRevisionDocument(file: File, input: { level: string; selectedSubjects: string[] }, onPrepared?: () => void) {
  if (!mainDbClient) throw new Error("Service indisponible.");
  const token = (await mainDbClient.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error("Session expirée.");
  const contentBase64 = await fileBase64(file);
  onPrepared?.();
  const response = await apiFetch("/api/revision-document-analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fileName: file.name, mimeType: file.type, contentBase64, ...input }),
  });
  const payload = await response.json().catch(() => null) as { id?: string; createdAt?: string; status?: "ready"; analysis?: DocumentAnalysis; message?: string } | null;
  if (!response.ok || !payload?.id || !payload.analysis) throw new Error(payload?.message ?? "Analyse impossible.");
  const subjectId = subjectIdFromLabel(payload.analysis.detectedSubject);
  await mainDbClient.from("revision_documents").update({ subject_id: subjectId }).eq("id", payload.id);
  return { id: payload.id, createdAt: payload.createdAt ?? new Date().toISOString(), status: payload.status ?? "ready", subjectId, analysis: payload.analysis };
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
