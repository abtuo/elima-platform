"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Users } from "lucide-react";
import { demoStudents } from "@/lib/demo-data";

type Student = (typeof demoStudents)[number];

function uniqueClasses(students: Student[]) {
  return Array.from(new Set(students.map((s) => s.className))).sort((a, b) => a.localeCompare(b));
}

export function ReportsPanel() {
  const classes = useMemo(() => uniqueClasses(demoStudents), []);
  const [selectedClass, setSelectedClass] = useState<string>(classes[0] ?? "");
  const studentsInClass = useMemo(
    () => demoStudents.filter((s) => s.className === selectedClass),
    [selectedClass],
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(studentsInClass[0]?.id ?? "");

  // Keep a valid student selected when the class changes.
  useEffect(() => {
    if (studentsInClass.length === 0) {
      setSelectedStudentId("");
      return;
    }

    if (!studentsInClass.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(studentsInClass[0].id);
    }
  }, [studentsInClass, selectedStudentId]);

  const selectedStudent = studentsInClass.find((s) => s.id === selectedStudentId);
  const reportHref = selectedStudent ? `/api/reports/${selectedStudent.id}` : "#";

  return (
    <article className="elima-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bulletins PDF (démo)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Choisissez une classe puis un élève. Le bulletin est généré en PDF via l’API.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          <Users size={14} className="text-[var(--primary)]" />
          {studentsInClass.length} élève(s)
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold text-slate-600">Classe</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm md:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Élève</span>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            {studentsInClass.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} • Moy {s.average}/20 • Présence {s.attendanceRate}%
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={reportHref}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!selectedStudent}
          className={`inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 ${
            !selectedStudent ? "pointer-events-none opacity-60" : ""
          }`}
        >
          Générer le bulletin PDF <FileText size={16} />
        </Link>

        {selectedStudent ? (
          <p className="text-xs text-slate-500">
            Ouvre <span className="font-mono">{reportHref}</span> dans un nouvel onglet.
          </p>
        ) : null}
      </div>
    </article>
  );
}
