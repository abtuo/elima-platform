import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  KeyRound,
  Users,
  Wallet,
} from "lucide-react";
import type { DashboardStats, AttendanceLevelRow } from "@/lib/dashboard/queries";
import type { SchoolKpis } from "@/lib/dashboard/kpis";

function formatFrInt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function formatTodayFr() {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function greetingName(fullName: string | null) {
  if (!fullName?.trim()) return "Administrateur";
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
}

function initials(fullName: string | null) {
  if (!fullName?.trim()) return "A";
  const p = fullName.trim().split(/\s+/).filter(Boolean);
  const a = p[0]?.[0] ?? "A";
  const b = p.length > 1 ? p[p.length - 1]?.[0] ?? "" : "";
  return `${a}${b}`.toUpperCase();
}

function MiniAreaChart({ points }: { points: { value: number }[] }) {
  const vals = points.map((p) => p.value);
  if (!vals.length) {
    return (
      <div className="flex h-36 items-center justify-center rounded-2xl bg-gradient-to-b from-emerald-50/80 to-white text-sm text-slate-500">
        Pas assez de données pour la courbe
      </div>
    );
  }
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const normRaw = vals.map((v) => (v - min) / span);
  const norm = normRaw.length === 1 ? [normRaw[0], normRaw[0]] : normRaw;
  const w = 320;
  const h = 120;
  const step = w / Math.max(1, norm.length - 1);
  const pts = norm.map((v, i) => `${i * step},${h - v * (h - 16) - 8}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon fill="url(#perfFill)" points={area} />
      <polyline fill="none" stroke="#2d5a4c" strokeWidth="2.5" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

export function AdminDashboardHome({
  schoolName,
  location,
  hasClasses,
  actorName,
  stats,
  kpis7,
  attendanceByLevel,
}: {
  schoolName: string;
  location: string;
  hasClasses: boolean;
  actorName: string | null;
  stats: DashboardStats;
  kpis7: SchoolKpis;
  attendanceByLevel: AttendanceLevelRow[];
}) {
  const forest = "#2d5a4c";
  const performancePoints =
    kpis7.gradesDailyAverage.length > 0
      ? kpis7.gradesDailyAverage.map((d) => ({ value: d.value }))
      : kpis7.attendanceDailyPresent.map((d) => ({ value: d.value }));

  const perfLabel =
    kpis7.attendancePresenceRate >= 90
      ? "Bonne"
      : kpis7.attendancePresenceRate >= 75
        ? "Correcte"
        : "À renforcer";

  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-[var(--dashboard-bg,#f4f1ea)] p-5 shadow-sm md:p-8">
    <div className="space-y-6">
      {stats.classesCount === 0 ? (
        <section className="rounded-[22px] border border-dashed border-[var(--dashboard-forest,#2d5a4c)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--dashboard-forest,#2d5a4c)]">Configuration requise</h2>
          <p className="mt-1 text-sm text-slate-600">
            Créez vos classes et matières pour activer le tableau de bord complet.
          </p>
          <Link
            href="/dashboard/setup"
            className="mt-4 inline-flex w-fit items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: forest }}
          >
            Configurer maintenant
          </Link>
        </section>
      ) : null}

      {/* Header bar — mockup tablet top */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <Image src="/logo.png" alt="Elima" width={40} height={40} className="shrink-0 rounded-full bg-white" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tableau de bord</p>
            <h1 className="truncate text-lg font-bold md:text-xl" style={{ color: forest }}>
              {schoolName}
            </h1>
            {location ? <p className="truncate text-xs text-slate-500">{location}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-[#faf8f4] px-3 py-2">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: forest }}
            >
              {initials(actorName)}
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-slate-800">Bonjour, {greetingName(actorName)}</p>
              <p className="text-xs capitalize text-slate-500">{formatTodayFr()}</p>
            </div>
          </div>
          <KeyRound className="hidden shrink-0 text-amber-600 sm:block" size={22} strokeWidth={1.75} aria-hidden />
        </div>
      </header>

      {/* KPI row — 4 cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-2xl font-bold text-slate-900">{formatFrInt(stats.studentsCount)}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">Élèves inscrits</p>
              <p className="mt-2 text-xs text-emerald-700">Données en temps réel</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <Users size={20} />
            </span>
          </div>
        </article>
        <article className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-2xl font-bold text-slate-900">{formatFrInt(stats.teachersCount)}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">Enseignants</p>
              <p className="mt-2 text-xs text-slate-500">Effectif enseignant</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
              <GraduationCap size={20} />
            </span>
          </div>
        </article>
        <article className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {kpis7.attendanceRecordsCount ? `${kpis7.attendancePresenceRate}%` : "—"}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600">Présences (7 jours)</p>
              <p className="mt-2 text-xs text-violet-700">Présents / enregistrements</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-800">
              <CheckCircle2 size={20} />
            </span>
          </div>
        </article>
        <article className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-2xl font-bold text-slate-900">—</p>
              <p className="mt-1 text-sm font-medium text-slate-600">Paiements</p>
              <p className="mt-2 text-xs text-sky-700">Module bientôt disponible</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-800">
              <Wallet size={20} />
            </span>
          </div>
        </article>
      </section>

      {/* Middle row */}
      <section className="grid gap-4 lg:grid-cols-5">
        <article className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Taux de présence (7 jours)</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Par niveau</span>
          </div>
          <div className="mt-5 space-y-4">
            {attendanceByLevel.length ? (
              attendanceByLevel.map((row) => (
                <div key={row.level} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {row.level}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-700">{row.rate}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, row.rate)}%`, backgroundColor: forest }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Aucune donnée de présence sur les 7 derniers jours. Les enseignants peuvent enregistrer l’appel depuis
                leur espace.
              </p>
            )}
          </div>
          <Link
            href="/dashboard/kpis"
            className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-[#faf8f4] px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-2">
              <ChevronDown size={16} className="text-slate-400" />
              Voir le détail
            </span>
            <ChevronRight size={18} className="text-slate-400" />
          </Link>
        </article>

        <article className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Dernières activités</h2>
          <ul className="mt-4 space-y-3">
            <li className="flex gap-3 rounded-2xl border border-slate-100 bg-[#faf8f4] p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <Users size={18} />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-slate-900">Absences & présences</p>
                <p className="text-slate-600">
                  {kpis7.attendanceAbsentCount} absence(s) · {kpis7.attendancePresentCount} présence(s) sur la période
                </p>
              </div>
            </li>
            <li className="flex gap-3 rounded-2xl border border-slate-100 bg-[#faf8f4] p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <BarChart3 size={18} />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-slate-900">Notes & évaluations</p>
                <p className="text-slate-600">
                  {formatFrInt(stats.gradesCount)} notes · {formatFrInt(stats.evaluationsCount)} évaluation(s)
                </p>
              </div>
            </li>
            <li className="flex gap-3 rounded-2xl border border-slate-100 bg-[#faf8f4] p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                <BarChart3 size={18} />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-slate-900">Messages</p>
                <p className="text-slate-600">{formatFrInt(stats.messagesCount)} message(s) échangés</p>
              </div>
            </li>
          </ul>
          <Link
            href="/dashboard/messages"
            className="mt-4 block w-full rounded-xl border border-slate-200 bg-white py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Voir tout
          </Link>
        </article>
      </section>

      {/* Bottom row */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Link
          href="/dashboard/kpis"
          className="flex items-center gap-4 rounded-[22px] border border-slate-200/80 bg-gradient-to-r from-amber-50 to-white p-5 shadow-sm transition hover:border-amber-200"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-md">
            <span className="text-2xl font-bold">!</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">Alertes & actions</p>
            <p className="mt-0.5 text-sm text-slate-700">
              {kpis7.attendanceAbsentCount} absence(s) sur 7 jours · {formatFrInt(stats.studentsCount)} élèves suivis
            </p>
          </div>
          <ChevronRight className="shrink-0 text-slate-400" size={22} />
        </Link>

        <article className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Performance globale</h2>
              <p className="mt-1 text-sm text-emerald-700">Tendance notes / activité (période récente)</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{perfLabel}</span>
          </div>
          <div className="relative mt-2">
            <MiniAreaChart points={performancePoints} />
            <p className="pointer-events-none absolute bottom-6 right-4 text-xs font-semibold text-emerald-800/90">
              {perfLabel}
            </p>
          </div>
        </article>
      </section>

      {/* Raccourcis */}
      {hasClasses ? (
        <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Accès rapide</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#faf8f4] px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-white"
              href="/dashboard/students"
            >
              <span className="inline-flex items-center gap-2">
                <BookOpen size={16} style={{ color: forest }} /> Élèves
              </span>
              <ArrowRight size={16} className="text-slate-400" />
            </Link>
            <Link
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#faf8f4] px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-white"
              href="/dashboard/teachers"
            >
              <span className="inline-flex items-center gap-2">
                <Users size={16} style={{ color: forest }} /> Enseignants
              </span>
              <ArrowRight size={16} className="text-slate-400" />
            </Link>
            <Link
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#faf8f4] px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-white"
              href="/dashboard/classes"
            >
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={16} style={{ color: forest }} /> Classes
              </span>
              <ArrowRight size={16} className="text-slate-400" />
            </Link>
          </div>
        </section>
      ) : null}
    </div>
    </div>
  );
}
