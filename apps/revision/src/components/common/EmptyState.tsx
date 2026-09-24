import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
};

export function EmptyState({ title, description, icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <Icon className="h-7 w-7 text-gray-400" />
      </div>
      <h3 className="font-title text-lg font-semibold text-accent">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p> : null}
    </div>
  );
}
