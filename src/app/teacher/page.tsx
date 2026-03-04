import Link from "next/link";
import { CalendarDays, ClipboardCheck, FileText, ListTodo } from "lucide-react";
import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { ActionCard } from "@/components/ui/ActionCard";
import { Timeline } from "@/components/ui/Timeline";

export default function TeacherOverviewPage() {
  return (
    <div className="space-y-6">
      <ProgressHeader
        title="Vue d’ensemble"
        subtitle="Retrouvez vos prochaines heures, vos classes, et accédez rapidement aux actions clés."
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="elima-card">
          <h2 className="text-lg font-semibold">Mes classes</h2>
          <p className="mt-1 text-sm text-slate-600">6e A • 6e B • 5e B</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["6e A", "6e B", "5e B"].map((c) => (
              <span key={c} className="rounded-full bg-[var(--secondary)]/25 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {c}
              </span>
            ))}
          </div>
        </article>

        <article className="elima-card">
          <h2 className="text-lg font-semibold">Prochains cours</h2>
          <div className="mt-3">
            <Timeline
              items={[
                {
                  time: "08:00",
                  title: "Mathématiques — 6e A",
                  description: "Salle A12 • Cours",
                  right: (
                    <div className="flex gap-2">
                      <Link
                        className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        href="/teacher/attendance"
                      >
                        Appel
                      </Link>
                      <Link
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        href="/teacher/grades"
                      >
                        Notes
                      </Link>
                    </div>
                  ),
                },
                {
                  time: "10:00",
                  title: "Français — 5e B",
                  description: "Salle B06 • Cours",
                },
                {
                  time: "14:00",
                  title: "SVT — 6e B",
                  description: "Salle C01 • Cours",
                },
              ]}
            />
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          href="/teacher/timetable"
          title="Emploi du temps"
          description="Calendrier & agenda"
          icon={<CalendarDays size={18} />}
        />
        <ActionCard
          href="/teacher/grades"
          title="Notes"
          description="Saisie élève par élève"
          icon={<FileText size={18} />}
        />
        <ActionCard
          href="/teacher/attendance"
          title="Présences"
          description="Appel par classe"
          icon={<ClipboardCheck size={18} />}
        />
        <ActionCard
          href="/teacher/memo"
          title="Todo"
          description="Notes personnelles"
          icon={<ListTodo size={18} />}
        />
      </section>
    </div>
  );
}
