import { StudentHeader } from "@/components/ui/StudentHeader";
import { EditableTable } from "@/components/ui/EditableTable";
import {
  computeSubjectAverages,
  computeWeightedAverage,
  demoStudentGrades,
  demoTerms,
  getStudentProfile,
} from "@/lib/student/demo";

function appreciation(avg: number) {
  if (avg >= 16) return "Excellent trimestre. Continuez ainsi.";
  if (avg >= 14) return "Très bon trimestre.";
  if (avg >= 12) return "Bon trimestre.";
  if (avg >= 10) return "Trimestre moyen, peut mieux faire.";
  return "Trimestre insuffisant, efforts à intensifier.";
}

export default async function StudentAveragesPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const { studentId } = await params;
  const profile = getStudentProfile(studentId);
  const sp = await searchParams;
  const term = (sp.term as (typeof demoTerms)[number]) ?? "Trimestre 1";

  const grades = demoStudentGrades.filter((g) => g.studentId === profile.id && g.term === term);
  const generalAvg = computeWeightedAverage(grades);
  const bySubject = computeSubjectAverages(grades).sort((a, b) => a.subject.localeCompare(b.subject));

  return (
    <div className="space-y-6">
      <StudentHeader
        title="Moyennes"
        subtitle="Lecture seule — moyennes officielles et appréciation."
        studentName={profile.fullName}
        className={profile.className}
        term={term}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="elima-card lg:col-span-1">
          <p className="text-sm text-slate-500">Moyenne générale</p>
          <p className="mt-2 text-3xl font-bold text-[var(--accent)]">{generalAvg.toFixed(1)}/20</p>
          <p className="mt-2 text-sm text-slate-600">{appreciation(generalAvg)}</p>

          <form className="mt-4 grid gap-2" method="GET">
            <label className="text-xs font-semibold text-slate-600">Période</label>
            <select name="term" defaultValue={term} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
              {demoTerms.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90" type="submit">
              Appliquer
            </button>
          </form>
        </article>

        <article className="elima-card lg:col-span-2">
          <h2 className="text-lg font-semibold">Moyennes par matière</h2>
          <div className="mt-3">
            <EditableTable
              rows={bySubject}
              rowKey={(r) => r.subject}
              columns={[
                { key: "s", header: "Matière", cell: (r) => <span className="font-semibold">{r.subject}</span> },
                { key: "a", header: "Moyenne", cell: (r) => `${r.average.toFixed(1)}/20`, className: "whitespace-nowrap" },
                { key: "app", header: "Appréciation", cell: (r) => <span className="text-slate-700">{appreciation(r.average)}</span> },
              ]}
            />
          </div>
        </article>
      </section>
    </div>
  );
}
