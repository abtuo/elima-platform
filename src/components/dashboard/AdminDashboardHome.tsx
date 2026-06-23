import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Download,
  GraduationCap,
  MessageCircle,
  Plus,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type { AdminCockpitData, MonthlyPerformancePoint } from "@/lib/dashboard/cockpit";
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

function PerformanceChart({ series }: { series: MonthlyPerformancePoint[] }) {
  if (series.length < 2) {
    return <EmptyState title="Pas assez de données" description="Les moyennes apparaîtront après les premières évaluations." />;
  }
  const w = 640;
  const h = 200;
  const allVals = series.flatMap((p) => [p.current, p.previous].filter((v): v is number => v !== null));
  const min = Math.min(...allVals) - 0.5;
  const max = Math.max(...allVals) + 0.5;
  const span = max - min || 1;
  const step = w / (series.length - 1);

  const currentPoints = series
    .map((p, i) => {
      if (p.current === null) return null;
      const y = h - 20 - ((p.current - min) / span) * (h - 12 - 20);
      return `${i * step},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  const previousPoints = series
    .map((p, i) => {
      if (p.previous === null) return null;
      const y = h - 20 - ((p.previous - min) / span) * (h - 12 - 20);
      return `${i * step},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-48 w-full" preserveAspectRatio="none" aria-hidden>
        <polyline fill="none" stroke="#2E8B57" strokeWidth="2.5" strokeLinecap="round" points={currentPoints} />
        {previousPoints ? (
          <polyline fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" points={previousPoints} />
        ) : null}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-[var(--primary)]" /> Période courante
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded border border-dashed border-[var(--secondary)] bg-[var(--secondary)]/40" /> Trimestre précédent
        </span>
      </div>
      <div className="mt-2 grid text-center text-[11px] text-slate-500" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }}>
        {series.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

function AttendanceTrendChart({ points }: { points: { date: string; rate: number }[] }) {
  if (points.length === 0) {
    return <EmptyState title="Aucune présence enregistrée" description="Les données des 7 derniers jours s'afficheront ici." />;
  }
  const w = 400;
  const h = 120;
  const vals = points.map((p) => p.rate);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 100);
  const span = max - min || 1;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const line = points
    .map((p, i) => {
      const y = h - 16 - ((p.rate - min) / span) * (h - 24);
      return `${i * step},${y}`;
    })
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" preserveAspectRatio="none" aria-hidden>
        <polyline fill="none" stroke="#2E8B57" strokeWidth="2" strokeLinecap="round" points={line} />
      </svg>
      <div className="mt-1 grid text-center text-[10px] text-slate-500" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
        {points.map((p) => (
          <span key={p.date}>
            {new Date(`${p.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" })}
          </span>
        ))}
      </div>
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
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/reports"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={16} />
            Exporter rapport
          </Link>
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
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
              : "Données insuffisantes"
          }
          icon={<TrendingUp size={20} />}
          status="success"
        />
        <StatCard
          title="WhatsApp cette semaine"
          value={formatFrInt(kpis.whatsappSentThisWeek)}
          trend={kpis.whatsappTrend}
          trendLabel={trendLabel(kpis.whatsappTrend, "Envois")}
          icon={<MessageCircle size={20} />}
          status="default"
        />
      </section>

      {/* Main grid */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4 xl:col-span-2">
          <DashboardSection
            title="Performance académique"
            subtitle="Évolution de la moyenne générale par mois"
            action={
              academicPerformance.comparisonPct !== null ? (
                <span className="text-sm font-semibold text-[var(--primary)]">
                  {academicPerformance.comparisonPct > 0 ? "+" : ""}
                  {academicPerformance.comparisonPct}% vs trimestre précédent
                </span>
              ) : null
            }
          >
            <PerformanceChart series={academicPerformance.monthlySeries} />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Top classes</p>
                {academicPerformance.topClasses.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Aucune donnée</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {academicPerformance.topClasses.map((c) => (
                      <li key={c.classId} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">{c.className}</span>
                        <span className="font-semibold text-emerald-700">{c.average}/20</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Classes à surveiller</p>
                {academicPerformance.watchClasses.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Aucune alerte</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {academicPerformance.watchClasses.map((c) => (
                      <li key={c.classId} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">{c.className}</span>
                        <span className="font-semibold text-amber-700">{c.average}/20</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </DashboardSection>

          <DashboardSection title="Présence & assiduité" subtitle="Situation du jour et tendance sur 7 jours">
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
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Évolution sur 7 jours</p>
              <AttendanceTrendChart points={attendance.weeklyTrend} />
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
              Ouvrir les messages <BookOpen size={14} />
            </Link>
          </DashboardSection>
        </div>
      </div>
    </div>
  );
}
