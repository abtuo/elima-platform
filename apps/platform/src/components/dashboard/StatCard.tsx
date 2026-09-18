import type { ReactNode } from "react";
import type { TrendDirection } from "@/lib/dashboard/cockpit";
import { TrendBadge } from "@/components/dashboard/TrendBadge";

type StatStatus = "default" | "success" | "warning" | "danger";

const statusStyles: Record<StatStatus, string> = {
  default: "bg-slate-50 text-[var(--primary)]",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-700",
};

export function StatCard({
  title,
  value,
  trend,
  trendLabel,
  icon,
  status = "default",
}: {
  title: string;
  value: ReactNode;
  trend?: TrendDirection;
  trendLabel?: string;
  icon?: ReactNode;
  status?: StatStatus;
}) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900 md:text-3xl">{value}</p>
          {trend && trendLabel ? (
            <div className="mt-2">
              <TrendBadge direction={trend} label={trendLabel} />
            </div>
          ) : null}
        </div>
        {icon ? (
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${statusStyles[status]}`}>{icon}</div>
        ) : null}
      </div>
    </article>
  );
}
