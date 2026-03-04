"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";
import { demoEvaluations, demoStudents } from "@/lib/teacher/demo";
import { getDraft, saveDraft } from "@/lib/teacher/grades-store";
import { useToast } from "@/components/ui/Toast";

type StudentRow = { id: string; name: string };
type EvaluationRow = (typeof demoEvaluations)[number];

export default function TeacherGradesPage() {
  const { selectedClass, selectedSubject, selectedTerm } = useTeacherContext();
  const { success } = useToast();

  const students: StudentRow[] = useMemo(
    () =>
      demoStudents
        .filter((s) => s.className === selectedClass)
        .map((s) => ({ id: s.id, name: s.fullName }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [selectedClass],
  );

  const evaluation: EvaluationRow = useMemo(() => {
    return (
      demoEvaluations.find(
        (e) => e.className === selectedClass && e.subject === selectedSubject && e.term === selectedTerm,
      ) ?? demoEvaluations[0]
    );
  }, [selectedClass, selectedSubject, selectedTerm]);

  // Changing evaluation or class remounts the inner component, resetting local state without useEffect.
  const contextKey = `${selectedClass}:${evaluation.id}`;

  return <TeacherGradesInner key={contextKey} students={students} evaluation={evaluation} onSaved={success} />;
}

function TeacherGradesInner({
  students,
  evaluation,
  onSaved,
}: {
  students: StudentRow[];
  evaluation: EvaluationRow;
  onSaved: (title: string, description?: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const current = students[index];

  const savedCount = useMemo(() => {
    return students.reduce((acc, s) => (getDraft(evaluation.id, s.id) ? acc + 1 : acc), 0);
  }, [students, evaluation.id]);

  return (
    <div className="space-y-6">
      <ProgressHeader
        title="Notes"
        subtitle="Workflow élève par élève : autosave, navigation clavier, et progression."
      />

      <section className="elima-card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Évaluation : {evaluation.label}
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span>
              Progression <span className="font-semibold text-slate-900">{index + 1}</span>/{students.length}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="text-xs sm:text-sm">
              Enregistrés <span className="font-semibold text-slate-900">{savedCount}</span>/{students.length}
            </span>
          </div>
        </div>

        {current ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
            <GradeEntry key={`${evaluation.id}:${current.id}`} student={current} evaluation={evaluation} onSaved={onSaved} />

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold">Navigation</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <ChevronLeft size={16} /> Préc.
                </button>
                <button
                  onClick={() => setIndex((i) => Math.min(students.length - 1, i + 1))}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Suiv. <ChevronRight size={16} />
                </button>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">État</p>
                <p className="mt-1">Notes enregistrées : {savedCount}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Aucun élève dans cette classe.</p>
        )}
      </section>
    </div>
  );
}

function GradeEntry({
  student,
  evaluation,
  onSaved,
}: {
  student: StudentRow;
  evaluation: EvaluationRow;
  onSaved: (title: string, description?: string) => void;
}) {
  const draft = getDraft(evaluation.id, student.id);
  const [rawScore, setRawScore] = useState<string>(draft?.score != null ? String(draft.score) : "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function parseScore(value: string) {
    const v = value.replace(",", ".").trim();
    if (!v) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  async function flushSave(nextRaw?: string) {
    const score = parseScore(nextRaw ?? rawScore);
    setSaving(true);
    await saveDraft({ evaluationId: evaluation.id, studentId: student.id, score });
    setSaving(false);
    onSaved("Enregistré", `${student.name} • ${evaluation.label}`);
  }

  function scheduleSave(nextRaw: string) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void flushSave(nextRaw);
    }, 800);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">Élève</p>
      <p className="mt-1 text-xl font-bold text-[var(--accent)]">{student.name}</p>

      <div className="mt-4">
        <label className="text-sm font-semibold">Note /20</label>
        <input
          ref={inputRef}
          inputMode="decimal"
          placeholder="Ex: 14.5"
          value={rawScore}
          onChange={(e) => {
            const next = e.target.value;
            setRawScore(next);
            scheduleSave(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (debounceRef.current) window.clearTimeout(debounceRef.current);
              void flushSave();
            }
          }}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Autosave après 800ms • Entrée = enregistrer</span>
          {saving ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
              <Loader2 size={12} className="animate-spin" /> Enregistrement…
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">Prêt</span>
          )}
        </div>
      </div>
    </div>
  );
}
