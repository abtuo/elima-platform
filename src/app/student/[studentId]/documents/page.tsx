import Link from "next/link";
import { StudentHeader } from "@/components/ui/StudentHeader";
import { EditableTable } from "@/components/ui/EditableTable";
import { demoStudentDocuments, getStudentProfile } from "@/lib/student/demo";

export default async function StudentDocumentsPage({ params }: { params: { studentId: string } }) {
  const profile = getStudentProfile(params.studentId);
  const term = "Trimestre 1";
  const docs = demoStudentDocuments
    .filter((d) => d.studentId === profile.id)
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  return (
    <div className="space-y-6">
      <StudentHeader
        title="Documents"
        subtitle="Téléchargements et documents disponibles (démo)."
        studentName={profile.fullName}
        className={profile.className}
        term={term}
      />

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Mes documents</h2>
        <EditableTable
          rows={docs}
          rowKey={(d) => d.id}
          columns={[
            { key: "title", header: "Document", cell: (d) => <span className="font-semibold">{d.title}</span> },
            { key: "cat", header: "Catégorie", cell: (d) => d.category, className: "whitespace-nowrap" },
            { key: "date", header: "Date", cell: (d) => d.dateISO, className: "whitespace-nowrap" },
            {
              key: "action",
              header: "Action",
              className: "whitespace-nowrap",
              cell: (d) =>
                d.category === "Bulletin" ? (
                  <Link
                    className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    href={`/api/reports/${profile.id === "stu-002" ? "stu-002" : "stu-001"}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ouvrir PDF
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500">Bientôt</span>
                ),
            },
          ]}
        />

        <p className="text-xs text-slate-500">
          Note : pour la démo, l’ouverture PDF pointe sur l’endpoint de bulletin.
        </p>
      </section>
    </div>
  );
}
