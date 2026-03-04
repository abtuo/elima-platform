import Link from "next/link";
import { ChildSwitcher } from "@/components/ui/ChildSwitcher";
import { Timeline } from "@/components/ui/Timeline";
import { getParentChildren, getStudentAttendance, getStudentGrades } from "@/lib/parent/queries";
import { BarChart3, ClipboardCheck, FileText } from "lucide-react";

type GradeLite = { score: number; max_score: number; subject_coefficient: number; subject_name: string; evaluation_title: string; evaluation_date: string; id: string };

function computeAvgFromGrades(grades: GradeLite[]) {
  // weighted by subject coefficient (fallback 1)
  let total = 0;
  let totalCoef = 0;
  for (const g of grades) {
    const max = g.max_score ?? 20;
    const coef = g.subject_coefficient ?? 1;
    const score20 = (Number(g.score) / Number(max)) * 20;
    total += score20 * Number(coef);
    totalCoef += Number(coef);
  }
  if (!totalCoef) return 0;
  return total / totalCoef;
}

export default async function ParentOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const sp = await searchParams;
  const { children } = await getParentChildren();

  if (!children.length) {
    return (
      <div className="space-y-6">
        <div className="elima-card">
          <h1 className="text-2xl font-bold text-[var(--accent)]">Espace Parent</h1>
          <p className="mt-2 text-sm text-slate-600">
            Aucun enfant n’est associé à ce compte. Vérifie la table <span className="font-mono">student_parents</span>.
          </p>
        </div>
      </div>
    );
  }

  const selectedId = sp.child ?? children[0].student_id;

  const [grades, attendance] = await Promise.all([
    getStudentGrades(selectedId),
    getStudentAttendance(selectedId),
  ]);

  const avg = computeAvgFromGrades(grades);
  const recentAbsences = attendance.filter((a) => a.status === "ABSENT").slice(0, 3);
  const lastGrades = grades.slice(0, 3);

  return (
    <div className="space-y-6">
      <ChildSwitcher childrenList={children} selectedStudentId={selectedId} basePath="/parent/overview" />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="elima-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Moyenne générale</p>
            <BarChart3 size={18} className="text-[var(--primary)]" />
          </div>
          <p className="mt-2 text-2xl font-bold">{avg.toFixed(1)}/20</p>
        </article>

        <article className="elima-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Absences récentes</p>
            <ClipboardCheck size={18} className="text-[var(--primary)]" />
          </div>
          <p className="mt-2 text-2xl font-bold">{recentAbsences.length}</p>
        </article>

        <article className="elima-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Dernières notes</p>
            <FileText size={18} className="text-[var(--primary)]" />
          </div>
          <p className="mt-2 text-2xl font-bold">{lastGrades.length}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="elima-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Absences</h2>
            <Link className="text-sm font-semibold text-[var(--primary)]" href={`/parent/attendance?child=${selectedId}`}>
              Voir tout
            </Link>
          </div>
          <div className="mt-3">
            <Timeline
              items={recentAbsences.map((a) => ({
                time: String(a.date),
                title: a.status === "ABSENT" ? "Absent" : a.status,
                description: "",
              }))}
            />
          </div>
        </article>

        <article className="elima-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Dernières notes</h2>
            <Link className="text-sm font-semibold text-[var(--primary)]" href={`/parent/grades?child=${selectedId}`}>
              Voir tout
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {lastGrades.map((g: GradeLite) => (
              <div key={g.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold">
                  {g.subject_name ?? "Matière"} • {g.evaluation_title ?? "Évaluation"}
                </p>
                <p className="mt-1 text-xs text-slate-600">{String(g.evaluation_date ?? "")}</p>
                <p className="mt-2 text-xl font-bold text-[var(--accent)]">
                  {Number(g.score)}/{Number(g.max_score ?? 20)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
