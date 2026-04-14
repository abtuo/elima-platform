import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { AttendanceAreaChart, GradesBarChart } from "@/components/ui/KpiCharts";
import { getSchoolKpisForCurrentUserSchool } from "@/lib/dashboard/kpis";
import { getSessionRole } from "@/lib/auth";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Timer,
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
        <PageHeader title="KPIs de l’école" subtitle="Accès interdit." />
        <div className="elima-card">
          <p className="text-sm text-slate-600">Vous n’avez pas les droits pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - 29);
  const to = formatDate(toDate);
  const from = formatDate(fromDate);

  const kpis = await getSchoolKpisForCurrentUserSchool({ from, to });

  return (
    <div className="space-y-6">
      <PageHeader
        title="KPIs de l’école"
        subtitle={`Synthèse sur la période ${kpis.from} → ${kpis.to}`}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Élèves" value={kpis.studentsCount} hint="Total inscrits" icon={<BookOpen size={18} />} />
        <KpiCard title="Enseignants" value={kpis.teachersCount} hint="Personnel enseignant" icon={<GraduationCap size={18} />} />
        <KpiCard title="Classes" value={kpis.classesCount} hint="Classes actives" icon={<CalendarDays size={18} />} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard
          title="Présence"
          value={`${kpis.attendancePresenceRate}%`}
          hint={`${kpis.attendancePresentCount} présents / ${kpis.attendanceRecordsCount} enregistrements`}
          icon={<CheckCircle2 size={18} />}
        />
        <KpiCard
          title="Absences"
          value={`${kpis.attendanceAbsenceRate}%`}
          hint={`${kpis.attendanceAbsentCount} absents`}
          icon={<UserX size={18} />}
        />
        <KpiCard
          title="Retards"
          value={`${kpis.attendanceLateRate}%`}
          hint={`${kpis.attendanceLateCount} retards`}
          icon={<Timer size={18} />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard
          title="Moyenne"
          value={kpis.gradesAverageScore ?? "—"}
          hint={kpis.gradesAverageScore != null ? "Moyenne des notes (/20)" : "Pas de notes sur la période"}
          icon={<BarChart3 size={18} />}
        />
        <KpiCard title="Min" value={kpis.gradesMinScore ?? "—"} hint="Note min (/20)" icon={<BarChart3 size={18} />} />
        <KpiCard title="Max" value={kpis.gradesMaxScore ?? "—"} hint="Note max (/20)" icon={<BarChart3 size={18} />} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AttendanceAreaChart present={kpis.attendanceDailyPresent} absent={kpis.attendanceDailyAbsent} />
        <GradesBarChart averageByDay={kpis.gradesDailyAverage} />
      </section>
    </div>
  );
}
