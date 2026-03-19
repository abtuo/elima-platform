import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MessageCircleMore,
  School,
  Users,
} from "lucide-react";
import { getDashboardStatsForCurrentUserSchool } from "@/lib/dashboard/queries";
import { ReportsPanel } from "./ReportsPanel";

export default async function DashboardPage() {
  const stats = await getDashboardStatsForCurrentUserSchool();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Dashboard — {stats.schoolName}</h1>
        <p className="text-sm text-slate-600">
          Statistiques réelles (Supabase) pour ton établissement.
        </p>
        <form action="/api/auth/logout" method="POST" className="mt-3">
          <button className="rounded-lg border border-slate-300 px-3 py-1 text-xs">Se déconnecter</button>
        </form>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "École", value: 1, icon: School },
          { label: "Classes", value: stats.classesCount, icon: Users },
          { label: "Élèves", value: stats.studentsCount, icon: BookOpen },
          { label: "Enseignants", value: stats.teachersCount, icon: Users },
        ].map((kpi) => (
          <article className="elima-card" key={kpi.label}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <kpi.icon size={18} className="text-[var(--primary)]" />
            </div>
            <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Parents", value: stats.parentsCount, icon: Users },
          { label: "Évaluations", value: stats.evaluationsCount, icon: FileText },
          { label: "Notes", value: stats.gradesCount, icon: BarChart3 },
          { label: "Présences (enregistrements)", value: stats.attendanceRecordsCount, icon: ClipboardCheck },
        ].map((kpi) => (
          <article className="elima-card" key={kpi.label}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <kpi.icon size={18} className="text-[var(--primary)]" />
            </div>
            <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Conversations", value: stats.conversationsCount, icon: MessageCircleMore },
          { label: "Messages", value: stats.messagesCount, icon: MessageCircleMore },
        ].map((kpi) => (
          <article className="elima-card" key={kpi.label}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <kpi.icon size={18} className="text-[var(--primary)]" />
            </div>
            <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="elima-card">
          <h2 className="mb-3 text-lg font-semibold">Communication (MVP)</h2>
          <p className="text-sm text-slate-600">
            Tu peux déjà tester la messagerie (enseignant ↔ parent) via les tables
            <span className="font-mono"> conversations</span>, <span className="font-mono">conversation_participants</span> et <span className="font-mono">messages</span>.
          </p>
        </article>

        <article className="elima-card">
          <h2 className="mb-3 text-lg font-semibold">Suivi opérations MVP</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Présences quotidiennes</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Saisie notes & calcul moyennes</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Bulletin PDF par élève</li>
            <li className="flex items-center gap-2"><BarChart3 size={16} className="text-[var(--primary)]" /> Intelligence académique (risk_level / trend)</li>
          </ul>
        </article>
      </section>

      <section className="grid gap-4">
        <ReportsPanel />
      </section>
    </main>
  );
}
