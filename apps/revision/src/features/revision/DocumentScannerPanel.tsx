import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, ChevronDown, FileText, Loader2, Sparkles, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { REVISION_SUBJECT_OPTIONS, subjectIdFromLabel } from "@/lib/revisionSubjects";
import { generateRealtimeQuiz } from "@/services/revisionDataService";
import { analyzeRevisionDocument, attachDocumentQuiz, ensureDocumentAnalysisSheets, getRevisionDocuments, saveDocumentAnalysisAsSheet, type RevisionDocument } from "@/services/revisionDocumentService";
import { getSubjectPreferences, saveSubjectPreferences } from "@/services/subjectPreferencesService";

type ScannerState = "idle" | "ready" | "analysis" | "success" | "error";

export function DocumentScannerPanel() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ScannerState>("idle");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<RevisionDocument[]>([]);
  const [selected, setSelected] = useState<RevisionDocument | null>(null);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);

  useEffect(() => {
    Promise.all([getRevisionDocuments(profile.id), getSubjectPreferences(profile.id)]).then(([nextDocuments, nextSubjects]) => {
      setDocuments(nextDocuments); setSubjectIds(nextSubjects);
        void ensureDocumentAnalysisSheets(nextDocuments).catch(() => undefined);
    });
  }, [profile.id]);

  function prepareUpload(file?: File) {
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) { setState("error"); setError("Format incorrect. Utilise un PDF, JPEG ou PNG."); return; }
    if (file.size > 3 * 1024 * 1024) { setState("error"); setError("Le document doit peser moins de 3 Mo."); return; }
    setPendingFile(file);
    setSelected(null);
    setError("");
    setState("ready");
  }

  async function analyzePendingDocument() {
    if (!pendingFile) return;
    setError(""); setState("analysis");
    try {
      const result = await analyzeRevisionDocument(pendingFile, {
        level: profile.className || profile.schoolLevelId || "",
        selectedSubjects: REVISION_SUBJECT_OPTIONS.filter(item => subjectIds.includes(item.id)).map(item => item.label),
      });
      const document: RevisionDocument = { id: result.id, fileName: pendingFile.name, status: "ready", subjectId: result.subjectId, subject: result.analysis.detectedSubject || "Document", title: result.analysis.title, studentLevel: profile.className || profile.schoolLevelId || undefined, createdAt: result.createdAt, analysis: result.analysis };
      await saveDocumentAnalysisAsSheet(result.id, result.analysis, profile.className || profile.schoolLevelId || result.analysis.detectedLevel);
      setDocuments(current => [document, ...current]); setSelected(document); setPendingFile(null); setState("success");
    } catch (caught) { setState("ready"); setError(caught instanceof Error ? caught.message : "Erreur serveur pendant l’analyse."); }
  }

  async function createQuiz() {
    if (!selected) return;
    setQuizLoading(true); setError("");
    try {
      const sourceContext = [
        `Résumé : ${selected.analysis.summary}`,
        `Notions : ${selected.analysis.concepts.join(" ; ")}`,
        `Points clés : ${selected.analysis.keyPoints.join(" ; ")}`,
        `Explications : ${selected.analysis.explanations.join(" ; ")}`,
      ].filter((value) => !value.endsWith(": ")).join("\n");
      const generated = await generateRealtimeQuiz({ subject: selected.subject, topic: `Révision des notions · ${selected.title}`, level: profile.className || profile.schoolLevelId || "Collège / lycée", source: "document", sourceContext }, `${profile.id}|${crypto.randomUUID()}`);
      await attachDocumentQuiz(selected.id, generated.id);
      navigate(`/student/reviser/quiz?id=${encodeURIComponent(generated.id)}&subject=${encodeURIComponent(selected.subject)}&topic=${encodeURIComponent(`Révision des notions · ${selected.title}`)}&source=document&documentId=${encodeURIComponent(selected.id)}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Création du quiz impossible."); }
    finally { setQuizLoading(false); }
  }

  async function addDetectedSubject() {
    if (!selected) return;
    const id = subjectIdFromLabel(selected.subject);
    const next = [...new Set([...subjectIds, id])];
    await saveSubjectPreferences(next); setSubjectIds(next);
  }

  const detectedSubjectId = selected ? subjectIdFromLabel(selected.subject) : "";
  const shouldOfferSubject = Boolean(selected && detectedSubjectId !== "autre" && subjectIds.length && !subjectIds.includes(detectedSubjectId));

  return <div className="space-y-5">
    <section className="card p-5 sm:p-6">
      <div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-revision/10 text-revision"><Camera className="h-6 w-6" /></span><div><h2 className="font-title text-xl font-semibold text-accent">Scanner un document</h2><p className="mt-1 text-sm leading-6 text-gray-500">Ajoute un cours, un devoir ou une fiche. Elima t’aide à comprendre les notions importantes.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => cameraInput.current?.click()} className="tap flex items-center justify-center gap-2 rounded-2xl bg-revision px-4 py-3 text-sm font-semibold text-white"><Camera className="h-4 w-4" />Prendre une photo</button><button type="button" onClick={() => fileInput.current?.click()} className="tap flex items-center justify-center gap-2 rounded-2xl border border-revision/20 bg-white px-4 py-3 text-sm font-semibold text-revision"><Upload className="h-4 w-4" />Importer un document</button></div>
      <input ref={cameraInput} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={(event) => { prepareUpload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      <input ref={fileInput} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(event) => { prepareUpload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      {state === "ready" && pendingFile ? <div className="mt-5 rounded-2xl border border-revision/10 bg-revision/5 p-4"><div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-revision" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-accent">{pendingFile.name}</p><p className="mt-1 text-xs text-gray-500">Document importé · {(pendingFile.size / 1024 / 1024).toFixed(1)} Mo</p></div></div><button type="button" onClick={() => void analyzePendingDocument()} className="tap mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white"><Sparkles className="h-4 w-4" />Analyser</button><p className="mt-2 text-center text-xs text-gray-500">L’analyse ne commencera qu’après ce clic.</p></div> : null}
      {state === "analysis" ? <div className="mt-5 rounded-2xl bg-revision/5 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-revision"><Loader2 className="h-4 w-4 animate-spin" />Analyse du document…</p><p className="mt-2 text-xs text-gray-500">Extraction → compréhension → préparation des explications</p></div> : null}
      {state === "error" || error ? <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p> : null}
    </section>

    {selected ? <DocumentResult document={selected} shouldOfferSubject={shouldOfferSubject} onAddSubject={() => void addDetectedSubject()} onCreateQuiz={() => void createQuiz()} quizLoading={quizLoading} /> : null}

    <section><h2 className="font-title text-lg font-semibold text-accent">Mes documents</h2><div className="mt-3 space-y-3">{documents.length ? documents.map(document => <button type="button" key={document.id} onClick={() => { setSelected(document); setState("success"); }} className="card tap flex w-full items-center gap-3 p-4 text-left"><FileText className="h-5 w-5 shrink-0 text-revision" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-accent">{document.title}</span><span className="block text-xs text-gray-500">{document.subject} · {new Date(document.createdAt).toLocaleDateString("fr-FR")}</span></span><span className="text-[11px] font-semibold text-primary">{document.quizRef ? "Quiz créé" : "Analysé"}</span></button>) : <div className="card p-5 text-sm text-gray-500">Tes documents analysés apparaîtront ici.</div>}</div></section>
  </div>;
}

function DocumentResult({ document, shouldOfferSubject, onAddSubject, onCreateQuiz, quizLoading }: { document: RevisionDocument; shouldOfferSubject: boolean; onAddSubject: () => void; onCreateQuiz: () => void; quizLoading: boolean }) {
  const analysis = document.analysis;
  return <section className="card border border-primary/10 p-5 sm:p-6"><div className="flex items-center gap-2 text-primary"><CheckCircle2 className="h-5 w-5" /><p className="text-sm font-semibold">J’ai analysé ton document</p></div><h2 className="mt-3 font-title text-2xl font-semibold text-accent">{analysis.title}</h2><p className="mt-1 text-sm text-gray-500">{analysis.detectedSubject}{document.studentLevel ? ` · ${document.studentLevel}` : ""}</p><p className="mt-3 flex items-center gap-2 rounded-2xl bg-primary/5 px-4 py-3 text-xs font-semibold text-primary"><FileText className="h-4 w-4" />Analyse enregistrée dans tes fiches</p>{analysis.summary ? <ResultSection title="Résumé"><p>{analysis.summary}</p></ResultSection> : null}{analysis.concepts.length ? <ResultSection title="Notions importantes"><ol className="list-decimal space-y-2 pl-5">{analysis.concepts.map((item, index) => <li key={index}>{item}</li>)}</ol></ResultSection> : null}{analysis.keyPoints.length ? <ResultSection title="À retenir"><ul className="list-disc space-y-2 pl-5">{analysis.keyPoints.map((item, index) => <li key={index}>{item}</li>)}</ul></ResultSection> : null}{analysis.explanations.length ? <ResultSection title="Explications"><div className="space-y-2">{analysis.explanations.map((item, index) => <p key={index}>{item}</p>)}</div></ResultSection> : null}{analysis.sourceWarnings.length ? <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{analysis.sourceWarnings.join(" ")}</div> : null}{shouldOfferSubject ? <div className="mt-4 rounded-2xl bg-revision/5 p-4 text-sm"><p>Ce document semble être en {analysis.detectedSubject}. Ajouter cette matière à mes matières ?</p><button type="button" onClick={onAddSubject} className="mt-2 font-semibold text-revision">Ajouter</button></div> : null}<button type="button" disabled={quizLoading} onClick={onCreateQuiz} className="tap mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Sparkles className="h-4 w-4" />{quizLoading ? "Préparation du QCM…" : "Réviser les notions"}</button></section>;
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <details open className="mt-4 rounded-2xl bg-gray-50 p-4"><summary className="flex cursor-pointer list-none items-center justify-between font-title text-sm font-semibold text-accent">{title}<ChevronDown className="h-4 w-4" /></summary><div className="mt-3 text-sm leading-6 text-gray-600">{children}</div></details>;
}
