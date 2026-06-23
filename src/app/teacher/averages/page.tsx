"use client";

import { useEffect, useState } from "react";
import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";
import { EditableTable } from "@/components/ui/EditableTable";

type Row = { id: string; name: string; avg: number | null; appreciationAuto: string; appreciationOverride?: string };

export default function TeacherAveragesPage() {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [averages, setAverages] = useState<Record<string, number>>({});
  const [classAverage, setClassAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const { selectedClassId, selectedSubjectId, selectedTerm, students } = useTeacherContext();

  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) {
      setAverages({});
      setClassAverage(null);
      return;
    }
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ classId: selectedClassId, subjectId: selectedSubjectId, term: selectedTerm });
    fetch(`/api/teacher/averages?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { averages?: { studentId: string; average: number }[]; classAverage?: number | null } | null) => {
        if (!active || !body) return;
        const map: Record<string, number> = {};
        for (const a of body.averages ?? []) map[a.studentId] = a.average;
        setAverages(map);
        setClassAverage(body.classAverage ?? null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedClassId, selectedSubjectId, selectedTerm]);

  const rows: Row[] = students
    .filter((s) => s.classId === selectedClassId)
    .map((s) => {
      const avg = averages[s.id] ?? null;
      return {
        id: s.id,
        name: s.fullName,
        avg,
        appreciationAuto: autoAppreciation(avg),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  function autoAppreciation(avg: number | null) {
    if (avg == null) return "Moyenne non disponible pour le moment.";
    if (avg >= 16) return "Excellent trimestre. Continuez ainsi.";
    if (avg >= 14) return "Très bon trimestre.";
    if (avg >= 12) return "Bon trimestre.";
    if (avg >= 10) return "Trimestre moyen, peut mieux faire.";
    return "Trimestre insuffisant, efforts à intensifier.";
  }

  return (
    <div className="space-y-6">
      <ProgressHeader
        title="Moyennes"
        subtitle="Moyennes calculées automatiquement à partir des notes saisies, avec appréciation auto et override éditable."
      />

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Moyenne de classe</span>
          <span className="text-lg font-bold text-[var(--primary)]">
            {classAverage != null ? `${classAverage.toFixed(1)}/20` : "—"}
          </span>
        </div>
        <span className="text-xs text-slate-400">·</span>
        <span className="text-xs text-slate-500">{rows.length} élèves · {selectedTerm}</span>
        {loading ? <span className="ml-auto text-xs text-slate-400">Calcul…</span> : null}
      </section>

      <section className="elima-card space-y-4">
        <EditableTable
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            {
              key: "student",
              header: "Élève",
              cell: (r) => <span className="font-semibold">{r.name}</span>,
            },
            {
              key: "avg",
              header: "Moyenne",
              cell: (r) => (r.avg == null ? "—" : `${r.avg.toFixed(1)}/20`),
              className: "whitespace-nowrap",
            },
            {
              key: "auto",
              header: "Appréciation (auto)",
              cell: (r) => <span className="text-slate-700">{r.appreciationAuto}</span>,
            },
            {
              key: "override",
              header: "Override",
              cell: (r) => {
                const override = overrides[r.id] ?? "";
                const isOverrideActive = override.trim().length > 0;
                return (
                  <div className="space-y-2">
                    <input
                      value={override}
                      onChange={(e) => setOverrides((o) => ({ ...o, [r.id]: e.target.value }))}
                      placeholder="Optionnel"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                    {isOverrideActive ? (
                      <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                        Override actif
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        Auto
                      </span>
                    )}
                  </div>
                );
              },
            },
          ]}
        />
      </section>
    </div>
  );
}
