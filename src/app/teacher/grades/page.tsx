"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";
import { EditableTable } from "@/components/ui/EditableTable";
import { useToast } from "@/components/ui/Toast";

type StudentRow = { id: string; name: string };

const COEFFICIENTS = [1, 1.5, 2, 3, 4];

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
        .filter((s) => s.classId === selectedClassId)
        .map((s) => ({ id: s.id, name: s.fullName }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [contextStudents, selectedClassId],
  );

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState(`Devoir du ${todayStr}`);
  const [coefficient, setCoefficient] = useState(1);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(title);
  titleRef.current = title;

  // Prefill existing scores for this evaluation (class+subject+term+title).
  const loadExisting = (currentTitle: string) => {
    if (!selectedClassId || !selectedSubjectId || !currentTitle.trim()) {
      setScores({});
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({
      classId: selectedClassId,
      subjectId: selectedSubjectId,
      term: selectedTerm,
      title: currentTitle,
    });
    fetch(`/api/teacher/grades?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { grades?: { studentId: string; score: number }[] } | null) => {
        const next: Record<string, string> = {};
        for (const g of body?.grades ?? []) next[g.studentId] = String(g.score);
        setScores(next);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExisting(titleRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, selectedSubjectId, selectedTerm]);

  const enteredCount = Object.values(scores).filter((v) => v.trim() !== "").length;

  function parseScore(value: string): number | null {
    const v = value.replace(",", ".").trim();
    if (!v) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(20, n));
  }

  async function handleSave() {
    if (!selectedClassId || !selectedSubjectId || !title.trim()) return;
    setSaving(true);
    const grades = students.map((s) => ({ studentId: s.id, score: parseScore(scores[s.id] ?? "") }));
    try {
      const res = await fetch("/api/teacher/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          term: selectedTerm,
          title: title.trim(),
          coefficient,
          grades,
        }),
      });
      const body = (await res.json().catch(() => null)) as { saved?: number; message?: string } | null;
      if (!res.ok) throw new Error(body?.message ?? "Échec");
      success("Notes enregistrées", `${body?.saved ?? 0} note(s) · ${title.trim()}`);
    } catch (e) {
      success("Échec de l’enregistrement", e instanceof Error ? e.message : "Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <ProgressHeader
        title="Notes"
        subtitle="Saisissez une évaluation : les notes alimentent les moyennes et les bulletins."
      />

      <section className="elima-card space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {selectedSubject?.name ?? "Matière"} — {selectedClass?.name ?? "Classe"} — {selectedTerm}
          </div>
          <div className="ml-auto text-sm text-slate-600">
            Saisies <span className="font-semibold text-slate-900">{enteredCount}</span>/{students.length}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Titre de l’évaluation</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => loadExisting(title)}
              placeholder="Ex: Composition n°1"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Coefficient</span>
            <select
              value={coefficient}
              onChange={(e) => setCoefficient(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {COEFFICIENTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-slate-600">Aucun élève dans cette classe.</p>
        ) : (
          <>
            {loading ? (
              <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Chargement des notes existantes…
              </p>
            ) : null}
            <EditableTable
              rows={students}
              rowKey={(s) => s.id}
              columns={[
                {
                  key: "student",
                  header: "Élève",
                  cell: (s) => <span className="font-semibold">{s.name}</span>,
                },
                {
                  key: "score",
                  header: "Note /20",
                  className: "whitespace-nowrap",
                  cell: (s) => (
                    <input
                      inputMode="decimal"
                      placeholder="—"
                      value={scores[s.id] ?? ""}
                      onChange={(e) => setScores((prev) => ({ ...prev, [s.id]: e.target.value }))}
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
                {saving ? "Enregistrement…" : "Enregistrer les notes"}
              </button>
              <span className="text-xs text-slate-500">
                Les notes vides sont ignorées. Réenregistrer met à jour l’évaluation du même titre.
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
