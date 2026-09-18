import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  Download,
  FileText,
  GraduationCap,
  Mail,
  Receipt,
  ShoppingBag,
  WalletCards,
} from "lucide-react";
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
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { EmptyState } from "@/components/dashboard/EmptyState";

type Audience = "parent" | "student";

function money(value: number, currency: string) {
  const label = currency === "XOF" ? "FCFA" : currency;
  return `${value.toLocaleString("fr-FR")} ${label}`;
}

function shortDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Retard",
};

function QuickAction({
  href,
  icon,
  label,
  external = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  external?: boolean;
}) {
  const className =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";

  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {icon}
        {label}
      </a>
    );
  }

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {icon}
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {icon}
      {label}
    </Link>
  );
}

export async function StudentPortalView({
  student,
  audience = "student",
}: {
  student: AccessibleStudent;
  audience?: Audience;
}) {
  const [academics, attendance, homeworks, timetable, reports, finance] = await Promise.all([
    getStudentAcademics(student.id),
    getAttendanceSummary(student.id),
    getStudentHomeworks(student.classId),
    getStudentTimetable(student.classId),
    getStudentReports(student.id),
    getStudentFinance(student.schoolId, student.id),
  ]);

  const latestReport = reports[0];
  const latestReceipt = finance.payments.find((p) => p.receiptNo);
  const recentAbsences = attendance.recent.filter((a) => a.status === "ABSENT" || a.status === "LATE").slice(0, 5);
  const nextHomeworks = homeworks.slice(0, 5);
  const nextCourses = timetable.slice(0, 5);
  const importantMessages =
    audience === "parent"
      ? [
          finance.balance.remaining > 0
            ? `Solde restant a regler : ${money(finance.balance.remaining, finance.currency)}.`
            : "Aucun solde restant a payer.",
          reports.length > 0 ? "Un bulletin est disponible en telechargement." : "Aucun bulletin publie pour le moment.",
        ]
      : [
          nextHomeworks.length > 0 ? `${nextHomeworks.length} devoir(s) a organiser.` : "Aucun devoir urgent pour le moment.",
          academics.generalAverage !== null ? "Continue a suivre ta progression par matiere." : "Tes notes apparaitront apres les premieres evaluations.",
        ];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {audience === "parent" ? "Resume par enfant" : "Mon tableau de bord"}
            </p>
            <h2 className="mt-0.5 text-xl font-bold text-slate-900 md:text-2xl">{student.fullName}</h2>
            <p className="mt-1 text-sm text-slate-500">Classe {student.className}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:flex md:flex-wrap md:justify-end">
            {audience === "parent" ? (
              <>
                <QuickAction href="#notes" icon={<GraduationCap size={16} />} label="Voir les notes" />
                <QuickAction
                  href={latestReport ? `/api/reports/${student.id}?term=${encodeURIComponent(latestReport.term)}` : "#bulletins"}
                  icon={<Download size={16} />}
                  label="Bulletin"
                  external={Boolean(latestReport)}
                />
                <QuickAction href="#devoirs" icon={<BookOpen size={16} />} label="Devoirs" />
                <QuickAction href={`/parent/pay?child=${student.id}`} icon={<WalletCards size={16} />} label="Payer en ligne" />
                <QuickAction href={`/parent/store?child=${student.id}`} icon={<ShoppingBag size={16} />} label="Fournitures" />
                <QuickAction href="#paiements" icon={<Receipt size={16} />} label="Historique" />
                <QuickAction href="mailto:contact@elima.africa" icon={<Mail size={16} />} label="Contacter" external />
              </>
            ) : (
              <>
                <QuickAction href="#devoirs" icon={<BookOpen size={16} />} label="Mes devoirs" />
                <QuickAction href="#notes" icon={<GraduationCap size={16} />} label="Mes notes" />
                <QuickAction href="#planning" icon={<CalendarDays size={16} />} label="Planning" />
                <QuickAction
                  href={latestReport ? `/api/reports/${student.id}?term=${encodeURIComponent(latestReport.term)}` : "#bulletins"}
                  icon={<Download size={16} />}
                  label="Bulletin"
                  external={Boolean(latestReport)}
                />
                <QuickAction href="#devoirs" icon={<FileText size={16} />} label="Ressources" />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={audience === "parent" ? "Moyenne generale" : "Ma moyenne generale"}
          value={academics.generalAverage !== null ? `${academics.generalAverage}/20` : "-"}
          trend="neutral"
          trendLabel={academics.subjects.length ? `${academics.subjects.length} matiere(s)` : "En attente de notes"}
          icon={<GraduationCap size={20} />}
          status="success"
        />
        <StatCard
          title="Dernieres notes"
          value={academics.recentGrades.length}
          trend="neutral"
          trendLabel="Notes publiees"
          icon={<FileText size={20} />}
        />
        <StatCard
          title={audience === "parent" ? "Absences / retards" : "Absences / retards"}
          value={attendance.absent + attendance.late}
          trend={attendance.absent + attendance.late > 0 ? "down" : "neutral"}
          trendLabel={`${attendance.rate}% de presence`}
          icon={<CalendarDays size={20} />}
          status={attendance.absent + attendance.late > 0 ? "warning" : "success"}
        />
        {audience === "parent" ? (
          <StatCard
            title="Solde a payer"
            value={money(finance.balance.remaining, finance.currency)}
            trend="neutral"
            trendLabel={finance.balance.remaining > 0 ? "Paiement a suivre" : "A jour"}
            icon={<WalletCards size={20} />}
            status={finance.balance.remaining > 0 ? "warning" : "success"}
          />
        ) : (
          <StatCard
            title="Devoirs a faire"
            value={nextHomeworks.length}
            trend={nextHomeworks.length ? "up" : "neutral"}
            trendLabel={nextHomeworks.length ? "A organiser" : "Rien a rendre"}
            icon={<BookOpen size={20} />}
          />
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <DashboardSection id="notes" title="Dernieres notes" subtitle="Evaluations recemment publiees">
            {academics.recentGrades.length === 0 ? (
              <EmptyState title="Aucune note recente" description="Les notes apparaitront ici des leur saisie." />
            ) : (
              <ul className="space-y-2">
                {academics.recentGrades.slice(0, 6).map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{g.subject}</p>
                      <p className="truncate text-xs text-slate-500">
                        {g.title} - {shortDate(g.date)}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold tabular-nums text-[var(--primary)]">
                      {g.score}/{g.maxScore}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          <DashboardSection id="devoirs" title={audience === "parent" ? "Devoirs a venir" : "Devoirs a faire"} subtitle="Travail donne a la classe">
            {nextHomeworks.length === 0 ? (
              <EmptyState title="Aucun devoir" description="Aucun devoir n'a ete donne pour cette classe." />
            ) : (
              <ul className="space-y-2">
                {nextHomeworks.map((h) => (
                  <li key={h.id} className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{h.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{h.subject}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                        {shortDate(h.dueDate)}
                      </span>
                    </div>
                    {h.description ? <p className="mt-2 text-sm text-slate-600">{h.description}</p> : null}
                    {h.resourceUrl ? (
                      <a
                        href={h.resourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]"
                      >
                        Document joint <Download size={13} />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          <DashboardSection title="Progression par matiere" subtitle="Moyennes et coefficients">
            {academics.subjects.length === 0 ? (
              <EmptyState title="Aucune moyenne" description="La progression apparaitra apres les premieres evaluations." />
            ) : (
              <div className="space-y-3">
                {academics.subjects.map((s) => (
                  <div key={s.subject} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate font-medium text-slate-800">{s.subject}</span>
                      <span className="shrink-0 font-semibold text-[var(--primary)]">{s.average}/20</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${Math.max(6, (s.average / 20) * 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500">Coef. {s.coefficient} - {s.count} note(s)</p>
                  </div>
                ))}
              </div>
            )}
          </DashboardSection>
        </div>

        <div className="space-y-4">
          <DashboardSection title="Messages importants" subtitle="Informations utiles">
            <div className="space-y-2">
              {importantMessages.map((message) => (
                <div key={message} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <Bell size={14} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                    <p className="text-sm text-slate-700">{message}</p>
                  </div>
                </div>
              ))}
            </div>
          </DashboardSection>

          <DashboardSection title="Absences / retards recents" subtitle="Derniers relevés d'assiduite">
            {recentAbsences.length === 0 ? (
              <EmptyState title="Aucun retard ou absence recent" description="Les derniers relevés apparaitront ici." />
            ) : (
              <ul className="space-y-2">
                {recentAbsences.map((a, idx) => (
                  <li key={`${a.date}-${idx}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm">
                    <span className="text-slate-600">{shortDate(a.date)}</span>
                    <span className={a.status === "ABSENT" ? "font-semibold text-rose-600" : "font-semibold text-amber-600"}>
                      {STATUS_LABELS[a.status] ?? a.status}
                      {a.reason ? ` - ${a.reason}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          <DashboardSection id="planning" title="Prochains cours" subtitle="Emploi du temps">
            {nextCourses.length === 0 ? (
              <EmptyState title="Aucun cours planifie" />
            ) : (
              <ul className="space-y-2">
                {nextCourses.map((e) => (
                  <li key={e.id} className="rounded-xl border border-slate-100 px-3 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-800">{e.subject}</span>
                      <span className="shrink-0 text-xs text-slate-500">{shortDate(e.startsAt)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(e.startsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {e.room ? ` - ${e.room}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          <DashboardSection id="bulletins" title="Bulletins disponibles" subtitle="Documents publies">
            {reports.length === 0 ? (
              <EmptyState title="Aucun bulletin" description="Les bulletins publies apparaitront ici." />
            ) : (
              <ul className="space-y-2">
                {reports.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{r.term}</p>
                      <p className="text-xs text-slate-500">Moyenne {Number(r.average_score).toFixed(2)}/20</p>
                    </div>
                    <a
                      href={`/api/reports/${student.id}?term=${encodeURIComponent(r.term)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <FileText size={13} /> PDF
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>
        </div>
      </div>

      {audience === "parent" ? (
        <DashboardSection id="paiements" title="Paiements" subtitle="Solde et derniers paiements">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard title="Total attendu" value={money(finance.balance.expected, finance.currency)} />
            <StatCard title="Total paye" value={money(finance.balance.paid, finance.currency)} status="success" />
            <StatCard
              title="Reste a payer"
              value={money(finance.balance.remaining, finance.currency)}
              status={finance.balance.remaining > 0 ? "warning" : "success"}
            />
          </div>
          {finance.balance.remaining > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/parent/pay?child=${student.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <WalletCards size={16} /> Régler {money(finance.balance.remaining, finance.currency)}
              </Link>
            </div>
          ) : null}
          {finance.payments.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="Aucun paiement enregistre" />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {finance.payments.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{money(p.amount, finance.currency)}</p>
                    <p className="text-xs text-slate-500">
                      {shortDate(p.paidAt)} - {p.method}
                    </p>
                  </div>
                  {p.receiptNo ? (
                    <a
                      href={`/api/finance/receipt/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Recu
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>
      ) : null}
    </div>
  );
}
