"use client";

import { useMemo, useState } from "react";

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
  const [className, setClassName] = useState<keyof typeof demo>("6e A");
  const [term, setTerm] = useState("Trimestre 1");
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const rows = useMemo(() => [...demo[className]].sort((a, b) => a.name.localeCompare(b.name)), [className]);

  return (
    <div className="space-y-6">
      <header className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Moyennes & appréciations</h1>
        <p className="mt-1 text-sm text-slate-600">Moyennes calculées automatiquement. Appréciations éditables.</p>
      </header>

      <section className="elima-card space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold">Classe</label>
            <select value={className} onChange={(e) => setClassName(e.target.value as keyof typeof demo)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
              {Object.keys(demo).map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold">Période</label>
            <select value={term} onChange={(e) => setTerm(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
              {["Trimestre 1", "Trimestre 2", "Trimestre 3"].map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
          <div className="ml-auto rounded-full bg-[var(--secondary)]/25 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
            {term}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Moyenne</th>
                <th className="px-4 py-3">Appréciation (auto)</th>
                <th className="px-4 py-3">Appréciation (édition)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-semibold">{r.name}</td>
                  <td className="px-4 py-3">{r.avg.toFixed(1)}/20</td>
                  <td className="px-4 py-3 text-slate-700">{r.appreciationAuto}</td>
                  <td className="px-4 py-3">
                    <input
                      value={overrides[r.id] ?? ""}
                      onChange={(e) => setOverrides((o) => ({ ...o, [r.id]: e.target.value }))}
                      placeholder="Optionnel"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
