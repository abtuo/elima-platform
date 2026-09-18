"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StudentListAiImport } from "@/components/dashboard/StudentListAiImport";
import { useToast } from "@/components/ui/Toast";

type ClassItem = {
  id: string;
  name: string;
  level: string | null;
  academic_year: string | null;
};

type ClassRosterStudent = {
  id: string;
  fullName: string;
  registrationNumber?: string | null;
  birthDate?: string | null;
};

type ClassTeacher = {
  subjectId: string;
  subjectName: string;
  coefficient: number;
  teacherId: string;
  teacherName: string;
};

function formatBirthDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function DashboardClassesPage() {
  const toast = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [levelFilter, setLevelFilter] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roster, setRoster] = useState<ClassRosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [classTeachers, setClassTeachers] = useState<ClassTeacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState<string | null>(null);

  const [newFullName, setNewFullName] = useState("");
  const [newRegistration, setNewRegistration] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);

  const levels = useMemo(() => {
    const unique = new Set(
      classes
        .map((item) => item.level)
        .filter((level): level is string => Boolean(level)),
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "fr"));
  }, [classes]);

  const filteredClasses = useMemo(() => {
    if (!levelFilter) return [];
    return classes.filter((item) => item.level === levelFilter);
  }, [classes, levelFilter]);

  async function fetchClasses() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/classes");
      if (!res.ok) {
        throw new Error("Impossible de récupérer les classes.");
      }
      const body = (await res.json()) as { classes?: ClassItem[] };
      const availableClasses = body.classes ?? [];
      setClasses(availableClasses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  }

  const fetchClassRoster = useCallback(async (classId: string) => {
    if (!classId) {
      setRoster([]);
      setRosterError(null);
      return;
    }
    setRosterLoading(true);
    setRosterError(null);
    try {
      const res = await fetch(`/api/dashboard/students?classId=${encodeURIComponent(classId)}`);
      const body = (await res.json().catch(() => null)) as
        | { students?: ClassRosterStudent[]; message?: string }
        | null;
      if (!res.ok) {
        throw new Error(body?.message ?? "Impossible de charger les élèves.");
      }
      setRoster(body?.students ?? []);
    } catch (err) {
      setRoster([]);
      setRosterError(err instanceof Error ? err.message : "Erreur lors du chargement des élèves.");
    } finally {
      setRosterLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses()
      .then(() => null)
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!levelFilter) {
      setSelectedClassId("");
      return;
    }
    if (!filteredClasses.some((item) => item.id === selectedClassId)) {
      setSelectedClassId(filteredClasses[0]?.id ?? "");
    }
  }, [filteredClasses, levelFilter, selectedClassId]);

  const fetchClassTeachers = useCallback(async (classId: string) => {
    if (!classId) {
      setClassTeachers([]);
      setTeachersError(null);
      return;
    }
    setTeachersLoading(true);
    setTeachersError(null);
    try {
      const res = await fetch(`/api/dashboard/classes/teachers?classId=${encodeURIComponent(classId)}`);
      const body = (await res.json().catch(() => null)) as { teachers?: ClassTeacher[]; message?: string } | null;
      if (!res.ok) {
        throw new Error(body?.message ?? "Impossible de charger les enseignants.");
      }
      setClassTeachers(body?.teachers ?? []);
    } catch (err) {
      setClassTeachers([]);
      setTeachersError(err instanceof Error ? err.message : "Erreur lors du chargement des enseignants.");
    } finally {
      setTeachersLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClassRoster(selectedClassId);
    void fetchClassTeachers(selectedClassId);
  }, [selectedClassId, fetchClassRoster, fetchClassTeachers]);

  const selectedClass = classes.find((item) => item.id === selectedClassId);

  async function handleAddStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClassId) return;
    setAddFormError(null);
    const fullName = newFullName.trim();
    if (fullName.length < 2) {
      setAddFormError("Indiquez au moins 2 caractères pour le nom complet.");
      return;
    }
    setAddSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/students/validate-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          students: [
            {
              fullName,
              registrationNumber: newRegistration.trim() || null,
              birthDate: newBirthDate.trim() || null,
            },
          ],
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { message?: string; inserted?: number; skipped?: number }
        | null;
      if (!res.ok) {
        throw new Error(body?.message ?? "Ajout impossible.");
      }
      if ((body?.inserted ?? 0) < 1) {
        setAddFormError(
          "Le nom est peut-être déjà présent dans cette classe, ou les données sont invalides.",
        );
        return;
      }
      toast.success("Élève ajouté", `${fullName} a été enregistré dans la classe.`);
      setNewFullName("");
      setNewRegistration("");
      setNewBirthDate("");
      await fetchClassRoster(selectedClassId);
    } catch (err) {
      setAddFormError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setAddSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        subtitle="Sélectionnez un niveau et une classe pour les modifier, consulter les élèves, en ajouter ou importer une liste."
      />

      <section className="elima-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--accent)]">Filtrer par niveau</h2>
          <p className="text-sm text-slate-600">
            Choisissez un niveau pour afficher les classes et sélectionner celle à gérer.
          </p>
        </div>

        {loading ? <p className="text-sm text-slate-500">Chargement des classes…</p> : null}
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {!loading ? (
          <select
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Sélectionner un niveau</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        ) : null}
      </section>

      <section className="elima-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--accent)]">Classes du niveau</h2>
          <p className="text-sm text-slate-600">Sélectionnez la classe à gérer.</p>
        </div>

        {levelFilter && filteredClasses.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune classe pour ce niveau.</p>
        ) : null}

        {filteredClasses.length > 0 ? (
          <div className="space-y-2">
            {filteredClasses.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedClassId(item.id)}
                className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  selectedClassId === item.id
                    ? "border-[var(--primary)] bg-[var(--primary)]/10"
                    : "border-slate-200 bg-white hover:border-[var(--primary)]/40"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.level ?? "Niveau non défini"} · {item.academic_year ?? "Année non définie"}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {selectedClassId === item.id ? "Sélectionnée" : "Choisir"}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {selectedClassId ? (
        <section className="elima-card space-y-6">
          <details className="group rounded-2xl border border-slate-200 bg-slate-50/80 open:bg-white open:shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
              <ChevronRight
                className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-90"
                aria-hidden
              />
              <span>
                Voir la liste des élèves
                <span className="ml-2 font-normal text-slate-500">({roster.length})</span>
              </span>
            </summary>
            <div className="border-t border-slate-200 px-4 pb-4 pt-2">
              {rosterLoading ? (
                <p className="text-sm text-slate-500">Chargement de la liste…</p>
              ) : rosterError ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{rosterError}</p>
              ) : roster.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun élève dans cette classe pour le moment.</p>
              ) : (
                <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                  {roster.map((student) => (
                    <li key={student.id} className="px-3 py-2.5 text-sm">
                      <p className="font-medium text-slate-800">{student.fullName}</p>
                      <p className="text-xs text-slate-500">
                        {student.registrationNumber ? `Matricule : ${student.registrationNumber}` : "Sans matricule"}
                        {student.birthDate ? ` · Né(e) le ${formatBirthDisplay(student.birthDate)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>

          <details className="group rounded-2xl border border-slate-200 bg-slate-50/80 open:bg-white open:shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
              <ChevronRight
                className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-90"
                aria-hidden
              />
              <span>
                Voir les enseignants par matière
                <span className="ml-2 font-normal text-slate-500">({classTeachers.length})</span>
              </span>
            </summary>
            <div className="border-t border-slate-200 px-4 pb-4 pt-2">
              {teachersLoading ? (
                <p className="text-sm text-slate-500">Chargement des enseignants…</p>
              ) : teachersError ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{teachersError}</p>
              ) : classTeachers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Aucun enseignant affecté à cette classe. Affectez-les depuis la page Enseignants.
                </p>
              ) : (
                <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                  {classTeachers.map((t) => (
                    <li key={`${t.subjectId}-${t.teacherId}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">{t.subjectName}</p>
                        <p className="text-xs text-slate-500">Coef. {t.coefficient}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {t.teacherName}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-[var(--accent)]">Ajouter un élève</h3>
            <form onSubmit={handleAddStudent} className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span className="text-xs font-semibold text-slate-600">Nom complet</span>
                <input
                  value={newFullName}
                  onChange={(e) => {
                    setNewFullName(e.target.value);
                    setAddFormError(null);
                  }}
                  required
                  minLength={2}
                  placeholder="Prénom et nom"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold text-slate-600">Matricule (optionnel)</span>
                <input
                  value={newRegistration}
                  onChange={(e) => setNewRegistration(e.target.value)}
                  placeholder="Numéro interne"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold text-slate-600">Date de naissance (optionnel)</span>
                <input
                  type="date"
                  value={newBirthDate}
                  onChange={(e) => setNewBirthDate(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                />
              </label>
              <div className="flex items-end sm:col-span-2">
                <button
                  type="submit"
                  disabled={addSubmitting || rosterLoading}
                  className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {addSubmitting ? "Enregistrement…" : "Ajouter l’élève"}
                </button>
              </div>
              {addFormError ? (
                <p className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{addFormError}</p>
              ) : null}
            </form>
          </div>
        </section>
      ) : null}

      <StudentListAiImport
        classId={selectedClassId}
        classLabel={
          selectedClass
            ? `${selectedClass.name} · ${selectedClass.level ?? "Niveau"} · ${selectedClass.academic_year ?? ""}`
            : undefined
        }
        disabled={loading}
        onImportComplete={() => {
          void fetchClasses();
          if (selectedClassId) void fetchClassRoster(selectedClassId);
        }}
      />
    </div>
  );
}
