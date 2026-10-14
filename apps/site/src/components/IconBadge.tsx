import type { LucideIcon } from "lucide-react";
type IconBadgeProps = {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function IconBadge({ icon: Icon, size = "md", className = "" }: IconBadgeProps) {
  const sizes = {
    sm: { wrap: "h-9 w-9", icon: 18 },
    md: { wrap: "h-12 w-12", icon: 22 },
    lg: { wrap: "h-14 w-14", icon: 26 },
  } as const;
  const s = sizes[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--secondary)]/20 ring-1 ring-[var(--primary)]/15 shadow-sm ${s.wrap} ${className}`}
    >
      <Icon className="text-[var(--primary)]" size={s.icon} strokeWidth={2} />
    </span>
  );
}
