"use client";

import { useState } from "react";
import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";
import { EditableTable } from "@/components/ui/EditableTable";

type Row = { id: string; name: string; avg: number | null; appreciationAuto: string; appreciationOverride?: string };

export default function TeacherAveragesPage() {
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const { selectedClassId, students } = useTeacherContext();

  const rows: Row[] = students
    .filter((s) => s.classId === selectedClassId)
    .map((s) => ({
      id: s.id,
      name: s.fullName,
      avg: null,
      appreciationAuto: autoAppreciation(null),
    }))
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
        subtitle="Moyennes calculées automatiquement + appréciations auto, avec override éditable."
      />

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
