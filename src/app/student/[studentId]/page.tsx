import Link from "next/link";
import { StudentHeader } from "@/components/ui/StudentHeader";
import { ActionCard } from "@/components/ui/ActionCard";
import { Timeline } from "@/components/ui/Timeline";
import {
  computeWeightedAverage,
  demoStudentAttendance,
  demoStudentGrades,
  getStudentProfile,
} from "@/lib/student/demo";
import { AlertTriangle, BarChart3, CalendarDays, ClipboardCheck, FileText } from "lucide-react";

export default async function StudentOverviewPage({ params }: { params: { studentId: string } }) {
  const profile = getStudentProfile(params.studentId);

  const term = "Trimestre 1";
  const grades = demoStudentGrades.filter((g) => g.studentId === profile.id && g.term === term);
  const attendance = demoStudentAttendance.filter((a) => a.studentId === profile.id);
  const avg = computeWeightedAverage(grades);

  const lastGrades = [...grades].sort((a, b) => b.dateISO.localeCompare(a.dateISO)).slice(0, 3);
  const hasAlerts = attendance.some((a) => a.status === "ABSENT") || avg < 10;

  return (
    <div className="space-y-6">
      <StudentHeader
        title="Vue d’ensemble"
        subtitle="Prochains cours, dernières notes, moyenne générale, alertes."
        studentName={profile.fullName}
        className={profile.className}
        term={term}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="elima-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Moyenne générale</p>
            <BarChart3 size={18} className="text-[var(--primary)]" />
          </div>
          <p className="mt-2 text-2xl font-bold">{avg.toFixed(1)}/20</p>
        </article>
        <article className="elima-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Absences (T1)</p>
            <ClipboardCheck size={18} className="text-[var(--primary)]" />
          </div>
          <p className="mt-2 text-2xl font-bold">{attendance.filter((a) => a.status === "ABSENT").length}</p>
        </article>
        <article className="elima-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Dernières notes</p>
            <FileText size={18} className="text-[var(--primary)]" />
          </div>
          <p className="mt-2 text-2xl font-bold">{lastGrades.length}</p>
        </article>
        <article className={hasAlerts ? "elima-card border-amber-200 bg-amber-50" : "elima-card"}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Alertes</p>
            <AlertTriangle size={18} className={hasAlerts ? "text-amber-600" : "text-[var(--primary)]"} />
          </div>
          <p className="mt-2 text-2xl font-bold">{hasAlerts ? "1" : "0"}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="elima-card">
          <h2 className="text-lg font-semibold">Prochains cours</h2>
          <div className="mt-3">
            <Timeline
              items={[
                { time: "08:00", title: "Mathématiques", description: "Salle A12 • Cours" },
                { time: "10:00", title: "Français", description: "Salle B06 • Cours" },
                { time: "14:00", title: "SVT", description: "Salle C01 • Cours" },
              ]}
            />
          </div>
        </article>

        <article className="elima-card">
          <h2 className="text-lg font-semibold">Dernières notes</h2>
          <div className="mt-3 space-y-3">
            {lastGrades.map((g) => (
              <div key={g.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold">{g.subject} • {g.evaluation}</p>
                <p className="mt-1 text-xs text-slate-600">{g.dateISO} • Coef {g.coef}</p>
                <p className="mt-2 text-xl font-bold text-[var(--accent)]">{g.score}/{g.maxScore}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          href={`/student/${profile.id}/timetable`}
          title="Emploi du temps"
          description="Lecture seule"
          icon={<CalendarDays size={18} />}
        />
        <ActionCard
          href={`/student/${profile.id}/grades`}
          title="Notes"
          description="Évaluations et détails"
          icon={<FileText size={18} />}
        />
        <ActionCard
          href={`/student/${profile.id}/attendance`}
          title="Présences"
          description="Historique absences/retards"
          icon={<ClipboardCheck size={18} />}
        />
        <ActionCard
          href={`/student/${profile.id}/averages`}
          title="Moyennes"
          description="Par matière et générale"
          icon={<BarChart3 size={18} />}
        />
      </section>

      <div className="text-xs text-slate-500">
        Astuce démo : changer d’élève en modifiant l’URL (ex: <Link className="underline" href="/student/stu-002">/student/stu-002</Link>).
      </div>
    </div>
  );
}
