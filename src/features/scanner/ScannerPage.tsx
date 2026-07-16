import { useEffect, useMemo, useState } from "react";
import { BookOpen, FileText, School } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { GeneratedActionIcon } from "@/components/common/GeneratedActionIcon";
import { GeneratedFeatureIcon } from "@/components/common/GeneratedFeatureIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { ResourceCard } from "@/components/cards/ResourceCard";
import { AssignmentCard } from "@/components/cards/AssignmentCard";
import { ScanCard } from "@/components/cards/ScanCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { DOCUMENT_TYPES, REVISION_SUBJECTS } from "@/constants/demoData";
import { useAuth } from "@/features/auth/AuthProvider";
import { getAssignments, getResources } from "@/services/mainDataService";
import { getScanHistory, registerScannedDocument, requestQuizFromScan, requestSheetFromScan } from "@/services/scannerService";
import type { ScanRecord } from "@/types/revision";
import type { Assignment, ResourceItem } from "@/types/school";

export function ScannerPage() {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState(REVISION_SUBJECTS[0]);
  const [topic, setTopic] = useState("");
  const [docType, setDocType] = useState("cours");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [schoolDocuments, setSchoolDocuments] = useState<ResourceItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tab, setTab] = useState<"school" | "assignments" | "mine" | "add">("school");
  const [isDragging, setIsDragging] = useState(false);

  const previewUrl = useMemo(() => file?.type.startsWith("image/") ? URL.createObjectURL(file) : null, [file]);

  useEffect(() => {
    getScanHistory().then(setHistory);
    getResources().then(setSchoolDocuments);
    getAssignments().then(setAssignments);
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setMessage("");
    try {
      const record = await registerScannedDocument({
        userId: profile.id,
        fileName: file.name,
        subject,
        topic: topic || "Sans titre",
        documentType: docType,
      });
      setHistory(await getScanHistory());
      setMessage(`Document « ${record.fileName} » enregistré.`);
      setFile(null);
      setTopic("");
      setTab("mine");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(type: "sheet" | "quiz", scanId: string) {
    const result = type === "sheet" ? await requestSheetFromScan(scanId) : await requestQuizFromScan(scanId);
    setMessage(result.message);
  }

  return (
    <PageContainer>
      <AppHeader title="Mes documents" subtitle="Ressources de l’école et documents personnels" accent="#7C3AED" action={<GeneratedFeatureIcon name="documents" className="h-14 w-14" />} />
      <div className="mb-5 grid grid-cols-4 rounded-2xl bg-gray-100 p-1">
        <button onClick={() => setTab("school")} className={`rounded-xl px-2 py-2.5 text-xs font-semibold ${tab === "school" ? "bg-white text-revision shadow-sm" : "text-gray-500"}`}>École</button>
        <button onClick={() => setTab("assignments")} className={`rounded-xl px-1 py-2.5 text-xs font-semibold ${tab === "assignments" ? "bg-white text-revision shadow-sm" : "text-gray-500"}`}>Devoirs</button>
        <button onClick={() => setTab("mine")} className={`rounded-xl px-2 py-2.5 text-xs font-semibold ${tab === "mine" ? "bg-white text-revision shadow-sm" : "text-gray-500"}`}>Mes documents</button>
        <button onClick={() => setTab("add")} className={`rounded-xl px-2 py-2.5 text-xs font-semibold ${tab === "add" ? "bg-white text-revision shadow-sm" : "text-gray-500"}`}>Ajouter</button>
      </div>

      <div className="space-y-5">
        {tab === "school" ? (
          <section className="space-y-3">
            {schoolDocuments.length ? schoolDocuments.map((resource) => <ResourceCard key={resource.id} resource={resource} />) : <EmptyState icon={School} title="Aucun document partagé" description="Les cours, exercices et corrections publiés par vos professeurs apparaîtront ici." />}
          </section>
        ) : null}

        {tab === "assignments" ? <section className="space-y-3">{assignments.length ? assignments.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />) : <EmptyState icon={BookOpen} title="Aucun devoir publié" description="Les devoirs et leurs pièces jointes apparaîtront ici." />}</section> : null}

        {tab === "add" ? <>
          <div className="card p-5">
            <label onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); setFile(event.dataTransfer.files[0] ?? null); }} className={`block cursor-pointer rounded-xl3 border-2 border-dashed p-8 text-center transition ${isDragging ? "border-primary bg-primary/5" : "border-gray-300"}`}>
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              <GeneratedFeatureIcon name="scanner" className="mx-auto h-16 w-16" />
              <p className="mt-3 font-semibold text-accent">Choisir une image ou un PDF</p>
              <p className="mt-1 text-sm text-gray-500">Glissez-déposez ou cliquez</p>
            </label>
            <label className="tap mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-revision/10 px-4 py-3 text-sm font-semibold text-revision">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              <GeneratedActionIcon name="scanCamera" className="h-8 w-8" /> Photographier un document
            </label>
            {previewUrl ? <img src={previewUrl} alt="Aperçu du document" className="mt-4 max-h-48 w-full rounded-2xl object-contain" /> : null}
            {file && !previewUrl ? <div className="mt-4 flex items-center gap-2 text-sm text-gray-600"><FileText className="h-5 w-5" /> {file.name}</div> : null}
          </div>

          <div className="card space-y-4 p-5">
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Matière</label><select value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm">{REVISION_SUBJECTS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Chapitre / thème</label><input value={topic} onChange={(event) => setTopic(event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" placeholder="Ex. Équations du 1er degré" /></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Type de document</label><select value={docType} onChange={(event) => setDocType(event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm">{DOCUMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <button type="button" onClick={handleSubmit} disabled={!file || loading} className="tap w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Enregistrement..." : "Enregistrer le document"}</button>
          </div>
        </> : null}

        {tab === "mine" ? (
          <section className="space-y-3">
            {message ? <p className="rounded-2xl bg-primary/5 p-3 text-center text-sm text-primary">{message}</p> : null}
            {history.length ? history.map((scan) => <div key={scan.id} className="space-y-2"><ScanCard scan={scan} /><div className="flex gap-2"><button type="button" onClick={() => handleAction("sheet", scan.id)} className="tap flex flex-1 items-center justify-center gap-1 rounded-2xl border border-primary/20 py-2 text-xs font-semibold text-primary"><GeneratedActionIcon name="generateSheet" className="h-7 w-7" /> Créer une fiche</button><button type="button" onClick={() => handleAction("quiz", scan.id)} className="tap flex flex-1 items-center justify-center gap-1 rounded-2xl border border-revision/20 py-2 text-xs font-semibold text-revision"><GeneratedActionIcon name="generateQuiz" className="h-7 w-7" /> Créer un quiz</button></div></div>) : <EmptyState title="Aucun document" description="Vos documents personnels apparaîtront ici." icon={FileText} />}
          </section>
        ) : null}
      </div>
    </PageContainer>
  );
}
