"use client";

type Variant = "sidebar-dark" | "sidebar-light" | "tab-active" | "tab-inactive";

export function MessagerieNavLabel({ count, variant = "sidebar-light" }: { count: number; variant?: Variant }) {
  const badge =
    count > 0 ? (
      <span
        className={
          variant === "sidebar-dark"
            ? "inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-[var(--primary)]"
            : variant === "tab-active"
              ? "inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ring-1 ring-white/30"
              : "inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
        }
        aria-label={`${count} message(s) non lu(s)`}
      >
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  return (
    <span className="flex items-center gap-2">
      {badge}
      Messagerie
    </span>
  );
}
