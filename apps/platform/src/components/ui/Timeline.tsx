import { clsx } from "clsx";

export type TimelineItem = {
  time: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
};

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <div className={clsx("space-y-3", className)}>
      {items.map((it) => (
        <div key={it.time + it.title} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">{it.time}</p>
            <p className="mt-0.5 font-semibold text-[var(--accent)]">{it.title}</p>
            {it.description ? <p className="mt-0.5 text-sm text-slate-600">{it.description}</p> : null}
          </div>
          {it.right ? <div className="shrink-0">{it.right}</div> : null}
        </div>
      ))}
    </div>
  );
}
