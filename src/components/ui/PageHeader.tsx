export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="elima-card">
      <h1 className="text-2xl font-bold text-[var(--accent)]">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
    </header>
  );
}
