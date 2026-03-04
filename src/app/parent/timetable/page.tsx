import { ChildSwitcher } from "@/components/ui/ChildSwitcher";
import { Timeline } from "@/components/ui/Timeline";
import { getParentChildren } from "@/lib/parent/queries";

export default async function ParentTimetablePage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const sp = await searchParams;
  const { children } = await getParentChildren();

  if (!children.length) {
    return (
      <div className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Emploi du temps</h1>
        <p className="mt-2 text-sm text-slate-600">Aucun enfant associé.</p>
      </div>
    );
  }

  const selectedId = sp.child ?? children[0].student_id;

  return (
    <div className="space-y-6">
      <ChildSwitcher childrenList={children} selectedStudentId={selectedId} basePath="/parent/timetable" />

      <section className="elima-card">
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white">Jour</button>
          <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Semaine</button>
        </div>

        <div className="mt-4">
          <Timeline
            items={[
              { time: "08:00–09:30", title: "Mathématiques", description: "Salle A12 • Cours" },
              { time: "10:00–11:30", title: "Français", description: "Salle B06 • Cours" },
              { time: "14:00–15:30", title: "SVT", description: "Salle C01 • Cours" },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
