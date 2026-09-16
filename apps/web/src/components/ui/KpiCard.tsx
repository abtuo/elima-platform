import type { ReactNode } from "react";

export function KpiCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {icon ? <div className="rounded-2xl bg-slate-100 p-3 text-[var(--primary)]">{icon}</div> : null}
      </div>
    </article>
  );
}
