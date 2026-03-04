import { ChildSwitcher } from "@/components/ui/ChildSwitcher";
import { EditableTable } from "@/components/ui/EditableTable";
import { getParentChildren, getStudentAttendance } from "@/lib/parent/queries";

function label(status: string) {
  if (status === "PRESENT") return "Présent";
  if (status === "ABSENT") return "Absent";
  if (status === "LATE") return "Retard";
  return status;
}

export default async function ParentAttendancePage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const sp = await searchParams;
  const { children } = await getParentChildren();

  if (!children.length) {
    return (
      <div className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Présences</h1>
        <p className="mt-2 text-sm text-slate-600">Aucun enfant associé.</p>
      </div>
    );
  }

  const selectedId = sp.child ?? children[0].student_id;
  const rows = await getStudentAttendance(selectedId);
  const totals = {
    absent: rows.filter((r) => r.status === "ABSENT").length,
    late: rows.filter((r) => r.status === "LATE").length,
  };

  return (
    <div className="space-y-6">
      <ChildSwitcher childrenList={children} selectedStudentId={selectedId} basePath="/parent/attendance" />

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="elima-card">
          <p className="text-sm text-slate-500">Absences</p>
          <p className="mt-2 text-2xl font-bold">{totals.absent}</p>
        </article>
        <article className="elima-card">
          <p className="text-sm text-slate-500">Retards</p>
          <p className="mt-2 text-2xl font-bold">{totals.late}</p>
        </article>
      </section>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Historique</h2>
        <EditableTable
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { key: "date", header: "Date", cell: (r) => <span className="font-semibold">{String(r.date)}</span>, className: "whitespace-nowrap" },
            { key: "status", header: "Statut", cell: (r) => label(r.status), className: "whitespace-nowrap" },
          ]}
        />
      </section>
    </div>
  );
}
