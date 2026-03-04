import { StudentHeader } from "@/components/ui/StudentHeader";
import { getStudentProfile } from "@/lib/student/demo";
import { HomeworkClient } from "./HomeworkClient";

export default async function StudentHomeworkPage({ params }: { params: { studentId: string } }) {
  const profile = getStudentProfile(params.studentId);
  const term = "Trimestre 1";

  return (
    <div className="space-y-6">
      <StudentHeader
        title="Devoirs"
        subtitle="Liste des devoirs (checklist personnelle uniquement)."
        studentName={profile.fullName}
        className={profile.className}
        term={term}
      />

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">À faire</h2>
        <p className="text-sm text-slate-600">
          La case “Fait” est personnelle (enregistrée localement sur votre appareil).
        </p>

        <HomeworkClient studentId={profile.id} />
      </section>
    </div>
  );
}
