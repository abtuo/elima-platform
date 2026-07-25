import Link from "next/link";
import { clsx } from "clsx";

type Props = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  action?: React.ReactNode;
  className?: string;
};

export function ActionCard({ title, description, icon, href, action, className }: Props) {
  const content = (
    <div className={clsx("elima-card flex items-start gap-3", className)}>
      {icon ? <div className="mt-0.5 text-[var(--primary)]">{icon}</div> : null}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--accent)]">{title}</p>
        {description ? <p className="mt-0.5 text-sm text-slate-600">{description}</p> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block transition hover:-translate-y-0.5 hover:shadow-md">
      {content}
    </Link>
  ) : (
    content
  );
}
