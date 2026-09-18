"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Plus,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type { AdminCockpitData, AttendanceSchoolDayBreakdown, ClassPerformanceRow, LevelPerformanceSeries } from "@/lib/dashboard/cockpit";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { AlertCard } from "@/components/dashboard/AlertCard";
import { RiskStudentCard } from "@/components/dashboard/RiskStudentCard";

function formatFrInt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function formatPct(n: number) {
  return `${Math.round(n * 10) / 10}%`;
}

function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function trendLabel(direction: AdminCockpitData["kpis"]["todayPresenceTrend"], suffix: string) {
  if (direction === "up") return `${suffix} en hausse`;
  if (direction === "down") return `${suffix} en baisse`;
  return "Stable";
}

const LEVEL_COLORS = ["#2E8B57", "#2563EB", "#F59E0B", "#DC2626", "#7C3AED", "#0F766E", "#DB2777", "#64748B"];

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlX = previous.x + (point.x - previous.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function PerformanceChart({ series }: { series: LevelPerformanceSeries[] }) {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const visibleSeries = useMemo(
    () => (selectedLevel ? series.filter((s) => s.level === selectedLevel) : series),
    [selectedLevel, series],
  );
  const labels = visibleSeries[0]?.points.map((p) => p.label) ?? [];
  if (visibleSeries.length === 0 || labels.length < 2) {
    return <EmptyState title="Pas assez de données" description="Les moyennes apparaîtront après les premières évaluations." />;
  }
  const w = 640;
  const h = 220;
  const allVals = visibleSeries.flatMap((s) => s.points.map((p) => p.average).filter((v): v is number => v !== null));
  const min = Math.max(0, Math.min(...allVals) - 0.8);
  const max = Math.min(20, Math.max(...allVals) + 0.8);
  const span = max - min || 1;
  const chartTop = 12;
  const chartBottom = h - 28;
  const chartLeft = 48;
  const chartRight = w - 14;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  const step = labels.length > 1 ? chartWidth / (labels.length - 1) : chartWidth;
  const yFor = (value: number) => chartBottom - ((value - min) / span) * chartHeight;
  const xFor = (index: number) => chartLeft + index * step;
  const tickValues = [Math.ceil(max), Math.round((min + max) / 2), Math.floor(min)];

  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-50/60 via-white to-sky-50/60 p-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full drop-shadow-sm" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="performanceBackdrop" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ECFDF5" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width={w} height={h} rx="18" fill="url(#performanceBackdrop)" />
        {tickValues.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line x1={chartLeft} x2={chartRight} y1={y} y2={y} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="5 8" />
              <text x={8} y={y + 4} fontSize="10" fill="#94A3B8">
                {tick}/20
              </text>
            </g>
          );
        })}
        {visibleSeries.map((s) => {
          const seriesIndex = series.findIndex((item) => item.level === s.level);
          const color = LEVEL_COLORS[seriesIndex % LEVEL_COLORS.length];
          const points = s.points
            .map((p, i) => {
              if (p.average === null) return null;
              return { x: xFor(i), y: yFor(p.average), value: p.average, label: p.label };
            })
            .filter((p): p is { x: number; y: number; value: number; label: string } => p !== null);
          return (
            <g key={s.level}>
              <path
                d={smoothPath(points)}
                fill="none"
                stroke={color}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.92"
                filter="url(#softGlow)"
              />
              {points.map((point, index) => (
                <g key={`${s.level}-${index}`} className="group cursor-pointer">
                  <title>{`${s.level} · ${point.label} : ${point.value.toFixed(1)}/20`}</title>
                  <circle cx={point.x} cy={point.y} r="12" fill="transparent" />
                  <circle cx={point.x} cy={point.y} r="5.2" fill="white" stroke={color} strokeWidth="2.6" />
                  <circle cx={point.x} cy={point.y} r="2.2" fill={color} />
                  <g className="opacity-0 transition-opacity group-hover:opacity-100">
                    <rect
                      x={Math.max(4, Math.min(w - 128, point.x - 62))}
                      y={Math.max(8, point.y - 44)}
                      width="124"
                      height="34"
                      rx="10"
                      fill="white"
                      stroke="#E2E8F0"
                    />
                    <text
                      x={Math.max(12, Math.min(w - 120, point.x - 54))}
                      y={Math.max(22, point.y - 28)}
                      fontSize="10"
                      fontWeight="700"
                      fill="#0F172A"
                    >
                      {s.level}
                    </text>
                    <text
                      x={Math.max(12, Math.min(w - 120, point.x - 54))}
                      y={Math.max(36, point.y - 14)}
                      fontSize="10"
                      fill="#475569"
                    >
                      {point.label} · {point.value.toFixed(1)}/20
                    </text>
                  </g>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 grid pl-12 pr-3 text-center text-[11px] text-slate-500" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
        {series.map((s, index) => {
          const active = selectedLevel === s.level;
          const muted = selectedLevel !== null && !active;
          return (
          <button
            key={s.level}
            type="button"
            onClick={() => setSelectedLevel((current) => (current === s.level ? null : s.level))}
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 shadow-sm ring-1 transition ${
              active
                ? "bg-white text-slate-900 ring-slate-300"
                : muted
                  ? "bg-white/50 text-slate-400 opacity-60 ring-slate-100"
                  : "bg-white/80 text-slate-600 ring-slate-100 hover:bg-white"
            }`}
            aria-pressed={active}
            title={active ? "Réafficher tous les niveaux" : `Filtrer sur ${s.level}`}
          >
            <span className="h-0.5 w-5 rounded" style={{ backgroundColor: LEVEL_COLORS[index % LEVEL_COLORS.length] }} />
            {s.level}
            <span className="font-semibold text-slate-800">
              {Math.max(...s.points.map((p) => p.average ?? 0)).toFixed(1)}
            </span>
          </button>
          );
        })}
        {selectedLevel ? (
          <button
            type="button"
            onClick={() => setSelectedLevel(null)}
            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            Tous les niveaux
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ClassBarList({
  rows,
  tone,
  emptyLabel,
}: {
  rows: ClassPerformanceRow[];
  tone: "success" | "warning";
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">{emptyLabel}</p>;
  }
  const max = Math.max(...rows.map((r) => r.average), 20);
  const barClass = tone === "success" ? "bg-emerald-500" : "bg-amber-500";
  const valueClass = tone === "success" ? "text-emerald-700" : "text-amber-700";
  return (
    <ul className="mt-3 space-y-3">
      {rows.map((c) => (
        <li key={c.classId} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate font-medium text-slate-800">
              {c.level} · {c.className}
            </span>
            <span className={`shrink-0 font-semibold ${valueClass}`}>{c.average}/20</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${Math.max(8, (c.average / max) * 100)}%` }} />
          </div>
          <p className="text-[11px] text-slate-500">{formatFrInt(c.studentCount)} élève(s)</p>
        </li>
      ))}
    </ul>
  );
}

const ATTENDANCE_PIE_SEGMENTS = [
  { key: "present" as const, label: "Présents", color: "#10b981" },
  { key: "justifiedAbsent" as const, label: "Abs. justifiées", color: "#3b82f6" },
  { key: "unjustifiedAbsent" as const, label: "Abs. non justif.", color: "#f43f5e" },
  { key: "late" as const, label: "Retards", color: "#f59e0b" },
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describePieSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function formatSchoolDayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function AttendanceDayPieChart({ day }: { day: AttendanceSchoolDayBreakdown }) {
  const total =
    day.present + day.justifiedAbsent + day.unjustifiedAbsent + day.late;
  const size = 88;
  const cx = size / 2;
  const cy = size / 2;
  const r = 34;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/60 p-3">
        <p className="text-xs font-semibold text-slate-700">{formatSchoolDayLabel(day.date)}</p>
        <div
          className="mt-2 flex items-center justify-center rounded-full border border-dashed border-slate-200 bg-white text-[10px] text-slate-400"
          style={{ width: size, height: size }}
        >
          Aucune donnée
        </div>
      </div>
    );
  }

  const slices = ATTENDANCE_PIE_SEGMENTS.reduce<Array<(typeof ATTENDANCE_PIE_SEGMENTS)[number] & {
    value: number;
    start: number;
    end: number;
  }>>((acc, segment) => {
    const value = day[segment.key];
    const angle = (value / total) * 360;
    const start = acc.at(-1)?.end ?? 0;
    const end = start + angle;
    if (value > 0) acc.push({ ...segment, value, start, end });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <p className="text-xs font-semibold text-slate-700">{formatSchoolDayLabel(day.date)}</p>
      <svg viewBox={`0 0 ${size} ${size}`} className="mt-2 h-[88px] w-[88px]" aria-hidden>
        {slices.map((slice) => (
          <path
            key={slice.key}
            d={describePieSlice(cx, cy, r, slice.start, slice.end)}
            fill={slice.color}
            stroke="#fff"
            strokeWidth="1"
          />
        ))}
      </svg>
      <ul className="mt-2 w-full space-y-0.5 text-[10px] text-slate-600">
        {ATTENDANCE_PIE_SEGMENTS.map((segment) => {
          const value = day[segment.key];
          if (value === 0) return null;
          const pct = Math.round((value / total) * 100);
          return (
            <li key={segment.key} className="flex items-center justify-between gap-2">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                <span className="truncate">{segment.label}</span>
              </span>
              <span className="shrink-0 font-semibold text-slate-800">
                {value} ({pct}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AttendanceSchoolDayCharts({ days }: { days: AttendanceSchoolDayBreakdown[] }) {
  if (days.length === 0) {
    return (
      <EmptyState
        title="Aucune présence enregistrée"
        description="Les camemberts des 4 derniers jours d'école s'afficheront ici."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {days.map((day) => (
        <AttendanceDayPieChart key={day.date} day={day} />
      ))}
    </div>
  );
}

function notifStatusLabel(status: string) {
  if (status === "SENT") return "Envoyé";
  if (status === "FAILED") return "Échec";
  return "En attente";
}

const recoSeverityStyles: Record<"HIGH" | "MEDIUM" | "LOW", string> = {
  HIGH: "border-rose-200 bg-rose-50/60",
  MEDIUM: "border-amber-200 bg-amber-50/60",
  LOW: "border-slate-200 bg-slate-50/60",
};

export function AdminDashboardHome({ data }: { data: AdminCockpitData }) {
  const { stats, kpis, actionItems, academicPerformance, attendance, atRiskStudents, communication, recentActivity, recommendations } =
    data;
  const location = [stats.schoolCity, stats.schoolCountry].filter(Boolean).join(", ");
  const schoolName = stats.schoolName || "École (à configurer)";

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between md:p-5">
        <div className="flex items-center gap-3">
          {stats.schoolLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stats.schoolLogoUrl}
              alt={`Logo ${schoolName}`}
              className="h-12 w-12 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1 shadow-sm md:h-14 md:w-14"
            />
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tableau de bord</p>
            <h1 className="mt-0.5 text-xl font-bold text-slate-900 md:text-2xl">{schoolName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              {location ? <span>{location}</span> : null}
              {data.currentTermName ? (
                <>
                  {location ? <span className="text-slate-300">·</span> : null}
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={14} />
                    {data.currentTermName}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/setup"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus size={16} />
            Nouvelle action
          </Link>
        </div>
      </header>

      {stats.classesCount === 0 ? (
        <section className="rounded-2xl border border-dashed border-[var(--primary)]/40 bg-[var(--primary)]/5 p-4">
          <p className="font-semibold text-slate-900">Configuration requise</p>
          <p className="mt-1 text-sm text-slate-600">
            Créez d&apos;abord les classes et matières pour activer le cockpit de pilotage.
          </p>
          <Link
            href="/dashboard/setup"
            className="mt-3 inline-flex items-center rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white"
          >
            Configurer maintenant
          </Link>
        </section>
      ) : null}

      {/* KPI row */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Élèves actifs"
          value={formatFrInt(kpis.activeStudents)}
          trend={kpis.studentsTrend}
          trendLabel="Effectif stable"
          icon={<GraduationCap size={20} />}
          status="default"
        />
        <StatCard
          title="Enseignants"
          value={formatFrInt(kpis.teachers)}
          trend="neutral"
          trendLabel={`${formatFrInt(stats.classesCount)} classes`}
          icon={<Users size={20} />}
          status="default"
        />
        <StatCard
          title="Présence aujourd'hui"
          value={formatPct(kpis.todayPresenceRate)}
          trend={kpis.todayPresenceTrend}
          trendLabel={trendLabel(kpis.todayPresenceTrend, "Assiduité")}
          icon={<UserCheck size={20} />}
          status={kpis.todayPresenceRate >= 90 ? "success" : kpis.todayPresenceRate >= 75 ? "warning" : "danger"}
        />
        <StatCard
          title="Moyenne générale"
          value={kpis.schoolAverage !== null ? `${kpis.schoolAverage}/20` : "—"}
          trend={
            kpis.schoolAverageTrendPct !== null
              ? kpis.schoolAverageTrendPct > 0
                ? "up"
                : kpis.schoolAverageTrendPct < 0
                  ? "down"
                  : "neutral"
              : "neutral"
          }
          trendLabel={
            kpis.schoolAverageTrendPct !== null
              ? `${kpis.schoolAverageTrendPct > 0 ? "+" : ""}${kpis.schoolAverageTrendPct}% vs période précédente`
              : "En attente de tendance"
          }
          icon={<TrendingUp size={20} />}
          status="success"
        />
      </section>

      {/* Main grid */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4 xl:col-span-2">
          <DashboardSection
            title="Performance académique"
            subtitle="Moyenne mensuelle par niveau"
            action={
              academicPerformance.comparisonPct !== null ? (
                <span className="text-sm font-semibold text-[var(--primary)]">
                  {academicPerformance.comparisonPct > 0 ? "+" : ""}
                  {academicPerformance.comparisonPct}% vs année précédente à date
                </span>
              ) : null
            }
          >
            <PerformanceChart series={academicPerformance.levelSeries} />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Top classes par niveau</p>
                <ClassBarList rows={academicPerformance.topClasses} tone="success" emptyLabel="Aucune donnée" />
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Classes à surveiller</p>
                <ClassBarList rows={academicPerformance.watchClasses} tone="warning" emptyLabel="Aucune classe sous 12/20" />
              </div>
            </div>
          </DashboardSection>

          <DashboardSection title="Présence & assiduité" subtitle="Situation du jour et 4 derniers jours d'école">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
                <p className="text-xs text-slate-500">Taux du jour</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{formatPct(attendance.todayRate)}</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-center">
                <p className="text-xs text-slate-500">Absents</p>
                <p className="mt-1 text-2xl font-bold text-rose-700">{formatFrInt(attendance.todayAbsent)}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-center">
                <p className="text-xs text-slate-500">Retards</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{formatFrInt(attendance.todayLate)}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">4 derniers jours d&apos;école</p>
              <AttendanceSchoolDayCharts days={attendance.recentSchoolDays} />
            </div>

            {attendance.topAbsentClasses.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Classes avec le plus d&apos;absences</p>
                <ul className="space-y-1.5">
                  {attendance.topAbsentClasses.map((c) => (
                    <li key={c.className} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-800">{c.className}</span>
                      <span className="font-semibold text-rose-600">{c.absentCount} absent{c.absentCount > 1 ? "s" : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </DashboardSection>

          <DashboardSection title="Activité récente" subtitle="Dernières actions sur la plateforme">
            {recentActivity.length === 0 ? (
              <EmptyState title="Aucune activité récente" description="Les notifications et bulletins apparaîtront ici." />
            ) : (
              <ul className="space-y-2">
                {recentActivity.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{a.label}</p>
                      <p className="truncate text-xs text-slate-500">{a.detail}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400">{formatRelativeTime(a.time)}</span>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <DashboardSection
            title="À traiter aujourd'hui"
            subtitle="Alertes prioritaires"
            action={
              actionItems.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                  <AlertTriangle size={12} />
                  {actionItems.length}
                </span>
              ) : null
            }
          >
            {actionItems.length === 0 ? (
              <EmptyState
                title="Rien à signaler"
                description="Toutes les alertes sont traitées. Bonne journée !"
              />
            ) : (
              <div className="space-y-2">
                {actionItems.map((item) => (
                  <AlertCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </DashboardSection>

          <DashboardSection title="Recommandations intelligentes" subtitle="Règles automatiques (scolaire + finance)">
            {recommendations.length === 0 ? (
              <EmptyState title="Aucune recommandation" description="Les suggestions apparaîtront selon les données." />
            ) : (
              <div className="space-y-2">
                {recommendations.map((r) => (
                  <div key={r.id} className={`rounded-xl border px-3 py-2.5 ${recoSeverityStyles[r.severity]}`}>
                    <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{r.description}</p>
                    {r.recommendation ? (
                      <p className="mt-1 text-xs font-medium text-[var(--primary)]">→ {r.recommendation}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </DashboardSection>

          <DashboardSection title="Élèves à risque" subtitle="Basé sur les indicateurs académiques">
            {atRiskStudents.length === 0 ? (
              <EmptyState title="Aucun élève à risque" description="Les alertes s'afficheront via academic_metrics." />
            ) : (
              <div className="space-y-2">
                {atRiskStudents.map((s) => (
                  <RiskStudentCard key={s.id} student={s} />
                ))}
              </div>
            )}
            <Link
              href="/dashboard/students"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]"
            >
              Voir tous les élèves <ArrowRight size={14} />
            </Link>
          </DashboardSection>

          <DashboardSection title="Communication parents" subtitle={`Canal principal : ${communication.channel}`}>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-center">
                <p className="text-lg font-bold text-emerald-700">{formatFrInt(communication.sent)}</p>
                <p className="text-[10px] font-medium uppercase text-slate-500">Envoyées</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-2.5 text-center">
                <p className="text-lg font-bold text-amber-700">{formatFrInt(communication.pending)}</p>
                <p className="text-[10px] font-medium uppercase text-slate-500">En attente</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-2.5 text-center">
                <p className="text-lg font-bold text-rose-700">{formatFrInt(communication.failed)}</p>
                <p className="text-[10px] font-medium uppercase text-slate-500">Échouées</p>
              </div>
            </div>

            {communication.recent.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Aucun message récent.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {communication.recent.map((n) => (
                  <li key={n.id} className="rounded-xl border border-slate-100 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          n.status === "SENT"
                            ? "bg-emerald-100 text-emerald-700"
                            : n.status === "FAILED"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {notifStatusLabel(n.status)}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatRelativeTime(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{n.message}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/dashboard/messages"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]"
            >
              Ouvrir la messagerie <BookOpen size={14} />
            </Link>
          </DashboardSection>
        </div>
      </div>
    </div>
  );
}
