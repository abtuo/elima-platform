import { StudentHeader } from "@/components/ui/StudentHeader";
import { EditableTable } from "@/components/ui/EditableTable";
import { demoStudentGrades, demoSubjects, demoTerms, getStudentProfile } from "@/lib/student/demo";

export default async function StudentGradesPage({
  params,
  searchParams,
}: {
  params: { studentId: string };
  searchParams: Promise<{ subject?: string; term?: string }>;
}) {
  const profile = getStudentProfile(params.studentId);
  const sp = await searchParams;

  const selectedTerm = (sp.term as (typeof demoTerms)[number]) ?? "Trimestre 1";
  const selectedSubject = sp.subject ?? "";

  const rows = demoStudentGrades
    .filter((g) => g.studentId === profile.id)
    .filter((g) => g.term === selectedTerm)
    .filter((g) => (selectedSubject ? g.subject === selectedSubject : true))
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  return (
    <div className="space-y-6">
      <StudentHeader
        title="Notes"
        subtitle="Lecture seule — notes officielles. Filtre par matière/période."
        studentName={profile.fullName}
        className={profile.className}
        term={selectedTerm}
      />

      <section className="elima-card space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <form className="grid gap-2" method="GET">
            <label className="text-xs font-semibold text-slate-600">Période</label>
            <select
              name="term"
              defaultValue={selectedTerm}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              {demoTerms.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <label className="mt-2 text-xs font-semibold text-slate-600">Matière</label>
            <select
              name="subject"
              defaultValue={selectedSubject}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Toutes</option>
              {demoSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button
              className="mt-3 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              type="submit"
            >
              Filtrer
            </button>
          </form>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold">Rappel</p>
            <p className="mt-1 text-sm text-slate-600">
              Les notes affichées ici sont en lecture seule. Pour contestation, contactez l’administration.
            </p>
          </div>
        </div>

        <EditableTable
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { key: "eval", header: "Évaluation", cell: (r) => <span className="font-semibold">{r.evaluation}</span> },
            { key: "sub", header: "Matière", cell: (r) => r.subject, className: "whitespace-nowrap" },
            { key: "score", header: "Note", cell: (r) => `${r.score}/${r.maxScore}`, className: "whitespace-nowrap" },
            { key: "coef", header: "Coef", cell: (r) => r.coef, className: "whitespace-nowrap" },
            { key: "date", header: "Date", cell: (r) => r.dateISO, className: "whitespace-nowrap" },
          ]}
        />
      </section>
    </div>
  );
}
