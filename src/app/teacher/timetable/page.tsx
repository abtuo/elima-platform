import Link from "next/link";
import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { Timeline } from "@/components/ui/Timeline";

export default function TeacherTimetablePage() {
  return (
    <div className="space-y-6">
      <ProgressHeader title="Emploi du temps" subtitle="Agenda agrégé de vos classes. Appel rapide depuis un cours." />

      <section className="elima-card">
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white">Jour</button>
          <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Semaine</button>
          <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Agenda</button>
        </div>

        <div className="mt-4">
          <Timeline
            items={[
              {
                time: "08:00–09:30",
                title: "Mathématiques — 6e A",
                description: "Salle A12 • Cours",
                right: (
                  <Link
                    href="/teacher/attendance"
                    className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Appel rapide
                  </Link>
                ),
              },
              {
                time: "10:00–11:30",
                title: "Français — 5e B",
                description: "Salle B06 • Cours",
              },
              {
                time: "14:00–15:30",
                title: "SVT — 6e B",
                description: "Salle C01 • Cours",
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
