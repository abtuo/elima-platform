"use client";

import { useEffect, useState } from "react";
import { LogoProcessingLoader } from "@/components/ui/LogoProcessingLoader";
import { useToast } from "@/components/ui/Toast";

type ExtractedStudent = {
  fullName: string;
  registrationNumber?: string | null;
  birthDate?: string | null;
  alreadyExists?: boolean;
};

type StudentListAiImportProps = {
  classId: string;
  classLabel?: string;
  disabled?: boolean;
  onImportComplete?: () => void;
};

export function StudentListAiImport({ classId, classLabel, disabled, onImportComplete }: StudentListAiImportProps) {
  const toast = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lastExtracted, setLastExtracted] = useState<ExtractedStudent[]>([]);
  const [validating, setValidating] = useState(false);

  const ready = Boolean(classId) && !disabled;

  useEffect(() => {
    setSelectedFile(null);
    setLastExtracted([]);
    setStatus(null);
    setError(null);
  }, [classId]);

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
      setError("Format non supporté. Utilisez PDF, CSV, XLS ou XLSX.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }

  async function uploadAndImport() {
    if (!selectedFile || !classId) return;
    setUploading(true);
    setError(null);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append("classId", classId);
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
            insertable?: number;
            className?: string;
            students?: ExtractedStudent[];
          }
        | null;

      if (!res.ok) {
        throw new Error(body?.message ?? "Échec de l'import.");
      }

      setLastExtracted(body?.students ?? []);
      setStatus(
        `Extraction terminée : ${body?.extracted ?? 0} extraits, ${body?.insertable ?? 0} à insérer, ${body?.skipped ?? 0} déjà existants.`,
      );
      toast.success("Extraction IA terminée", "Vous pouvez corriger la liste puis valider.");
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur durant l'import.");
    } finally {
      setUploading(false);
    }
  }

  function updateExtractedStudent(
    index: number,
    patch: Partial<Pick<ExtractedStudent, "fullName" | "registrationNumber" | "birthDate">>,
  ) {
    setLastExtracted((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  }

  async function validateEditedExtraction() {
    if (!classId || lastExtracted.length === 0) return;
    setValidating(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/dashboard/students/validate-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          students: lastExtracted.map((student) => ({
            fullName: student.fullName,
            registrationNumber: student.registrationNumber ?? null,
            birthDate: student.birthDate ?? null,
          })),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { message?: string; inserted?: number; skipped?: number }
        | null;
      if (!res.ok) {
        throw new Error(body?.message ?? "Validation impossible.");
      }
      setStatus(`Validation terminée : ${body?.inserted ?? 0} ajoutés, ${body?.skipped ?? 0} ignorés.`);
      toast.success("Import validé", "La liste corrigée a été enregistrée.");
      setLastExtracted([]);
      onImportComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur durant la validation.");
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="elima-card space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[var(--accent)]">Import liste</h3>
        <p className="text-sm text-slate-600">
          {classLabel
            ? `Classe : ${classLabel}.`
            : "Sélectionnez une classe ci-dessus, puis envoyez un fichier pour extraire les élèves."}
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Fichier source</p>
        <p className="text-xs text-slate-500">Formats : PDF, CSV, XLS, XLSX.</p>
        <input
          type="file"
          accept=".pdf,.csv,.xls,.xlsx"
          onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          disabled={!ready}
          className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <p className="mt-2 text-xs text-slate-500">
          {selectedFile ? `${selectedFile.name} · ${(selectedFile.size / 1024 / 1024).toFixed(2)} Mo` : "Aucun fichier"}
        </p>
      </div>

      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {status ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{status}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={uploadAndImport}
          disabled={!selectedFile || !ready || uploading}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {uploading ? "Traitement en cours…" : "Importer et ajouter les élèves"}
        </button>
      </div>

      {uploading ? <LogoProcessingLoader label="Traitement en cours…" /> : null}

      {lastExtracted.length > 0 ? (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <h4 className="text-sm font-semibold text-slate-800">Résultat de l&apos;import — à valider</h4>
          <div className="space-y-2">
            {lastExtracted.map((student, idx) => (
              <div key={`${student.fullName}-${idx}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="grid gap-2 md:grid-cols-3">
                  <input
                    value={student.fullName}
                    onChange={(event) => updateExtractedStudent(idx, { fullName: event.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                    placeholder="Nom complet"
                  />
                  <input
                    value={student.registrationNumber ?? ""}
                    onChange={(event) =>
                      updateExtractedStudent(idx, { registrationNumber: event.target.value || null })
                    }
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                    placeholder="Matricule"
                  />
                  <input
                    type="date"
                    value={student.birthDate ?? ""}
                    onChange={(event) => updateExtractedStudent(idx, { birthDate: event.target.value || null })}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                  />
                </div>
                {student.alreadyExists ? (
                  <p className="mt-2 text-xs font-semibold text-amber-600">Déjà présent dans la classe</p>
                ) : null}
              </div>
            ))}
            <div className="pt-2">
              <button
                type="button"
                onClick={validateEditedExtraction}
                disabled={validating}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {validating ? "Validation…" : "Valider"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
