"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Banknote, PencilLine, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

const PREFERRED_ACADEMIC_YEAR = "2025 - 2026";

type ClassItem = {
  id: string;
  name: string;
  level: string | null;
  academic_year: string | null;
};

type StudentAlerts = {
  lowGrades: boolean;
  highAbsences: boolean;
  paymentPending: boolean;
};

type StudentItem = {
  id: string;
  fullName: string;
  registrationNumber?: string | null;
  birthDate?: string | null;
  classId: string;
  className: string;
  level: string;
  academicYear: string;
  alerts?: StudentAlerts;
};

function academicYearKey(y: string | null | undefined): string {
  return String(y ?? "")
    .replace(/\s+/g, "")
    .replace(/[–—-]/g, "");
}

function academicYearsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  return academicYearKey(a) === academicYearKey(b);
}

function uniqueAcademicYearOptions(classes: ClassItem[]): string[] {
  const byKey = new Map<string, string>();
  for (const c of classes) {
    const raw = c.academic_year?.trim();
    if (!raw) continue;
    const k = academicYearKey(raw);
    if (!byKey.has(k)) byKey.set(k, raw);
  }
  return Array.from(byKey.values()).sort((a, b) => academicYearKey(b).localeCompare(academicYearKey(a)));
}

function pickDefaultAcademicYear(options: string[]): string {
  if (options.length === 0) return PREFERRED_ACADEMIC_YEAR;
  const preferredKey = academicYearKey(PREFERRED_ACADEMIC_YEAR);
  const match = options.find((y) => academicYearKey(y) === preferredKey);
  return match ?? options[0];
}

export default function DashboardStudentsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const academicYearOptions = useMemo(() => uniqueAcademicYearOptions(classes), [classes]);

  const classesForYear = useMemo(
    () => classes.filter((c) => academicYearsEqual(c.academic_year, selectedAcademicYear)),
    [classes, selectedAcademicYear],
  );

  const levels = useMemo(() => {
    const unique = new Set(
      classesForYear.map((item) => item.level).filter((value): value is string => Boolean(value)),
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "fr"));
  }, [classesForYear]);

  const filteredClasses = useMemo(() => {
    if (!selectedLevel) return [];
    return classesForYear.filter((item) => item.level === selectedLevel);
  }, [classesForYear, selectedLevel]);

  const effectiveSelectedClassId = useMemo(() => {
    if (filteredClasses.length === 0) return "";
    if (filteredClasses.some((item) => item.id === selectedClassId)) return selectedClassId;
    return filteredClasses[0].id;
  }, [filteredClasses, selectedClassId]);

  const studentsInClass = useMemo(
    () => students.filter((student) => student.classId === effectiveSelectedClassId),
    [students, effectiveSelectedClassId],
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/students");
      if (!res.ok) {
        throw new Error("Impossible de charger les classes/eleves.");
      }
      const body = (await res.json()) as { classes?: ClassItem[]; students?: StudentItem[] };
      setClasses(body.classes ?? []);
      setStudents(body.students ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (classes.length === 0) return;
    setSelectedAcademicYear((cur) => {
      const opts = uniqueAcademicYearOptions(classes);
      if (opts.length === 0) return cur || PREFERRED_ACADEMIC_YEAR;
      if (cur && opts.some((y) => academicYearsEqual(y, cur))) {
        return opts.find((y) => academicYearsEqual(y, cur)) ?? cur;
      }
      return pickDefaultAcademicYear(opts);
    });
  }, [classes]);

  useEffect(() => {
    if (levels.length === 0) {
      if (selectedLevel) setSelectedLevel("");
      return;
    }
    if (!selectedLevel || !levels.includes(selectedLevel)) {
      setSelectedLevel(levels[0] ?? "");
      setSelectedClassId("");
    }
  }, [levels, selectedLevel]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Élèves"
        subtitle="Filtrez par année scolaire, niveau et classe pour consulter la liste et les alertes. L’import d’une liste se fait depuis l’onglet Classes."
      />

      <section className="elima-card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold text-slate-600">Année scolaire</span>
              <select
                value={
                  academicYearOptions.some((y) => academicYearsEqual(y, selectedAcademicYear))
                    ? (academicYearOptions.find((y) => academicYearsEqual(y, selectedAcademicYear)) ??
                      selectedAcademicYear)
                    : selectedAcademicYear
                }
                onChange={(event) => {
                  setSelectedAcademicYear(event.target.value);
                  setSelectedLevel("");
                  setSelectedClassId("");
                }}
                disabled={academicYearOptions.length === 0}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100"
              >
                {academicYearOptions.length === 0 ? (
                  <option value="">Aucune année</option>
                ) : (
                  academicYearOptions.map((y) => (
                    <option key={academicYearKey(y)} value={y}>
                      {y}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold text-slate-600">Niveau</span>
              <select
                value={levels.includes(selectedLevel) ? selectedLevel : levels[0] ?? ""}
                onChange={(event) => {
                  setSelectedLevel(event.target.value);
                  setSelectedClassId("");
                }}
                disabled={!selectedAcademicYear || levels.length === 0}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100"
              >
                {levels.length === 0 ? (
                  <option value="">Aucun niveau</option>
                ) : (
                  levels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold text-slate-600">Classe</span>
              <select
                value={effectiveSelectedClassId}
                onChange={(event) => {
                  setSelectedClassId(event.target.value);
                }}
                disabled={!selectedLevel || filteredClasses.length === 0}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100"
              >
                {filteredClasses.length === 0 ? (
                  <option value="">Aucune classe</option>
                ) : (
                  filteredClasses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          <Link
            href="/dashboard/classes"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <PencilLine className="h-4 w-4" aria-hidden />
            Modifier la classe
          </Link>
        </div>

        {loading ? <p className="text-sm text-slate-500">Chargement des données…</p> : null}
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </section>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold text-[var(--accent)]">Élèves de la classe sélectionnée</h2>
        {studentsInClass.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun élève enregistré pour cette classe.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {studentsInClass.map((student) => {
              const a = student.alerts;
              const hasAlert =
                a && (a.lowGrades || a.highAbsences || a.paymentPending);
              return (
                <div
                  key={student.id}
                  className={`rounded-xl border bg-white px-3 py-2 ${
                    hasAlert ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700">{student.fullName}</p>
                    {hasAlert ? (
                      <span
                        className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800"
                        title="Voir les indicateurs ci-dessous"
                      >
                        <AlertTriangle className="h-3 w-3" aria-hidden />
                        Alerte
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {student.className} · {student.level}
                  </p>
                  {a && (a.lowGrades || a.highAbsences || a.paymentPending) ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {a.lowGrades ? (
                        <li className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                          <TrendingDown className="h-3 w-3 shrink-0" aria-hidden />
                          Moyenne faible
                        </li>
                      ) : null}
                      {a.highAbsences ? (
                        <li className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-900">
                          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                          Absences élevées
                        </li>
                      ) : null}
                      {a.paymentPending ? (
                        <li className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          <Banknote className="h-3 w-3 shrink-0" aria-hidden />
                          Impayé (à venir)
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
