export default function ParentPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 md:px-8">
      <section className="elima-card space-y-3">
        <h1 className="text-2xl font-bold">Espace Parent</h1>
        <p className="text-sm text-slate-600">
          Consultez les notes, absences, alertes de risque et téléchargez les bulletins PDF.
        </p>
        <form action="/api/auth/logout" method="POST">
          <button className="rounded-lg border border-slate-300 px-3 py-1 text-xs">Se déconnecter</button>
        </form>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="elima-card">
          <h2 className="font-semibold">Suivi enfant</h2>
          <p className="mt-1 text-sm text-slate-600">Moyenne: 13.4/20 · Présence: 94%</p>
        </article>
        <article className="elima-card">
          <h2 className="font-semibold">Notifications</h2>
          <p className="mt-1 text-sm text-slate-600">Absences, bulletin publié, alertes de risque.</p>
        </article>
      </section>
    </main>
  );
}
