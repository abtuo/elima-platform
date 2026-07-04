"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageCircleMore } from "lucide-react";

export function PortalNavTabs({ basePath }: { basePath: "/parent" | "/student" }) {
  const pathname = usePathname();
  const items = [
    { href: basePath, label: "Tableau de bord", icon: LayoutDashboard },
    { href: `${basePath}/messages`, label: "Messagerie", icon: MessageCircleMore },
  ];

  return (
    <nav className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white"
                : "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            }
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
