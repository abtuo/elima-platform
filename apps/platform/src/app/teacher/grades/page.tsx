"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Loader2, Plus, Save } from "lucide-react";

import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";
import { EditableTable } from "@/components/ui/EditableTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { getAppNow } from "@/lib/app-date";

type StudentRow = { id: string; name: string };
type EvaluationRow = {
  id: string;
  title: string;
  coefficient: number;
  evaluationDate: string;
  gradeCount: number;
};

const COEFFICIENTS = [1, 1.5, 2, 3, 4];

function todayLabel() {
  return getAppNow().toISOString().slice(0, 10);
}

export default function TeacherGradesPage() {
  const {
    selectedClassId,
    selectedSubjectId,
    selectedTerm,
    students: contextStudents,
    classes,
    subjects,
  } = useTeacherContext();
  const { success } = useToast();

  const students: StudentRow[] = useMemo(
    () =>
      contextStudents
        .filter((student) => student.classId === selectedClassId)
        .map((student) => ({ id: student.id, name: student.fullName }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [contextStudents, selectedClassId],
  );

  const selectedClass = classes.find((item) => item.id === selectedClassId);
  const selectedSubject = subjects.find((item) => item.id === selectedSubjectId);

  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [title, setTitle] = useState(`Devoir du ${todayLabel()}`);
  const [coefficient, setCoefficient] = useState(1);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) return;

    const params = new URLSearchParams({
      classId: selectedClassId,
      subjectId: selectedSubjectId,
      term: selectedTerm,
    });

    fetch(`/api/teacher/grades?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { evaluations?: EvaluationRow[] } | null) => {
        setEvaluations(body?.evaluations ?? []);
        setEvaluationId(null);
        setTitle(`Devoir du ${todayLabel()}`);
        setCoefficient(1);
        setScores({});
      })
      .catch(() => {
        setEvaluations([]);
      });
  }, [selectedClassId, selectedSubjectId, selectedTerm]);

  const enteredCount = Object.values(scores).filter((value) => value.trim() !== "").length;
  const activeEvaluation = evaluations.find((evaluation) => evaluation.id === evaluationId);

  function parseScore(value: string): number | null {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return null;
    const score = Number(normalized);
    if (!Number.isFinite(score)) return null;
    return Math.max(0, Math.min(20, score));
  }

  function resetForm() {
    setEvaluationId(null);
    setTitle(`Devoir du ${todayLabel()}`);
    setCoefficient(1);
    setScores({});
  }

  async function refreshEvaluations(nextEvaluationId?: string | null) {
    if (!selectedClassId || !selectedSubjectId) return;
    const params = new URLSearchParams({
      classId: selectedClassId,
      subjectId: selectedSubjectId,
      term: selectedTerm,
    });
    const response = await fetch(`/api/teacher/grades?${params.toString()}`);
    const body = (await response.json().catch(() => null)) as { evaluations?: EvaluationRow[] } | null;
    if (response.ok) {
      setEvaluations(body?.evaluations ?? []);
      if (nextEvaluationId) setEvaluationId(nextEvaluationId);
    }
  }

  async function openEvaluation(id: string) {
    if (!selectedClassId || !selectedSubjectId) return;
    setLoadingEvaluation(true);
    try {
      const params = new URLSearchParams({
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        term: selectedTerm,
        evaluationId: id,
      });
      const response = await fetch(`/api/teacher/grades?${params.toString()}`);
      const body = (await response.json().catch(() => null)) as
        | {
            evaluation?: { id: string; title: string; coefficient: number } | null;
            grades?: { studentId: string; score: number }[];
            message?: string;
          }
        | null;
      if (!response.ok || !body?.evaluation) throw new Error(body?.message ?? "Evaluation introuvable.");

      const nextScores: Record<string, string> = {};
      for (const grade of body.grades ?? []) nextScores[grade.studentId] = String(grade.score);
      setEvaluationId(body.evaluation.id);
      setTitle(body.evaluation.title);
      setCoefficient(Number(body.evaluation.coefficient ?? 1) || 1);
      setScores(nextScores);
    } catch (err) {
      success("Chargement impossible", err instanceof Error ? err.message : "Veuillez reessayer.");
    } finally {
      setLoadingEvaluation(false);
    }
  }

  async function handleSave() {
    if (!selectedClassId || !selectedSubjectId || !title.trim()) return;
    setSaving(true);
    const grades = students.map((student) => ({ studentId: student.id, score: parseScore(scores[student.id] ?? "") }));
    try {
      const response = await fetch("/api/teacher/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationId,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          term: selectedTerm,
          title: title.trim(),
          coefficient,
          grades,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        evaluationId?: string;
        saved?: number;
        cleared?: number;
        notificationsSent?: number;
        message?: string;
      } | null;
      if (!response.ok) throw new Error(body?.message ?? "Echec");

      await refreshEvaluations(body?.evaluationId ?? evaluationId);
      const notified = body?.notificationsSent ?? 0;
      success(
        evaluationId ? "Evaluation mise a jour" : "Evaluation enregistree",
        `${body?.saved ?? 0} note(s) - ${body?.cleared ?? 0} vide(s)${notified > 0 ? ` - ${notified} parent(s) notifie(s)` : ""}`,
      );
    } catch (err) {
      success("Echec de l'enregistrement", err instanceof Error ? err.message : "Veuillez reessayer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <ProgressHeader
        title="Notes"
        subtitle="Consultez les evaluations passees, modifiez leurs notes, ou creez une nouvelle evaluation."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <section className="elima-card space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {selectedSubject?.name ?? "Matiere"} - {selectedClass?.name ?? "Classe"} - {selectedTerm}
            </div>
            <div className="ml-auto text-sm text-slate-600">
              Saisies <span className="font-semibold text-slate-900">{enteredCount}</span>/{students.length}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {evaluationId ? "Evaluation existante" : "Nouvelle evaluation"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeEvaluation ? `Creee le ${activeEvaluation.evaluationDate}` : "Les notes seront visibles dans l'historique apres enregistrement."}
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus size={16} />
              Nouvelle evaluation
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Titre de l&apos;evaluation</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: Composition n1"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Coefficient</span>
              <select
                value={coefficient}
                onChange={(event) => setCoefficient(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {COEFFICIENTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {students.length === 0 ? (
            <p className="text-sm text-slate-600">Aucun eleve dans cette classe.</p>
          ) : (
            <>
              {loadingEvaluation ? (
                <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={14} className="animate-spin" /> Chargement des notes...
                </p>
              ) : null}
              <EditableTable
                rows={students}
                rowKey={(student) => student.id}
                columns={[
                  {
                    key: "student",
                    header: "Eleve",
                    cell: (student) => <span className="font-semibold">{student.name}</span>,
                  },
                  {
                    key: "score",
                    header: "Note /20",
                    className: "whitespace-nowrap",
                    cell: (student) => (
                      <input
                        inputMode="decimal"
                        placeholder="-"
                        value={scores[student.id] ?? ""}
                        onChange={(event) => setScores((current) => ({ ...current, [student.id]: event.target.value }))}
                        className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    ),
                  },
                ]}
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  disabled={saving || !title.trim()}
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Enregistrement..." : evaluationId ? "Mettre a jour l'evaluation" : "Enregistrer l'evaluation"}
                </button>
                <span className="text-xs text-slate-500">
                  Les notes vides suppriment la note de l&apos;eleve pour cette evaluation.
                </span>
              </div>
            </>
          )}
        </section>

        <section className="elima-card space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--accent)]">Evaluations passees</h2>
              <p className="mt-0.5 text-sm text-slate-500">Ouvrez une evaluation pour modifier ses notes.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              {evaluations.length}
            </span>
          </div>

          {evaluations.length === 0 ? (
            <EmptyState title="Aucune evaluation" description="Les evaluations enregistrees apparaitront ici." />
          ) : (
            <ul className="space-y-2">
              {evaluations.map((evaluation) => {
                const active = evaluation.id === evaluationId;
                return (
                  <li key={evaluation.id}>
                    <button
                      type="button"
                      onClick={() => openEvaluation(evaluation.id)}
                      className={
                        active
                          ? "w-full rounded-xl border border-[var(--primary)] bg-[var(--primary)]/10 px-3 py-2.5 text-left"
                          : "w-full rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-left hover:bg-slate-50"
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{evaluation.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {evaluation.evaluationDate} - coef. {evaluation.coefficient}
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          <Edit3 size={12} />
                          {evaluation.gradeCount}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
