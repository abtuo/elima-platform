import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CockpitActionItem } from "@/lib/dashboard/cockpit";

const severityStyles: Record<CockpitActionItem["severity"], string> = {
  high: "border-rose-200 bg-rose-50/60 hover:bg-rose-50",
  medium: "border-amber-200 bg-amber-50/60 hover:bg-amber-50",
  low: "border-slate-200 bg-slate-50/60 hover:bg-slate-50",
};

const countStyles: Record<CockpitActionItem["severity"], string> = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-200 text-slate-700",
};

export function AlertCard({ item }: { item: CockpitActionItem }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition ${severityStyles[item.severity]}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{item.label}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${countStyles[item.severity]}`}>
          {item.count}
        </span>
        <ArrowRight size={14} className="text-slate-400" />
      </div>
    </Link>
  );
}
