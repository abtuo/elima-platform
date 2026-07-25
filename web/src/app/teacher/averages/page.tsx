"use client";

import { useEffect, useState } from "react";
import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";
import { EditableTable } from "@/components/ui/EditableTable";

type Row = { id: string; name: string; avg: number | null; appreciationAuto: string };

export default function TeacherAveragesPage() {
  const [appreciations, setAppreciations] = useState<Record<string, string>>({});
  const [averages, setAverages] = useState<Record<string, number>>({});
  const [classAverage, setClassAverage] = useState<number | null>(null);

  const { selectedClassId, selectedSubjectId, selectedTerm, students } = useTeacherContext();

  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) {
      return;
    }

    let active = true;
    const params = new URLSearchParams({ classId: selectedClassId, subjectId: selectedSubjectId, term: selectedTerm });
    fetch(`/api/teacher/averages?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { averages?: { studentId: string; average: number }[]; classAverage?: number | null } | null) => {
        if (!active || !body) return;
        const map: Record<string, number> = {};
        for (const average of body.averages ?? []) map[average.studentId] = average.average;
        setAverages(map);
        setClassAverage(body.classAverage ?? null);
      });

    return () => {
      active = false;
    };
  }, [selectedClassId, selectedSubjectId, selectedTerm]);

  function autoAppreciation(avg: number | null) {
    if (avg == null) return "Moyenne non disponible pour le moment.";
    if (avg >= 16) return "Excellent trimestre. Continuez ainsi.";
    if (avg >= 14) return "Tres bon trimestre.";
    if (avg >= 12) return "Bon trimestre.";
    if (avg >= 10) return "Trimestre moyen, peut mieux faire.";
    return "Trimestre insuffisant, efforts a intensifier.";
  }

  const rows: Row[] = students
    .filter((student) => student.classId === selectedClassId)
    .map((student) => {
      const avg = averages[student.id] ?? null;
      return {
        id: student.id,
        name: student.fullName,
        avg,
        appreciationAuto: autoAppreciation(avg),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const displayedClassAverage = selectedClassId && selectedSubjectId ? classAverage : null;

  return (
    <div className="space-y-6">
      <ProgressHeader
        title="Moyennes"
        subtitle="Moyennes calculees automatiquement a partir des notes saisies, avec appreciation editable."
      />

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Moyenne de classe</span>
          <span className="text-lg font-bold text-[var(--primary)]">
            {displayedClassAverage != null ? `${displayedClassAverage.toFixed(1)}/20` : "-"}
          </span>
        </div>
        <span className="text-xs text-slate-400">-</span>
        <span className="text-xs text-slate-500">
          {rows.length} eleves - {selectedTerm}
        </span>
      </section>

      <section className="elima-card space-y-4">
        <EditableTable
          rows={rows}
          rowKey={(row) => row.id}
          columns={[
            {
              key: "student",
              header: "Eleve",
              cell: (row) => <span className="font-semibold">{row.name}</span>,
            },
            {
              key: "avg",
              header: "Moyenne",
              cell: (row) => (row.avg == null ? "-" : `${row.avg.toFixed(1)}/20`),
              className: "whitespace-nowrap",
            },
            {
              key: "appreciation",
              header: "Appreciation",
              cell: (row) => {
                const value = appreciations[row.id] ?? row.appreciationAuto;
                const isCustom = value.trim() !== row.appreciationAuto;
                return (
                  <div className="space-y-2">
                    <textarea
                      value={value}
                      onChange={(event) => setAppreciations((current) => ({ ...current, [row.id]: event.target.value }))}
                      className="min-h-[72px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                    />
                    <span
                      className={
                        isCustom
                          ? "inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                          : "inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
                      }
                    >
                      {isCustom ? "Modifiee" : "Auto"}
                    </span>
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
