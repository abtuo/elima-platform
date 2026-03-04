import Link from "next/link";
import { ChildSwitcher } from "@/components/ui/ChildSwitcher";
import { EditableTable } from "@/components/ui/EditableTable";
import { getParentChildren, getStudentReports } from "@/lib/parent/queries";

export default async function ParentReportsPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const sp = await searchParams;
  const { children } = await getParentChildren();

  if (!children.length) {
    return (
      <div className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Bulletins</h1>
        <p className="mt-2 text-sm text-slate-600">Aucun enfant associé.</p>
      </div>
    );
  }

  const selectedId = sp.child ?? children[0].student_id;
  const reports = await getStudentReports(selectedId);

  return (
    <div className="space-y-6">
      <ChildSwitcher childrenList={children} selectedStudentId={selectedId} basePath="/parent/reports" />

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Bulletins & appréciations</h2>
        <EditableTable
          rows={reports}
          rowKey={(r) => r.id}
          columns={[
            { key: "term", header: "Période", cell: (r) => <span className="font-semibold">{r.term}</span>, className: "whitespace-nowrap" },
            { key: "avg", header: "Moyenne", cell: (r) => `${Number(r.average_score).toFixed(1)}/20`, className: "whitespace-nowrap" },
            { key: "att", header: "Présence", cell: (r) => `${Number(r.attendance_rate).toFixed(0)}%`, className: "whitespace-nowrap" },
            {
              key: "pdf",
              header: "PDF",
              className: "whitespace-nowrap",
              cell: (r) => (
                <Link
                  href={r.pdf_url ?? `/api/reports/${selectedId}`}
                  className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  target="_blank"
                  rel="noreferrer"
                >
                  Télécharger
                </Link>
              ),
            },
          ]}
        />
        <p className="text-xs text-slate-500">
          Si <span className="font-mono">pdf_url</span> n’est pas renseigné, on utilise l’endpoint de génération PDF pour la démo.
        </p>
      </section>
    </div>
  );
}
