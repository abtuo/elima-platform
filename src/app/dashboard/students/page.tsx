"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";

type ClassItem = {
  id: string;
  name: string;
  level: string | null;
  academic_year: string | null;
};

type StudentItem = {
  id: string;
  fullName: string;
  classId: string;
  className: string;
  level: string;
  academicYear: string;
};

type ExtractedStudent = {
  fullName: string;
  registrationNumber?: string | null;
  birthDate?: string | null;
};

export default function DashboardStudentsPage() {
  const toast = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lastExtracted, setLastExtracted] = useState<ExtractedStudent[]>([]);

  const levels = useMemo(() => {
    const unique = new Set(classes.map((item) => item.level).filter((value): value is string => Boolean(value)));
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "fr"));
  }, [classes]);

  const filteredClasses = useMemo(() => {
    if (!selectedLevel) return [];
    return classes.filter((item) => item.level === selectedLevel);
  }, [classes, selectedLevel]);

  const effectiveSelectedClassId = useMemo(() => {
    if (filteredClasses.length === 0) return "";
    if (filteredClasses.some((item) => item.id === selectedClassId)) return selectedClassId;
    return filteredClasses[0].id;
  }, [filteredClasses, selectedClassId]);

  const studentsInClass = useMemo(
    () => students.filter((student) => student.classId === effectiveSelectedClassId),
    [students, effectiveSelectedClassId],
  );

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/students");
      if (!res.ok) {
        throw new Error("Impossible de charger les classes/eleves.");
      }
      const body = (await res.json()) as { classes?: ClassItem[]; students?: StudentItem[] };
      const loadedClasses = body.classes ?? [];
      setClasses(loadedClasses);
      setStudents(body.students ?? []);

      if (!selectedLevel && loadedClasses.length > 0) {
        setSelectedLevel(loadedClasses[0].level ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData().catch(() => null);
  }, []);

  function handleFileChange(file: File | null) {
    setError(null);
    setStatus(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const name = file.name.toLowerCase();
    const isAllowed = [".pdf", ".csv", ".xls", ".xlsx"].some((ext) => name.endsWith(ext));
    if (!isAllowed) {
      setError("Format non supporte. Utilisez PDF, CSV, XLS ou XLSX.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }

  async function uploadAndImport() {
    if (!selectedFile || !effectiveSelectedClassId) return;
    setUploading(true);
    setError(null);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append("classId", effectiveSelectedClassId);
      formData.append("file", selectedFile);

      const res = await fetch("/api/dashboard/students/import", {
        method: "POST",
        body: formData,
      });

      const body = (await res.json().catch(() => null)) as
        | {
            message?: string;
            inserted?: number;
            skipped?: number;
            extracted?: number;
            className?: string;
            students?: ExtractedStudent[];
          }
        | null;

      if (!res.ok) {
        throw new Error(body?.message ?? "Echec de l'import.");
      }

      setLastExtracted(body?.students ?? []);
      setStatus(
        `Import termine: ${body?.inserted ?? 0} ajoutes, ${body?.skipped ?? 0} ignores (doublons), ${body?.extracted ?? 0} extraits.`,
      );
      toast.success("Import eleves termine", "Extraction LLM et insertion en base reussies.");
      setSelectedFile(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur durant l'import.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Élèves"
        subtitle="Importez les élèves par niveau et par classe (PDF/CSV/XLS) avec extraction automatique par IA."
      />

      <section className="elima-card space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold text-slate-600">Niveau</span>
            <select
              value={selectedLevel}
              onChange={(event) => {
                setSelectedLevel(event.target.value);
                setSelectedClassId("");
                setSelectedFile(null);
                setLastExtracted([]);
              }}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Selectionner un niveau</option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold text-slate-600">Classe</span>
            <select
              value={effectiveSelectedClassId}
              onChange={(event) => {
                setSelectedClassId(event.target.value);
                setSelectedFile(null);
                setLastExtracted([]);
              }}
              disabled={!selectedLevel}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100"
            >
              <option value="">Selectionner une classe</option>
              {filteredClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} {item.academic_year ? `· ${item.academic_year}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Upload source (traite par LLM OpenAI)</p>
          <p className="text-xs text-slate-500">Formats: PDF, CSV, XLS, XLSX.</p>
          <input
            type="file"
            accept=".pdf,.csv,.xls,.xlsx"
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            disabled={!effectiveSelectedClassId || loading}
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <p className="mt-2 text-xs text-slate-500">
            {selectedFile ? `${selectedFile.name} · ${(selectedFile.size / 1024 / 1024).toFixed(2)} Mo` : "Aucun fichier"}
          </p>
        </div>

        {loading ? <p className="text-sm text-slate-500">Chargement des donnees...</p> : null}
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {status ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{status}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={uploadAndImport}
            disabled={!selectedFile || !effectiveSelectedClassId || uploading}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {uploading ? "Traitement IA en cours..." : "Importer et ajouter les élèves"}
          </button>
        </div>
      </section>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold text-[var(--accent)]">Élèves de la classe sélectionnée</h2>
        {studentsInClass.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun élève enregistré pour cette classe.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {studentsInClass.map((student) => (
              <div key={student.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-sm font-medium text-slate-700">{student.fullName}</p>
                <p className="text-xs text-slate-500">
                  {student.className} · {student.level} · {student.academicYear}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold text-[var(--accent)]">Dernière extraction IA</h2>
        {lastExtracted.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune extraction à afficher pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {lastExtracted.map((student, idx) => (
              <div key={`${student.fullName}-${idx}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-sm font-medium text-slate-700">{student.fullName}</p>
                <p className="text-xs text-slate-500">
                  Matricule: {student.registrationNumber || "N/A"} · Naissance: {student.birthDate || "N/A"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
