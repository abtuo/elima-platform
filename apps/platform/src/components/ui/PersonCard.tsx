import { clsx } from "clsx";

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
};

export function PersonCard({ title, subtitle, right, className }: Props) {
  return (
    <div className={clsx("flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3", className)}>
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        {subtitle ? <p className="truncate text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
