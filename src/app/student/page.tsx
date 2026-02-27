export default function StudentPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 md:px-8">
      <section className="elima-card space-y-3">
        <h1 className="text-2xl font-bold">Espace Élève</h1>
        <p className="text-sm text-slate-600">
          Visualisez vos résultats, votre assiduité, votre tendance de progression et votre niveau de risque.
        </p>
        <form action="/api/auth/logout" method="POST">
          <button className="rounded-lg border border-slate-300 px-3 py-1 text-xs">Se déconnecter</button>
        </form>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="elima-card">
          <h2 className="font-semibold">Mes performances</h2>
          <p className="mt-1 text-sm text-slate-600">Moyenne générale: 15.1/20 · Tendance: Improving</p>
        </article>
        <article className="elima-card">
          <h2 className="font-semibold">Assiduité</h2>
          <p className="mt-1 text-sm text-slate-600">Taux de présence: 97% · Niveau de risque: LOW</p>
        </article>
      </section>
    </main>
  );
}
