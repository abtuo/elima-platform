"use client";

import { useMemo, useState } from "react";

type Student = { id: string; name: string };

const demo: Record<string, Student[]> = {
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

type Status = "PRESENT" | "ABSENT" | "LATE";

export default function TeacherAttendancePage() {
  const [className, setClassName] = useState<keyof typeof demo>("6e A");
  const students = useMemo(() => [...demo[className]].sort((a, b) => a.name.localeCompare(b.name)), [className]);
  const [status, setStatus] = useState<Record<string, Status>>({});

  return (
    <div className="space-y-6">
      <header className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Présences</h1>
        <p className="mt-1 text-sm text-slate-600">Appel rapide par classe (démo UI).</p>
      </header>

      <section className="elima-card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold">Classe</label>
          <select value={className} onChange={(e) => setClassName(e.target.value as keyof typeof demo)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
            {Object.keys(demo).map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <div className="ml-auto text-sm text-slate-600">{students.length} élèves</div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-semibold">{s.name}</td>
                  <td className="px-4 py-3">
                    <select
                      value={status[s.id] ?? "PRESENT"}
                      onChange={(e) => setStatus((st) => ({ ...st, [s.id]: e.target.value as Status }))}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="PRESENT">Présent</option>
                      <option value="ABSENT">Absent</option>
                      <option value="LATE">Retard</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Enregistrer (démo)
        </button>
      </section>
    </div>
  );
}
