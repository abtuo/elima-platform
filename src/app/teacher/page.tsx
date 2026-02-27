import Link from "next/link";
import { CalendarDays, FileText, ClipboardCheck, ListTodo } from "lucide-react";

export default function TeacherOverviewPage() {
  return (
    <div className="space-y-6">
      <header className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Bienvenue 👋</h1>
        <p className="mt-1 text-sm text-slate-600">
          Retrouvez vos prochaines heures, vos classes, et accédez rapidement aux actions clés.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="elima-card">
          <h2 className="text-lg font-semibold">Mes classes</h2>
          <p className="mt-1 text-sm text-slate-600">6e A • 6e B • 5e B</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["6e A", "6e B", "5e B"].map((c) => (
              <span key={c} className="rounded-full bg-[var(--secondary)]/25 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {c}
              </span>
            ))}
          </div>
        </article>

        <article className="elima-card">
          <h2 className="text-lg font-semibold">Prochains cours</h2>
          <div className="mt-3 space-y-3">
            {[{ t: "08:00", c: "6e A", s: "Mathématiques" }, { t: "10:00", c: "5e B", s: "Français" }, { t: "14:00", c: "6e B", s: "SVT" }].map(
              (it) => (
                <div key={it.t + it.c} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold">{it.t} — {it.c} • {it.s}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" href="/teacher/attendance">
                      Faire l’appel
                    </Link>
                    <Link className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100" href="/teacher/grades">
                      Saisir notes
                    </Link>
                  </div>
                </div>
              ),
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/teacher/timetable" className="elima-card flex items-center gap-3 hover:bg-slate-50">
          <CalendarDays className="text-[var(--primary)]" size={18} />
          <div>
            <p className="font-semibold">Emploi du temps</p>
            <p className="text-xs text-slate-600">Calendrier & agenda</p>
          </div>
        </Link>
        <Link href="/teacher/grades" className="elima-card flex items-center gap-3 hover:bg-slate-50">
          <FileText className="text-[var(--primary)]" size={18} />
          <div>
            <p className="font-semibold">Saisie de notes</p>
            <p className="text-xs text-slate-600">Élève par élève</p>
          </div>
        </Link>
        <Link href="/teacher/attendance" className="elima-card flex items-center gap-3 hover:bg-slate-50">
          <ClipboardCheck className="text-[var(--primary)]" size={18} />
          <div>
            <p className="font-semibold">Présences</p>
            <p className="text-xs text-slate-600">Appel par classe</p>
          </div>
        </Link>
        <Link href="/teacher/memo" className="elima-card flex items-center gap-3 hover:bg-slate-50">
          <ListTodo className="text-[var(--primary)]" size={18} />
          <div>
            <p className="font-semibold">Todo / Mémo</p>
            <p className="text-xs text-slate-600">Notes personnelles</p>
          </div>
        </Link>
      </section>
    </div>
  );
}
