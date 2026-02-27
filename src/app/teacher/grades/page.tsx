"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type StudentRow = { id: string; name: string };

const demoByClass: Record<string, StudentRow[]> = {
  "6e A": [
    { id: "s1", name: "Aïcha Koné" },
    { id: "s2", name: "Moussa Traoré" },
    { id: "s3", name: "Yao Kouassi" },
  ],
  "6e B": [
    { id: "s4", name: "Aminata Diallo" },
    { id: "s5", name: "Ibrahim Camara" },
  ],
  "5e B": [
    { id: "s6", name: "Fatou Diallo" },
    { id: "s7", name: "Kader Ouattara" },
  ],
};

export default function TeacherGradesPage() {
  const [className, setClassName] = useState<keyof typeof demoByClass>("6e A");
  const students = useMemo(() => [...demoByClass[className]].sort((a, b) => a.name.localeCompare(b.name)), [className]);

  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, string>>({});

  const current = students[index];
  const value = current ? (scores[current.id] ?? "") : "";

  return (
    <div className="space-y-6">
      <header className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Saisie de notes</h1>
        <p className="mt-1 text-sm text-slate-600">Choisissez une classe puis saisissez élève par élève (navigation rapide).</p>
      </header>

      <section className="elima-card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold">Classe</label>
          <select
            value={className}
            onChange={(e) => {
              const v = e.target.value as keyof typeof demoByClass;
              setClassName(v);
              setIndex(0);
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {Object.keys(demoByClass).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="ml-auto text-sm text-slate-600">
            Élève <span className="font-semibold text-slate-900">{index + 1}</span>/{students.length}
          </div>
        </div>

        {current ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-600">Élève</p>
              <p className="mt-1 text-xl font-bold text-[var(--accent)]">{current.name}</p>

              <div className="mt-4">
                <label className="text-sm font-semibold">Note /20</label>
                <input
                  inputMode="decimal"
                  placeholder="Ex: 14.5"
                  value={value}
                  onChange={(e) => setScores((s) => ({ ...s, [current.id]: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <p className="mt-2 text-xs text-slate-500">Astuce : navigation avec les flèches pour aller plus vite.</p>
              </div>
            </div>

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
                <p className="mt-1">Notes saisies : {Object.keys(scores).length}</p>
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
