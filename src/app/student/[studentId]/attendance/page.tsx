import { StudentHeader } from "@/components/ui/StudentHeader";
import { EditableTable } from "@/components/ui/EditableTable";
import { demoStudentAttendance, getStudentProfile } from "@/lib/student/demo";

function label(status: "PRESENT" | "ABSENT" | "LATE") {
  if (status === "PRESENT") return "Présent";
  if (status === "ABSENT") return "Absent";
  return "Retard";
}

export default async function StudentAttendancePage({ params }: { params: { studentId: string } }) {
  const profile = getStudentProfile(params.studentId);
  const term = "Trimestre 1";
  const rows = demoStudentAttendance
    .filter((a) => a.studentId === profile.id)
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  const totals = {
    absent: rows.filter((r) => r.status === "ABSENT").length,
    late: rows.filter((r) => r.status === "LATE").length,
  };

  return (
    <div className="space-y-6">
      <StudentHeader
        title="Présences"
        subtitle="Lecture seule — historique absences et retards."
        studentName={profile.fullName}
        className={profile.className}
        term={term}
      />

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
            { key: "date", header: "Date", cell: (r) => <span className="font-semibold">{r.dateISO}</span> },
            { key: "status", header: "Statut", cell: (r) => label(r.status), className: "whitespace-nowrap" },
            { key: "note", header: "Note", cell: (r) => r.note ?? "—" },
          ]}
        />
      </section>
    </div>
  );
}
