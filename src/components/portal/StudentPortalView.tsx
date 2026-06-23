import { FileText } from "lucide-react";
import {
  getAttendanceSummary,
  getStudentAcademics,
  getStudentFinance,
  getStudentHomeworks,
  getStudentReports,
  getStudentTimetable,
  type AccessibleStudent,
} from "@/lib/portal/queries";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/dashboard/EmptyState";

function money(value: number, currency: string) {
  return `${value.toLocaleString("fr-FR")} ${currency}`;
}

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  LATE: "Retard",
};

export async function StudentPortalView({ student }: { student: AccessibleStudent }) {
  const [academics, attendance, homeworks, timetable, reports, finance] = await Promise.all([
    getStudentAcademics(student.id),
    getAttendanceSummary(student.id),
    getStudentHomeworks(student.classId),
    getStudentTimetable(student.classId),
    getStudentReports(student.id),
    getStudentFinance(student.schoolId, student.id),
  ]);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Moyenne générale"
          value={academics.generalAverage !== null ? `${academics.generalAverage}/20` : "—"}
        />
        <StatCard title="Taux de présence" value={`${attendance.rate}%`} status="success" />
        <StatCard
          title="Reste à payer"
          value={money(finance.balance.remaining, finance.currency)}
          status={finance.balance.remaining > 0 ? "warning" : "success"}
        />
        <StatCard title="Devoirs à venir" value={homeworks.length} />
      </section>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Moyennes par matière</h2>
        {academics.subjects.length === 0 ? (
          <EmptyState title="Aucune note" description="Les notes apparaîtront ici dès leur saisie." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Matière</th>
                  <th className="py-2 pr-3">Coef.</th>
                  <th className="py-2 pr-3">Moyenne</th>
                </tr>
              </thead>
              <tbody>
                {academics.subjects.map((s) => (
                  <tr key={s.subject} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{s.subject}</td>
                    <td className="py-2 pr-3 text-slate-600">{s.coefficient}</td>
                    <td className="py-2 pr-3 tabular-nums font-semibold">{s.average}/20</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="elima-card space-y-3">
          <h2 className="text-lg font-semibold">Dernières notes</h2>
          {academics.recentGrades.length === 0 ? (
            <EmptyState title="Aucune note récente" />
          ) : (
            <ul className="space-y-2">
              {academics.recentGrades.map((g) => (
                <li key={g.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{g.subject}</p>
                    <p className="truncate text-xs text-slate-500">
                      {g.title} · {g.date}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums text-[var(--primary)]">
                    {g.score}/{g.maxScore}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="elima-card space-y-3">
          <h2 className="text-lg font-semibold">Assiduité récente</h2>
          {attendance.recent.length === 0 ? (
            <EmptyState title="Aucun relevé" />
          ) : (
            <ul className="space-y-2">
              {attendance.recent.map((a, idx) => (
                <li key={`${a.date}-${idx}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                  <span className="text-slate-600">{a.date}</span>
                  <span
                    className={
                      a.status === "PRESENT"
                        ? "font-semibold text-emerald-700"
                        : a.status === "ABSENT"
                          ? "font-semibold text-rose-600"
                          : "font-semibold text-amber-600"
                    }
                  >
                    {STATUS_LABELS[a.status] ?? a.status}
                    {a.reason ? ` · ${a.reason}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Devoirs</h2>
        {homeworks.length === 0 ? (
          <EmptyState title="Aucun devoir" description="Aucun devoir n'a été donné pour cette classe." />
        ) : (
          <ul className="space-y-2">
            {homeworks.map((h) => (
              <li key={h.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-800">{h.title}</p>
                  <span className="shrink-0 text-xs text-slate-500">à rendre le {h.dueDate}</span>
                </div>
                <p className="text-xs text-slate-500">{h.subject}</p>
                {h.description ? <p className="mt-1 text-sm text-slate-600">{h.description}</p> : null}
                {h.resourceUrl ? (
                  <a href={h.resourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold text-[var(--primary)] underline">
                    Ressource
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="elima-card space-y-3">
          <h2 className="text-lg font-semibold">Emploi du temps</h2>
          {timetable.length === 0 ? (
            <EmptyState title="Aucun cours planifié" />
          ) : (
            <ul className="space-y-2">
              {timetable.slice(0, 12).map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                  <span className="font-semibold text-slate-800">{e.subject}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(e.startsAt).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                    {e.room ? ` · ${e.room}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="elima-card space-y-3">
          <h2 className="text-lg font-semibold">Bulletins</h2>
          {reports.length === 0 ? (
            <EmptyState title="Aucun bulletin" description="Les bulletins publiés apparaîtront ici." />
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{r.term}</p>
                    <p className="text-xs text-slate-500">
                      Moyenne {Number(r.average_score).toFixed(2)}/20 · Présence {Number(r.attendance_rate)}%
                    </p>
                  </div>
                  <a
                    href={`/api/reports/${student.id}?term=${encodeURIComponent(r.term)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <FileText size={13} /> PDF
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Frais scolaires</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard title="Total attendu" value={money(finance.balance.expected, finance.currency)} />
          <StatCard title="Total payé" value={money(finance.balance.paid, finance.currency)} status="success" />
          <StatCard
            title="Reste à payer"
            value={money(finance.balance.remaining, finance.currency)}
            status={finance.balance.remaining > 0 ? "warning" : "success"}
          />
        </div>
        {finance.payments.length === 0 ? (
          <EmptyState title="Aucun paiement enregistré" />
        ) : (
          <ul className="space-y-2">
            {finance.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{money(p.amount, finance.currency)}</p>
                  <p className="text-xs text-slate-500">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString("fr-FR") : "—"} · {p.method}
                  </p>
                </div>
                {p.receiptNo ? (
                  <a
                    href={`/api/finance/receipt/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Reçu
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
