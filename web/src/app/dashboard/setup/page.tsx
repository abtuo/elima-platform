"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { UploadDocument } from "@/components/dashboard/UploadDocument";
import { useToast } from "@/components/ui/Toast";

type SubjectRow = {
  id: string;
  name: string;
  coefficient: number;
  selected: boolean;
};

type ExistingClass = {
  id: string;
  name: string;
  level: string | null;
  academic_year: string | null;
};

const baseSubjects = [
  { name: "Mathématiques", coefficient: 1 },
  { name: "Français", coefficient: 1 },
  { name: "Anglais", coefficient: 1 },
  { name: "SVT", coefficient: 1 },
  { name: "Sciences physiques", coefficient: 1 },
  { name: "Histoire-Géographie", coefficient: 1 },
  { name: "Philosophie", coefficient: 1 },
  { name: "EPS", coefficient: 1 },
  { name: "Informatique", coefficient: 1 },
  { name: "Espagnol", coefficient: 1 },
  { name: "Allemand", coefficient: 1 },
  { name: "Arabe", coefficient: 1 },
  { name: "Arts plastiques", coefficient: 1 },
  { name: "Musique", coefficient: 1 },
];

const defaultLevels = ["6e", "5e", "4e", "3e", "Seconde", "Première", "Terminale", "Autre"];

export default function DashboardSetupPage() {
  const toast = useToast();
  const [level, setLevel] = useState("");
  const [customLevel, setCustomLevel] = useState("");
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [numberOfClasses, setNumberOfClasses] = useState(1);
  const [numberingScheme, setNumberingScheme] = useState<"letters" | "numbers">("letters");
  const [subjects, setSubjects] = useState<SubjectRow[]>(() =>
    baseSubjects.map((subject, idx) => ({
      id: `base-${idx}`,
      name: subject.name,
      coefficient: subject.coefficient,
      selected: true,
    })),
  );
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCoefficient, setNewSubjectCoefficient] = useState(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ExistingClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const effectiveLevel = useMemo(() => {
    if (level === "Autre") return customLevel.trim();
    return level.trim();
  }, [level, customLevel]);

  const fetchClasses = useCallback(async (signal?: AbortSignal) => {
    try {
      setClassesLoading(true);
      setClassesError(null);
      const res = await fetch("/api/dashboard/classes", { signal });
      if (!res.ok) {
        throw new Error("Impossible de récupérer les classes.");
      }
      const body = (await res.json()) as { classes?: ExistingClass[] };
      const availableClasses = body.classes ?? [];
      setClasses(availableClasses);
      if (!selectedClassId && availableClasses.length) {
        setSelectedClassId(availableClasses[0].id);
      }
    } catch (err) {
      if (signal?.aborted) return;
      setClassesError(err instanceof Error ? err.message : "Erreur lors du chargement.");
    } finally {
      if (!signal?.aborted) {
        setClassesLoading(false);
      }
    }
  }, [selectedClassId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchClasses(controller.signal);
    return () => controller.abort();
  }, [fetchClasses]);

  const selectedClass = classes.find((item) => item.id === selectedClassId);

  function toggleSubject(id: string) {
    setSubjects((prev) => prev.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)));
  }

  function updateCoefficient(id: string, value: number) {
    setSubjects((prev) => prev.map((row) => (row.id === id ? { ...row, coefficient: value } : row)));
  }

  function addCustomSubject() {
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;
    setSubjects((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: trimmed,
        coefficient: newSubjectCoefficient || 1,
        selected: true,
      },
    ]);
    setNewSubjectName("");
    setNewSubjectCoefficient(1);
  }

  async function submit() {
    setStatus(null);
    setError(null);

    if (!effectiveLevel) {
      setError("Veuillez choisir un niveau.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/dashboard/levels/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: effectiveLevel,
        academicYear,
        numberOfClasses,
        numberingScheme,
        subjects: subjects.map((subject) => ({
          name: subject.name,
          coefficient: subject.coefficient,
          selected: subject.selected,
        })),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Impossible de configurer ce niveau.");
      return;
    }

    setStatus("Niveau configuré avec succès. Vous pouvez configurer un autre niveau.");
    toast.success(
      "Classes créées avec succès",
      "Vous pouvez maintenant assigner des enseignants aux classes.",
    );
    await fetchClasses();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configurer l’école" subtitle="Créez vos classes niveau par niveau et définissez les matières." />

      <section className="elima-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--accent)]">Classes existantes</h2>
            <p className="text-sm text-slate-600">Visualisez les classes déjà créées pour préparer les actions futures.</p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ajouter une classe
          </button>
        </div>

        {classesLoading ? <p className="text-sm text-slate-500">Chargement des classes…</p> : null}
        {classesError ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{classesError}</p> : null}

        {!classesLoading && !classesError ? (
          classes.length ? (
            <div className="space-y-2">
              {classes.map((item) => (
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
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {selectedClassId === item.id ? "Sélectionnée" : "Choisir"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucune classe enregistrée pour le moment.</p>
          )
        ) : null}
      </section>

      <UploadDocument
        classId={selectedClassId}
        className={selectedClass ? `${selectedClass.name} · ${selectedClass.level ?? "Niveau"}` : undefined}
        onUploaded={fetchClasses}
      />

      <section className="elima-card space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Niveau</label>
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Sélectionner un niveau</option>
              {defaultLevels.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {level === "Autre" ? (
              <input
                value={customLevel}
                onChange={(event) => setCustomLevel(event.target.value)}
                placeholder="Ex: Seconde C"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Nombre de classes</label>
            <input
              type="number"
              min={1}
              value={numberOfClasses}
              onChange={(event) => setNumberOfClasses(Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Type de numérotation</label>
            <div className="mt-2 flex rounded-xl border border-slate-300 bg-white text-sm">
              <button
                type="button"
                onClick={() => setNumberingScheme("letters")}
                className={`flex-1 rounded-xl px-3 py-2 ${
                  numberingScheme === "letters" ? "bg-[var(--primary)] text-white" : "text-slate-600"
                }`}
              >
                A, B, C…
              </button>
              <button
                type="button"
                onClick={() => setNumberingScheme("numbers")}
                className={`flex-1 rounded-xl px-3 py-2 ${
                  numberingScheme === "numbers" ? "bg-[var(--primary)] text-white" : "text-slate-600"
                }`}
              >
                1, 2, 3…
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Année scolaire</label>
          <input
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </section>

      <section className="elima-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--accent)]">Matières du niveau</h2>
          <p className="text-sm text-slate-600">Cochez les matières enseignées pour ce niveau.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {subjects.map((subject) => (
            <div key={subject.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={subject.selected}
                  onChange={() => toggleSubject(subject.id)}
                  className="h-4 w-4"
                />
                {subject.name}
              </label>
              <input
                type="number"
                min={1}
                value={subject.coefficient}
                onChange={(event) => updateCoefficient(subject.id, Number(event.target.value))}
                className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs"
              />
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
          <input
            value={newSubjectName}
            onChange={(event) => setNewSubjectName(event.target.value)}
            placeholder="Ajouter une matière"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            value={newSubjectCoefficient}
            onChange={(event) => setNewSubjectCoefficient(Number(event.target.value))}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addCustomSubject}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ajouter
          </button>
        </div>

        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {status ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{status}</p> : null}

        <button
          onClick={submit}
          disabled={loading}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Validation…" : "Valider"}
        </button>
      </section>
    </div>
  );
}
