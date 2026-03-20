import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  MapPin,
  School,
  Users,
} from "lucide-react";
import { getDashboardStatsForCurrentUserSchool } from "@/lib/dashboard/queries";

export default async function DashboardPage() {
  const stats = await getDashboardStatsForCurrentUserSchool();

  const location = [stats.schoolCity, stats.schoolCountry].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <header className="elima-card flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[240px]">
          <h1 className="text-2xl font-bold text-[var(--accent)]">{stats.schoolName}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            {location ? (
              <span className="inline-flex items-center gap-2">
                <MapPin size={16} className="text-[var(--primary)]" />
                {location}
              </span>
            ) : null}
            {stats.schoolStatus ? (
              <span className="inline-flex items-center gap-2">
                <School size={16} className="text-[var(--primary)]" />
                {stats.schoolStatus === "public" ? "Public" : "Privé"}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/dashboard/settings"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Paramètres
          </a>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="elima-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Élèves</p>
            <BookOpen size={18} className="text-[var(--primary)]" />
          </div>
          <p className="mt-2 text-3xl font-bold">{stats.studentsCount}</p>
          <p className="mt-1 text-xs text-slate-500">Total d’élèves inscrits</p>
        </article>

        <article className="elima-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Enseignants</p>
            <GraduationCap size={18} className="text-[var(--primary)]" />
          </div>
          <p className="mt-2 text-3xl font-bold">{stats.teachersCount}</p>
          <p className="mt-1 text-xs text-slate-500">Personnel enseignant</p>
        </article>

        <article className="elima-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Classes</p>
            <Users size={18} className="text-[var(--primary)]" />
          </div>
          <p className="mt-2 text-3xl font-bold">{stats.classesCount}</p>
          <p className="mt-1 text-xs text-slate-500">Classes actives</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="elima-card lg:col-span-2">
          <h2 className="text-lg font-semibold">Activité</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Présences</p>
              <p className="mt-2 text-2xl font-bold">{stats.attendanceRecordsCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Notes</p>
              <p className="mt-2 text-2xl font-bold">{stats.gradesCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Évaluations</p>
              <p className="mt-2 text-2xl font-bold">{stats.evaluationsCount}</p>
            </div>
          </div>
        </article>

        <article className="elima-card">
          <h2 className="text-lg font-semibold">Accès rapide</h2>
          <div className="mt-4 space-y-2 text-sm">
            <a className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50" href="/dashboard/students">
              <span className="inline-flex items-center gap-2"><BookOpen size={16} className="text-[var(--primary)]" /> Gérer les élèves</span>
              <span className="text-slate-400">→</span>
            </a>
            <a className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50" href="/dashboard/teachers">
              <span className="inline-flex items-center gap-2"><GraduationCap size={16} className="text-[var(--primary)]" /> Gérer les enseignants</span>
              <span className="text-slate-400">→</span>
            </a>
            <a className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50" href="/dashboard/classes">
              <span className="inline-flex items-center gap-2"><Users size={16} className="text-[var(--primary)]" /> Gérer les classes</span>
              <span className="text-slate-400">→</span>
            </a>
          </div>
        </article>
      </section>

      <section className="elima-card">
        <h2 className="text-lg font-semibold">Fonctionnalités</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <ClipboardCheck size={18} className="mt-0.5 text-[var(--primary)]" />
            <div>
              <p className="text-sm font-semibold">Présences</p>
              <p className="text-sm text-slate-600">Suivi des présences par classe.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <BarChart3 size={18} className="mt-0.5 text-[var(--primary)]" />
            <div>
              <p className="text-sm font-semibold">Notes</p>
              <p className="text-sm text-slate-600">Évaluations, notes et moyenne.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <CheckCircle2 size={18} className="mt-0.5 text-[var(--primary)]" />
            <div>
              <p className="text-sm font-semibold">Bulletins</p>
              <p className="text-sm text-slate-600">Génération de bulletins PDF.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <School size={18} className="mt-0.5 text-[var(--primary)]" />
            <div>
              <p className="text-sm font-semibold">Gestion de l’école</p>
              <p className="text-sm text-slate-600">Paramètres et informations.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
