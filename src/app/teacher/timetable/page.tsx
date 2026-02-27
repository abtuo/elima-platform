export default function TeacherTimetablePage() {
  return (
    <div className="space-y-6">
      <header className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Emploi du temps</h1>
        <p className="mt-1 text-sm text-slate-600">Agenda agrégé de toutes vos classes. (Démo UI)</p>
      </header>

      <section className="elima-card">
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white">Jour</button>
          <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Semaine</button>
          <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Agenda</button>
        </div>

        <div className="mt-4 space-y-3">
          {[{ time: "08:00–09:30", title: "Mathématiques", cls: "6e A" }, { time: "10:00–11:30", title: "Français", cls: "5e B" }, { time: "14:00–15:30", title: "SVT", cls: "6e B" }].map(
            (e) => (
              <div key={e.time} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold">{e.time}</p>
                <p className="mt-1 text-base font-bold text-[var(--accent)]">{e.title} — {e.cls}</p>
                <p className="mt-1 text-sm text-slate-600">Salle A12 • Cours</p>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
