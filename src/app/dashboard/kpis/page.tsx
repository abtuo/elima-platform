import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ClassAttendanceFocusChart, GradeDistributionByClassChart, SubjectAverageChart } from "@/components/ui/KpiCharts";
import { MonthlyAverageChart, ClassPerformanceBars } from "@/components/dashboard/AnalyticsCharts";
import { getSchoolKpisForCurrentUserSchool } from "@/lib/dashboard/kpis";
import { getAdminCockpitData } from "@/lib/dashboard/cockpit";
import { getSessionRole } from "@/lib/auth";
import { getAppNow } from "@/lib/app-date";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Timer,
  TrendingUp,
  UserX,
} from "lucide-react";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardKpisPage() {
  const role = await getSessionRole();
  if (role !== "SCHOOL_ADMIN" && role !== "SUPER_ADMIN") {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytique de l’école" subtitle="Accès interdit." />
        <div className="elima-card">
          <p className="text-sm text-slate-600">Vous n’avez pas les droits pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  const toDate = getAppNow();
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - 29);
  const to = formatDate(toDate);
  const from = formatDate(fromDate);

  const [kpis, cockpit] = await Promise.all([
    getSchoolKpisForCurrentUserSchool({ from, to }),
    getAdminCockpitData(),
  ]);

  const { academicPerformance, attendance, kpis: cockpitKpis } = cockpit;
  const prioritySubject = kpis.subjectAverages[0] ?? null;
  const attendanceFocus = kpis.classAttendance[0] ?? null;
  const gradeFocus =
    [...kpis.classGradeDistributions].sort(
      (a, b) =>
        b.buckets.below8 +
        b.buckets.from8To10 -
        (a.buckets.below8 + a.buckets.from8To10),
    )[0] ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytique de l’école"
        subtitle={`Performance académique & assiduité · ${kpis.from} → ${kpis.to}`}
      />

      {/* Counters */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Élèves" value={kpis.studentsCount} trend="neutral" trendLabel="Total inscrits" icon={<BookOpen size={20} />} />
        <StatCard title="Enseignants" value={kpis.teachersCount} trend="neutral" trendLabel="Personnel" icon={<GraduationCap size={20} />} />
        <StatCard title="Classes" value={kpis.classesCount} trend="neutral" trendLabel="Classes actives" icon={<CalendarDays size={20} />} />
        <StatCard
          title="Moyenne générale"
          value={cockpitKpis.schoolAverage !== null ? `${cockpitKpis.schoolAverage}/20` : "—"}
          trend={
            academicPerformance.comparisonPct !== null
              ? academicPerformance.comparisonPct > 0
                ? "up"
                : academicPerformance.comparisonPct < 0
                  ? "down"
                  : "neutral"
              : "neutral"
          }
          trendLabel={
            academicPerformance.comparisonPct !== null
              ? `${academicPerformance.comparisonPct > 0 ? "+" : ""}${academicPerformance.comparisonPct}% vs trim. précédent`
              : "Données insuffisantes"
          }
          icon={<TrendingUp size={20} />}
          status="success"
        />
      </section>

      {/* Grade evolution */}
      <DashboardSection
        title="Évolution de la moyenne générale"
        subtitle="Année scolaire de septembre à juin, comparaison à date"
        action={
          academicPerformance.comparisonPct !== null ? (
            <span className="text-sm font-semibold text-[var(--primary)]">
              {academicPerformance.comparisonPct > 0 ? "+" : ""}
              {academicPerformance.comparisonPct}%
            </span>
          ) : null
        }
      >
        <MonthlyAverageChart series={academicPerformance.monthlySeries} />
      </DashboardSection>

      {/* Attendance breakdown */}
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          title="Présence"
          value={`${kpis.attendancePresenceRate}%`}
          trend="up"
          trendLabel={`${kpis.attendancePresentCount} présences`}
          icon={<CheckCircle2 size={20} />}
          status="success"
        />
        <StatCard
          title="Absences"
          value={`${kpis.attendanceAbsenceRate}%`}
          trend="down"
          trendLabel={`${kpis.attendanceAbsentCount} absences`}
          icon={<UserX size={20} />}
          status="danger"
        />
        <StatCard
          title="Retards"
          value={`${kpis.attendanceLateRate}%`}
          trend="neutral"
          trendLabel={`${kpis.attendanceLateCount} retards`}
          icon={<Timer size={20} />}
          status="warning"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <GradeDistributionByClassChart rows={kpis.classGradeDistributions} />
        <SubjectAverageChart rows={kpis.subjectAverages} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ClassAttendanceFocusChart rows={kpis.classAttendance} />
        <DashboardSection title="Synthèse académique" subtitle="Points saillants sur la période">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <p className="font-semibold text-slate-800">Matière prioritaire</p>
              <p className="mt-1 truncate">
                {prioritySubject ? (
                  <>
                    <span>{prioritySubject.subjectName}</span>
                    <span className="text-slate-400"> · </span>
                    <span className={prioritySubject.average < 10 ? "font-semibold text-rose-700" : "font-semibold text-amber-700"}>
                      {prioritySubject.average}/20
                    </span>
                  </>
                ) : (
                  "Aucune note sur la période."
                )}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <p className="font-semibold text-slate-800">Classe à suivre</p>
              <p className="mt-1 truncate">
                {gradeFocus ? (
                  <>
                    <span>{gradeFocus.className}</span>
                    <span className="text-slate-400"> · </span>
                    <span className="font-semibold text-amber-700">{gradeFocus.buckets.below8 + gradeFocus.buckets.from8To10} notes sous 10</span>
                  </>
                ) : (
                  "Aucune classe à signaler."
                )}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <p className="font-semibold text-slate-800">Assiduité</p>
              <p className="mt-1 truncate">
                {attendanceFocus ? (
                  <>
                    <span>{attendanceFocus.className}</span>
                    <span className="text-slate-400"> · </span>
                    <span className="font-semibold text-amber-700">{attendanceFocus.absent} absences</span>
                    <span className="text-slate-400">, </span>
                    <span className="font-semibold text-rose-700">{attendanceFocus.late} retards</span>
                  </>
                ) : (
                  "Aucun incident d'assiduité sur la période."
                )}
              </p>
            </div>
          </div>
        </DashboardSection>
      </section>

      {/* Class rankings */}
      <section className="grid gap-4 lg:grid-cols-2">
        <DashboardSection title="Top classes" subtitle="Meilleures moyennes récentes">
          {academicPerformance.topClasses.length === 0 ? (
            <EmptyState title="Aucune donnée" description="Les classements apparaîtront après les évaluations." />
          ) : (
            <ClassPerformanceBars classes={academicPerformance.topClasses} tone="good" />
          )}
        </DashboardSection>
        <DashboardSection title="Classes à surveiller" subtitle="Moyennes les plus basses">
          {academicPerformance.watchClasses.length === 0 ? (
            <EmptyState title="Aucune alerte" description="Aucune classe en difficulté détectée." />
          ) : (
            <ClassPerformanceBars classes={academicPerformance.watchClasses} tone="watch" />
          )}
        </DashboardSection>
      </section>

      {/* Weekly attendance summary */}
      <DashboardSection title="Assiduité — 7 derniers jours" subtitle="Taux de présence quotidien">
        {attendance.weeklyTrend.length === 0 ? (
          <EmptyState title="Aucune présence enregistrée" />
        ) : (
          <div className="flex items-end justify-between gap-2">
            {attendance.weeklyTrend.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full items-end justify-center">
                  <div
                    className="w-full max-w-[36px] rounded-t-md bg-[var(--primary)]/85"
                    style={{ height: `${Math.max(4, d.rate)}%` }}
                    title={`${d.date}: ${d.rate}%`}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-500">
                  {new Date(`${d.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" })}
                </span>
                <span className="text-[10px] font-semibold text-slate-700">{Math.round(d.rate)}%</span>
              </div>
            ))}
          </div>
        )}
      </DashboardSection>

    </div>
  );
}
