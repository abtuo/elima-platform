"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Banknote, Download, Eye, KeyRound, PencilLine, Receipt, TrendingDown } from "lucide-react";
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
  photoUrl?: string | null;
  registrationNumber?: string | null;
  birthDate?: string | null;
  classId: string;
  className: string;
  level: string;
  academicYear: string;
  alerts?: StudentAlerts;
};

type StudentDetail = {
  student: StudentItem;
  summary: {
    average: number | null;
    attendanceRate: number | null;
    absent: number;
    late: number;
    totalDue: number;
    totalPaid: number;
    balance: number;
    riskLevel: string | null;
    performanceTrend: string | null;
    alertFlag: boolean;
  };
  grades: Array<{
    id: string;
    score: number;
    maxScore: number;
    coefficient: number;
    comment: string | null;
    evaluationTitle: string;
    evaluationDate: string | null;
    subjectName: string;
    teacherName: string | null;
  }>;
  attendance: Array<{
    id: string;
    status: string;
    reason: string | null;
    date: string;
  }>;
  reports: Array<{
    id: string;
    term: string;
    averageScore: number;
    attendanceRate: number;
    pdfUrl: string | null;
    createdAt: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    receiptNo: string | null;
    paidAt: string;
    label?: string | null;
    receiptHref?: string | null;
  }>;
};

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "E";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatMoney(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

function attendanceLabel(status: string) {
  if (status === "PRESENT") return "Present";
  if (status === "ABSENT") return "Absent";
  if (status === "LATE") return "Retard";
  return status;
}

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
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activationCode, setActivationCode] = useState("");
  const [activationLoading, setActivationLoading] = useState(false);

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
      const body = (await res.json().catch(() => null)) as
        | { classes?: ClassItem[]; students?: StudentItem[]; message?: string }
        | null;
      if (!res.ok) {
        throw new Error(body?.message ?? "Impossible de charger les classes/eleves.");
      }
      setClasses(body?.classes ?? []);
      setStudents(body?.students ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  const openStudentProfile = useCallback((studentId: string) => {
    const nextUrl = `/dashboard/students?student=${encodeURIComponent(studentId)}`;
    window.history.pushState({}, "", nextUrl);
    setSelectedStudentId(studentId);
  }, []);

  async function generateActivationCode() {
    if (!selectedStudentId) return;
    setActivationLoading(true); setDetailError(null); setActivationCode("");
    const response = await fetch("/api/dashboard/students/activation-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: selectedStudentId }) });
    const body = await response.json().catch(() => null) as { code?: string; message?: string } | null;
    setActivationLoading(false);
    if (!response.ok || !body?.code) return setDetailError(body?.message ?? "Génération du code impossible.");
    setActivationCode(body.code);
  }

  const closeStudentProfile = useCallback(() => {
    window.history.pushState({}, "", "/dashboard/students");
    setSelectedStudentId(null);
    setStudentDetail(null);
    setDetailError(null);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const readSelectedStudent = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedStudentId(params.get("student"));
    };
    readSelectedStudent();
    window.addEventListener("popstate", readSelectedStudent);
    return () => window.removeEventListener("popstate", readSelectedStudent);
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;
    let alive = true;
    setDetailLoading(true);
    setDetailError(null);
    fetch(`/api/dashboard/students?studentId=${encodeURIComponent(selectedStudentId)}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as (StudentDetail & { message?: string }) | null;
        if (!res.ok) throw new Error(body?.message ?? "Impossible de charger le profil eleve.");
        if (!body) throw new Error("Profil eleve introuvable.");
        if (alive) setStudentDetail(body);
      })
      .catch((err) => {
        if (alive) {
          setStudentDetail(null);
          setDetailError(err instanceof Error ? err.message : "Erreur de chargement.");
        }
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedStudentId]);

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

  if (selectedStudentId) {
    const detail = studentDetail;
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title={detail?.student.fullName ?? "Profil eleve"}
            subtitle={
              detail
                ? `${detail.student.className || "Classe"} - ${detail.student.level || "Niveau"}`
                : "Chargement du dossier scolaire et financier."
            }
          />
          <button
            type="button"
            onClick={closeStudentProfile}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour aux eleves
          </button>
        </div>

        {detailLoading ? <p className="text-sm text-slate-500">Chargement du profil...</p> : null}
        {detailError ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{detailError}</p> : null}

        {detail ? (
          <>
            <section className="elima-card">
              <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-emerald-700" /><p className="text-sm font-semibold text-emerald-900">Activation du compte élève</p></div><p className="mt-1 text-xs text-emerald-700">Génère un code individuel à remettre à l’élève. Il expire après 30 jours et ne fonctionne qu’une fois.</p></div><button type="button" onClick={generateActivationCode} disabled={activationLoading} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{activationLoading ? "Génération…" : "Générer un code"}</button></div>
                {activationCode ? <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-4 py-3"><span className="font-mono text-xl font-bold tracking-widest text-emerald-900">{activationCode}</span><button type="button" onClick={() => navigator.clipboard.writeText(activationCode)} className="text-xs font-semibold text-emerald-700">Copier</button></div> : null}
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  {detail.student.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={detail.student.photoUrl}
                      alt={`Photo de ${detail.student.fullName}`}
                      className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[var(--primary)]/10 text-lg font-bold text-[var(--primary)]">
                      {initials(detail.student.fullName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-[var(--accent)]">{detail.student.fullName}</h2>
                    <p className="text-sm text-slate-500">
                      {detail.student.registrationNumber ? `Matricule ${detail.student.registrationNumber}` : "Matricule non renseigne"}
                    </p>
                    <p className="text-sm text-slate-500">Naissance : {formatDate(detail.student.birthDate)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:min-w-80">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Moyenne</p>
                    <p className="text-xl font-bold text-slate-900">
                      {detail.summary.average !== null ? `${detail.summary.average}/20` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Presence</p>
                    <p className="text-xl font-bold text-slate-900">
                      {detail.summary.attendanceRate !== null ? `${detail.summary.attendanceRate}%` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Absences / retards</p>
                    <p className="text-xl font-bold text-slate-900">
                      {detail.summary.absent} / {detail.summary.late}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Solde</p>
                    <p className="text-xl font-bold text-slate-900">{formatMoney(detail.summary.balance)}</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <section className="elima-card space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[var(--accent)]">Historique des notes</h2>
                  <span className="text-xs font-semibold text-slate-500">{detail.grades.length} note(s)</span>
                </div>
                {detail.grades.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune note enregistree pour cet eleve.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500">
                        <tr>
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Matiere</th>
                          <th className="py-2 pr-3">Evaluation</th>
                          <th className="py-2 pr-3">Note</th>
                          <th className="py-2 pr-3">Coef.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.grades.map((grade) => (
                          <tr key={grade.id} className="border-t border-slate-100">
                            <td className="py-2 pr-3 text-slate-500">{formatDate(grade.evaluationDate)}</td>
                            <td className="py-2 pr-3 font-medium text-slate-800">{grade.subjectName}</td>
                            <td className="py-2 pr-3 text-slate-600">
                              <p>{grade.evaluationTitle}</p>
                              {grade.teacherName ? <p className="text-xs text-slate-400">{grade.teacherName}</p> : null}
                            </td>
                            <td className="py-2 pr-3 font-semibold text-slate-900">
                              {grade.score}/{grade.maxScore}
                            </td>
                            <td className="py-2 pr-3 text-slate-500">{grade.coefficient}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="elima-card space-y-3">
                <h2 className="text-lg font-semibold text-[var(--accent)]">Presence recente</h2>
                {detail.attendance.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun historique de presence.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.attendance.slice(0, 10).map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{attendanceLabel(row.status)}</p>
                          <p className="text-xs text-slate-500">{row.reason ?? "Aucun motif"}</p>
                        </div>
                        <p className="shrink-0 text-xs text-slate-500">{formatDate(row.date)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="elima-card space-y-3">
                <h2 className="text-lg font-semibold text-[var(--accent)]">Bulletins</h2>
                {detail.reports.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun bulletin disponible.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.reports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{report.term}</p>
                          <p className="text-xs text-slate-500">
                            Moyenne {report.averageScore}/20 - Presence {report.attendanceRate}%
                          </p>
                        </div>
                        {report.pdfUrl ? (
                          <a
                            href={report.pdfUrl}
                            className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden />
                            PDF
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="elima-card space-y-3">
                <h2 className="text-lg font-semibold text-[var(--accent)]">Paiements</h2>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Du</p>
                    <p className="font-bold text-slate-900">{formatMoney(detail.summary.totalDue)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Paye</p>
                    <p className="font-bold text-slate-900">{formatMoney(detail.summary.totalPaid)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Reste</p>
                    <p className="font-bold text-slate-900">{formatMoney(detail.summary.balance)}</p>
                  </div>
                </div>
                {detail.payments.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun paiement enregistre.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.payments.slice(0, 6).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{formatMoney(payment.amount)}</p>
                          <p className="text-xs text-slate-500">
                            {payment.method} - {formatDate(payment.paidAt)}
                          </p>
                        </div>
                        {payment.receiptHref ? (
                          <a
                            href={payment.receiptHref}
                            className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Receipt className="h-3.5 w-3.5" aria-hidden />
                            Recu
                          </a>
                        ) : (
                          <span className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
                            {payment.label ?? payment.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        ) : null}
      </div>
    );
  }

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
                    <div className="flex min-w-0 items-start gap-2.5">
                      {student.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={student.photoUrl}
                          alt={`Photo de ${student.fullName}`}
                          className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
                          {initials(student.fullName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-700">{student.fullName}</p>
                        <p className="text-xs text-slate-500">{student.className} - {student.level}</p>
                        <p className="hidden text-xs text-slate-500">
                          {student.className} Â· {student.level}
                        </p>
                      </div>
                    </div>
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
                  <p className="hidden text-xs text-slate-500">
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
                  <button
                    type="button"
                    onClick={() => openStudentProfile(student.id)}
                    className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-[var(--primary)] transition hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    Voir profil
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
