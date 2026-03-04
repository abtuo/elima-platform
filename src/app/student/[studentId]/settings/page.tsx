import { StudentHeader } from "@/components/ui/StudentHeader";
import { getStudentProfile } from "@/lib/student/demo";

export default async function StudentSettingsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const profile = getStudentProfile(studentId);
  const term = "Trimestre 1";

  return (
    <div className="space-y-6">
      <StudentHeader
        title="Paramètres"
        subtitle="Préférences élève (démo)."
        studentName={profile.fullName}
        className={profile.className}
        term={term}
      />

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Compte</h2>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Élève</span> : {profile.fullName}
          </p>
          <p>
            <span className="font-semibold">Classe</span> : {profile.className}
          </p>
        </div>

        <p className="text-sm text-slate-600">
          Les paramètres seront reliés à Supabase plus tard (langue, notifications, etc.).
        </p>
      </section>
    </div>
  );
}
