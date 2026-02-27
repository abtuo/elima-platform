export default function TarifsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-8">
      <section className="elima-card space-y-3">
        <h1 className="text-2xl font-bold">Tarifs Elima</h1>
        <p className="text-sm text-slate-600">Plans indicatifs pour pilotes 5–20 écoles.</p>
        <ul className="grid gap-3 md:grid-cols-3">
          <li className="rounded-xl border border-slate-200 p-3 text-sm">Starter: 1 école pilote</li>
          <li className="rounded-xl border border-slate-200 p-3 text-sm">Growth: 5 écoles</li>
          <li className="rounded-xl border border-slate-200 p-3 text-sm">Réseau: 20 écoles</li>
        </ul>
      </section>
    </main>
  );
}
