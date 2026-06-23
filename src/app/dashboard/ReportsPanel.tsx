"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Mail, Trophy, Users } from "lucide-react";

type RankingRow = {
  studentId: string;
  fullName: string;
  average: number | null;
  attendanceRate: number | null;
  rank: number;
};

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
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [generatedStudentIds, setGeneratedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<string>("Trimestre 3");
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [classAverage, setClassAverage] = useState<number | null>(null);

  const terms = ["Trimestre 1", "Trimestre 2", "Trimestre 3"];

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
      const loadedClasses = data.classes ?? [];
      setClasses(loadedClasses);
      setStudents(data.students ?? []);
      setLoading(false);
      if (loadedClasses.length > 0) {
        const firstLevel = loadedClasses[0].level ?? "";
        setSelectedLevel((current) => current || firstLevel);
        const firstClassOfLevel = loadedClasses.find((c) => (c.level ?? "") === firstLevel) ?? loadedClasses[0];
        setSelectedClassId((current) => current || String(firstClassOfLevel.id));
      }
    }
    loadStudents();
    return () => {
      isMounted = false;
    };
  }, []);

  const levels = useMemo(() => {
    const unique = new Set(classes.map((c) => c.level).filter((value): value is string => Boolean(value)));
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "fr"));
  }, [classes]);

  const effectiveSelectedLevel = selectedLevel || levels[0] || "";

  const filteredClasses = useMemo(() => {
    if (!effectiveSelectedLevel) return [];
    return classes.filter((c) => c.level === effectiveSelectedLevel);
  }, [classes, effectiveSelectedLevel]);

  const effectiveSelectedClassId = useMemo(() => {
    if (filteredClasses.length === 0) return "";
    if (filteredClasses.some((c) => c.id === selectedClassId)) return selectedClassId;
    return filteredClasses[0].id;
  }, [filteredClasses, selectedClassId]);

  const studentsInClass = useMemo(
    () => students.filter((s) => s.classId === effectiveSelectedClassId),
    [students, effectiveSelectedClassId],
  );

  useEffect(() => {
    if (!effectiveSelectedClassId) {
      setRanking([]);
      setClassAverage(null);
      return;
    }
    let isMounted = true;
    setRankingLoading(true);
    const params = new URLSearchParams({ classId: effectiveSelectedClassId, term: selectedTerm });
    fetch(`/api/dashboard/class-ranking?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ranking?: RankingRow[]; classAverage?: number | null } | null) => {
        if (!isMounted) return;
        setRanking(data?.ranking ?? []);
        setClassAverage(data?.classAverage ?? null);
      })
      .catch(() => {
        if (isMounted) {
          setRanking([]);
          setClassAverage(null);
        }
      })
      .finally(() => {
        if (isMounted) setRankingLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [effectiveSelectedClassId, selectedTerm]);

  const generatedStudents = useMemo(
    () => studentsInClass.filter((student) => generatedStudentIds.includes(student.id)),
    [studentsInClass, generatedStudentIds],
  );

  async function handleGenerateClassReports() {
    if (!effectiveSelectedClassId) return;
    setBatchLoading(true);
    setStatus(null);
    setError(null);
    if (studentsInClass.length === 0) {
      setBatchLoading(false);
      setError("Aucun élève trouvé dans cette classe.");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    setGeneratedStudentIds(studentsInClass.map((student) => student.id));
    setBatchLoading(false);
    setStatus(`Bulletins préparés pour ${studentsInClass.length} élève(s).`);
  }

  return (
    <article className="elima-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bulletins PDF</h2>
          <p className="mt-1 text-sm text-slate-600">
            Choisissez le trimestre, un niveau puis une classe pour générer les bulletins de tous les élèves.
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

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold text-slate-600">Trimestre</span>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            {terms.map((term) => (
              <option key={term} value={term}>
                {term}
                {term === "Trimestre 3" ? " (bulletin final)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold text-slate-600">Niveau</span>
          <select
            value={effectiveSelectedLevel}
            onChange={(e) => {
              const nextLevel = e.target.value;
              setSelectedLevel(nextLevel);
              const nextClass = classes.find((c) => c.level === nextLevel);
              setSelectedClassId(nextClass?.id ?? "");
              setGeneratedStudentIds([]);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Sélectionner un niveau</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm md:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Classe</span>
          <select
            value={effectiveSelectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setGeneratedStudentIds([]);
            }}
            disabled={!effectiveSelectedLevel}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Sélectionner une classe</option>
            {filteredClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} • {c.level} • {c.academic_year ?? ""}
              </option>
            ))}
          </select>
        </label>

      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={handleGenerateClassReports}
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

      </div>

      <section className="mt-5 space-y-3 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-700">Bulletins générés (aperçu classe)</h3>
        {generatedStudents.length === 0 ? (
          <p className="text-sm text-slate-500">
            Lancez la génération pour afficher les bulletins de la classe sélectionnée.
          </p>
        ) : (
          <div className="space-y-2">
            {generatedStudents.map((student) => (
              <div
                key={student.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{student.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {student.className} • {student.level} • {student.academicYear}
                  </p>
                </div>
                <Link
                  href={`/api/reports/${student.id}?term=${encodeURIComponent(selectedTerm)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                  Voir le PDF <FileText size={14} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 space-y-3 border-t border-slate-200 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Trophy size={16} className="text-[var(--secondary,#FFD700)]" />
            Classement de la classe — {selectedTerm}
          </h3>
          {classAverage != null ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Moyenne de classe : {classAverage.toFixed(2)}/20
            </span>
          ) : null}
        </div>

        {rankingLoading ? (
          <p className="text-sm text-slate-500">Calcul du classement...</p>
        ) : ranking.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune note pour ce trimestre dans cette classe.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Rang</th>
                  <th className="px-3 py-2 text-left font-semibold">Élève</th>
                  <th className="px-3 py-2 text-right font-semibold">Moyenne</th>
                  <th className="px-3 py-2 text-right font-semibold">Présence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranking.map((row) => (
                  <tr key={row.studentId} className={row.rank <= 3 ? "bg-amber-50/50" : ""}>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          row.rank === 1
                            ? "bg-[var(--secondary,#FFD700)] text-slate-900"
                            : row.rank <= 3
                              ? "bg-amber-200 text-slate-900"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {row.rank}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-700">{row.fullName}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">
                      {row.average != null ? `${row.average.toFixed(2)}/20` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {row.attendanceRate != null ? `${row.attendanceRate}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </article>
  );
}
