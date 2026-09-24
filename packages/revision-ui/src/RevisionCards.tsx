import type { LucideIcon } from "lucide-react";
import { cn } from "./utils";

export type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
};

export function StatCard({ icon: Icon, label, value, subtitle }: StatCardProps) {
  return <article className="card tap flex h-full p-5 transition-shadow hover:shadow-soft"><div className="flex w-full items-start justify-between"><div><p className="text-sm font-medium text-gray-500">{label}</p><p className="font-title mt-1 text-4xl font-bold leading-none text-accent">{value}</p>{subtitle ? <p className="mt-1 text-xs text-gray-400">{subtitle}</p> : null}</div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div></div></article>;
}

export type ActionCardProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  colorClass: string;
  onClick?: () => void;
};

export function ActionCard({ title, subtitle, icon: Icon, colorClass, onClick }: ActionCardProps) {
  return <button type="button" onClick={onClick} className={cn("tap relative block w-full overflow-hidden rounded-[14px] p-6 text-left text-white shadow-soft transition hover:-translate-y-0.5", colorClass)}><span className="action-bubble action-bubble-1" /><span className="action-bubble action-bubble-2" /><div className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/35 bg-white/10"><Icon className="h-6 w-6 text-white" /></div><h3 className="relative z-10 font-title text-xl font-semibold">{title}</h3><p className="relative z-10 mt-1 text-sm text-white/80">{subtitle}</p></button>;
}

export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${pct}%` }} /></div>;
}
