import { StudentHeader } from "@/components/ui/StudentHeader";
import { Timeline } from "@/components/ui/Timeline";
import { getStudentProfile } from "@/lib/student/demo";

export default async function StudentTimetablePage({ params }: { params: { studentId: string } }) {
  const profile = getStudentProfile(params.studentId);
  const term = "Trimestre 1";

  return (
    <div className="space-y-6">
      <StudentHeader
        title="Emploi du temps"
        subtitle="Lecture seule (vue jour/semaine à venir)."
        studentName={profile.fullName}
        className={profile.className}
        term={term}
      />

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
