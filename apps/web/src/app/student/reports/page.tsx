import { FileText } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { getPortalContext, getStudentReports } from "@/lib/portal/queries";

export default async function StudentReportsPage() {
  const context = await getPortalContext();
  const student = context?.students[0];
  if (!student) return <EmptyState title="Profil élève introuvable" description="Ce compte n’est pas encore rattaché à un dossier scolaire." />;
  const reports = await getStudentReports(student.id);
  return <div className="space-y-5"><section className="elima-card"><p className="text-xs font-semibold uppercase text-[var(--primary)]">Documents scolaires</p><h1 className="mt-2 text-2xl font-bold text-[var(--accent)]">Mes bulletins</h1><p className="mt-1 text-sm text-slate-600">{student.fullName} · {student.className}</p></section><section className="elima-card">{reports.length === 0 ? <EmptyState title="Aucun bulletin disponible" description="Les bulletins publiés par ton établissement apparaîtront ici." /> : <ul className="space-y-3">{reports.map((report) => <li key={report.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div><p className="font-semibold text-slate-900">{report.term}</p><p className="mt-1 text-xs text-slate-500">Moyenne {Number(report.average_score).toFixed(2)}/20 · Assiduité {Number(report.attendance_rate).toFixed(1)}%</p></div><a href={`/api/reports/${student.id}?term=${encodeURIComponent(report.term)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white"><FileText size={16} /> Ouvrir le bulletin</a></li>)}</ul>}</section></div>;
}
