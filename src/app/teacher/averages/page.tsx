"use client";

import { useState } from "react";
import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";
import { EditableTable } from "@/components/ui/EditableTable";

type Row = { id: string; name: string; avg: number; appreciationAuto: string; appreciationOverride?: string };

const demo: Record<string, Row[]> = {
  "6e A": [
    { id: "s1", name: "Aïcha Koné", avg: 13.4, appreciationAuto: "Bon trimestre." },
    { id: "s2", name: "Moussa Traoré", avg: 9.2, appreciationAuto: "Trimestre insuffisant, efforts à intensifier." },
    { id: "s3", name: "Yao Kouassi", avg: 12.1, appreciationAuto: "Trimestre correct." },
  ],
  "6e B": [
    { id: "s4", name: "Aminata Diallo", avg: 15.2, appreciationAuto: "Très bon trimestre." },
    { id: "s5", name: "Ibrahim Camara", avg: 11.4, appreciationAuto: "Trimestre moyen." },
  ],
  "5e B": [
    { id: "s6", name: "Fatou Diallo", avg: 15.1, appreciationAuto: "Très bon trimestre." },
    { id: "s7", name: "Kader Ouattara", avg: 10.3, appreciationAuto: "Trimestre moyen, à stabiliser." },
  ],
};

export default function TeacherAveragesPage() {
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const { selectedClass } = useTeacherContext();

  const rows = (() => {
    const base = demo[selectedClass as keyof typeof demo] ?? [];
    return [...base]
      .map((r) => ({
        ...r,
        appreciationAuto: autoAppreciation(r.avg),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  function autoAppreciation(avg: number) {
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
              cell: (r) => `${r.avg.toFixed(1)}/20`,
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
