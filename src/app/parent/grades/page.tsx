import { ChildSwitcher } from "@/components/ui/ChildSwitcher";
import { EditableTable } from "@/components/ui/EditableTable";
import { getParentChildren, getStudentGrades } from "@/lib/parent/queries";

type GradeLite = { id: string; score: number; max_score: number; subject_name: string; subject_coefficient: number; evaluation_title: string; evaluation_date: string };

function computeBySubject(grades: GradeLite[]) {
  const map = new Map<string, { subject: string; avg: number; count: number }>();
  const buckets = new Map<string, { total: number; totalCoef: number; count: number }>();

  for (const g of grades) {
    const subject = g.subject_name ?? "—";
    const coef = Number(g.subject_coefficient ?? 1);
    const max = Number(g.max_score ?? 20);
    const score20 = (Number(g.score) / max) * 20;
    const b = buckets.get(subject) ?? { total: 0, totalCoef: 0, count: 0 };
    b.total += score20 * coef;
    b.totalCoef += coef;
    b.count += 1;
    buckets.set(subject, b);
  }

  for (const [subject, b] of buckets.entries()) {
    map.set(subject, { subject, avg: b.totalCoef ? b.total / b.totalCoef : 0, count: b.count });
  }

  return Array.from(map.values()).sort((a, b) => a.subject.localeCompare(b.subject));
}

export default async function ParentGradesPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const sp = await searchParams;
  const { children } = await getParentChildren();

  if (!children.length) {
    return (
      <div className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Notes</h1>
        <p className="mt-2 text-sm text-slate-600">Aucun enfant associé.</p>
      </div>
    );
  }

  const selectedId = sp.child ?? children[0].student_id;
  const grades = await getStudentGrades(selectedId);
  const bySubject = computeBySubject(grades);

  return (
    <div className="space-y-6">
      <ChildSwitcher childrenList={children} selectedStudentId={selectedId} basePath="/parent/grades" />

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Moyennes par matière</h2>
        <EditableTable
          rows={bySubject}
          rowKey={(r) => r.subject}
          columns={[
            { key: "s", header: "Matière", cell: (r) => <span className="font-semibold">{r.subject}</span> },
            { key: "a", header: "Moyenne", cell: (r) => `${r.avg.toFixed(1)}/20`, className: "whitespace-nowrap" },
            { key: "c", header: "Évals", cell: (r) => r.count, className: "whitespace-nowrap" },
          ]}
        />
      </section>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Détails des notes</h2>
        <EditableTable
          rows={grades as GradeLite[]}
          rowKey={(r) => r.id}
          columns={[
            {
              key: "eval",
              header: "Évaluation",
              cell: (r: GradeLite) => (
                <div>
                  <p className="font-semibold">{r.evaluation_title ?? "—"}</p>
                  <p className="text-xs text-slate-500">{r.subject_name ?? "—"}</p>
                </div>
              ),
            },
            {
              key: "score",
              header: "Note",
              className: "whitespace-nowrap",
              cell: (r: GradeLite) => `${Number(r.score)}/${Number(r.max_score ?? 20)}`,
            },
            {
              key: "date",
              header: "Date",
              className: "whitespace-nowrap",
              cell: (r: GradeLite) => String(r.evaluation_date ?? ""),
            },
          ]}
        />
      </section>
    </div>
  );
}
