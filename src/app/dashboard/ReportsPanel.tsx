"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Mail, Users } from "lucide-react";

type Classroom = {
  id: string;
  name: string;
  level: string;
  academic_year?: string;
};

type Student = {
  id: string;
  fullName: string;
  classId: string;
  className: string;
  level: string;
  academicYear: string;
};

export function ReportsPanel() {
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadStudents() {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/students");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        if (isMounted) {
          setError(body?.message ?? "Chargement impossible");
          setLoading(false);
        }
        return;
      }
      const data = (await res.json().catch(() => null)) as
        | { classes?: Classroom[]; students?: Student[] }
        | null;
      if (!isMounted || !data) return;
      setClasses(data.classes ?? []);
      setStudents(data.students ?? []);
      setLoading(false);
      if (data.classes && data.classes.length > 0) {
        setSelectedClassId((current) => current || String(data.classes[0].id));
      }
    }
    loadStudents();
    return () => {
      isMounted = false;
    };
  }, []);

  const studentsInClass = useMemo(
    () => students.filter((s) => s.classId === selectedClassId),
    [students, selectedClassId],
  );

  const effectiveSelectedStudentId = useMemo(() => {
    if (studentsInClass.length === 0) return "";
    if (studentsInClass.some((s) => s.id === selectedStudentId)) return selectedStudentId;
    return studentsInClass[0].id;
  }, [studentsInClass, selectedStudentId]);

  const selectedStudent = studentsInClass.find((s) => s.id === effectiveSelectedStudentId);
  const reportHref = selectedStudent ? `/api/reports/${selectedStudent.id}` : "#";

  async function generateClassReports() {
    if (!selectedClassId) return;
    setBatchLoading(true);
    setStatus(null);
    setError(null);
    const res = await fetch("/api/reports/generate-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: selectedClassId, termScope: "year" }),
    });
    setBatchLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Génération impossible");
      return;
    }
    setStatus("Bulletins de la classe générés (validation en cours). ");
  }

  return (
    <article className="elima-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bulletins PDF</h2>
          <p className="mt-1 text-sm text-slate-600">
            Choisissez une classe puis un élève. Le bulletin est généré en PDF via l’API.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          <Users size={14} className="text-[var(--primary)]" />
          {studentsInClass.length} élève(s)
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Chargement des classes...</p>
      ) : null}
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {status ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{status}</p> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold text-slate-600">Classe</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} • {c.level} • {c.academic_year ?? ""}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm md:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Élève</span>
          <select
            value={effectiveSelectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            {studentsInClass.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} • {s.className}
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

        <button
          onClick={generateClassReports}
          disabled={batchLoading || studentsInClass.length === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          Générer tous les bulletins de la classe <Users size={16} />
        </button>

        <button
          disabled
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-400"
        >
          Envoyer aux parents (bientôt) <Mail size={16} />
        </button>

        {selectedStudent ? (
          <p className="text-xs text-slate-500">
            Ouvre <span className="font-mono">{reportHref}</span> dans un nouvel onglet.
          </p>
        ) : null}
      </div>
    </article>
  );
}
