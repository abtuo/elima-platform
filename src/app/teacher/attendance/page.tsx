"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";
import { EditableTable } from "@/components/ui/EditableTable";

type Student = { id: string; name: string };

type Status = "PRESENT" | "ABSENT" | "LATE";

export default function TeacherAttendancePage() {
  const { selectedClassId, classes, students: contextStudents } = useTeacherContext();
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const students = useMemo(
    () =>
      contextStudents
        .filter((s) => s.classId === selectedClassId)
        .map((s) => ({ id: s.id, name: s.fullName }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [contextStudents, selectedClassId],
  );
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [history, setHistory] = useState<{ dateISO: string; present: number; absent: number; late: number }[]>([
    { dateISO: "2026-02-24", present: 28, absent: 3, late: 1 },
    { dateISO: "2026-02-25", present: 29, absent: 2, late: 1 },
  ]);

  return (
    <div className="space-y-6">
      <ProgressHeader title="Présences" subtitle="Appel rapide par classe + historique consultable." />

      <section className="elima-card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Classe : {selectedClass?.name ?? "Aucune"}
          </div>
          <div className="ml-auto text-sm text-slate-600">{students.length} élèves</div>
        </div>

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
              key: "status",
              header: "Statut",
              cell: (s) => (
                <select
                  value={status[s.id] ?? "PRESENT"}
                  onChange={(e) => setStatus((st) => ({ ...st, [s.id]: e.target.value as Status }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="PRESENT">Présent</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Retard</option>
                </select>
              ),
            },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              // demo: append to history
              const present = students.filter((s) => (status[s.id] ?? "PRESENT") === "PRESENT").length;
              const absent = students.filter((s) => (status[s.id] ?? "PRESENT") === "ABSENT").length;
              const late = students.filter((s) => (status[s.id] ?? "PRESENT") === "LATE").length;
              setHistory((h) => [{ dateISO: new Date().toISOString().slice(0, 10), present, absent, late }, ...h]);
            }}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Enregistrer
          </button>
          <Link
            href="/teacher/timetable"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Retour emploi du temps
          </Link>
        </div>
      </section>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Historique</h2>
        <EditableTable
          rows={history}
          rowKey={(r) => r.dateISO}
          columns={[
            { key: "date", header: "Date", cell: (r) => <span className="font-semibold">{r.dateISO}</span> },
            { key: "p", header: "Présents", cell: (r) => r.present, className: "whitespace-nowrap" },
            { key: "a", header: "Absents", cell: (r) => r.absent, className: "whitespace-nowrap" },
            { key: "l", header: "Retards", cell: (r) => r.late, className: "whitespace-nowrap" },
          ]}
        />
      </section>
    </div>
  );
}
