import type { TrendDirection } from "@/lib/dashboard/cockpit";

const styles: Record<TrendDirection, string> = {
  up: "bg-emerald-50 text-emerald-700",
  down: "bg-rose-50 text-rose-700",
  neutral: "bg-slate-100 text-slate-600",
};

const icons: Record<TrendDirection, string> = {
  up: "↗",
  down: "↘",
  neutral: "→",
};

export function TrendBadge({
  direction,
  label,
}: {
  direction: TrendDirection;
  label: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[direction]}`}>
      <span aria-hidden>{icons[direction]}</span>
      {label}
    </span>
  );
}
