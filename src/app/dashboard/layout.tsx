"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  Menu,
  MessageCircleMore,
  Settings,
  Users,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/dashboard/students", label: "Élèves", icon: BookOpen },
  { href: "/dashboard/teachers", label: "Enseignants", icon: Users },
  { href: "/dashboard/classes", label: "Classes", icon: CalendarDays },
  { href: "/dashboard/reports", label: "Bulletins", icon: BarChart3 },
  { href: "/dashboard/messages", label: "Messages", icon: MessageCircleMore },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="h-full rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <Image src="/logo_e-lima.png" alt="Logo Elima" width={36} height={36} className="rounded-full" />
        <div>
          <p className="text-sm font-bold text-[var(--accent)]">Espace Administration</p>
          <p className="text-xs text-slate-600">Gestion de l’école</p>
        </div>
      </div>

      <nav className="mt-4 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={
                active
                  ? "flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900"
                  : "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              }
            >
              <item.icon size={18} className="text-[var(--primary)]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form className="mt-4" action="/api/auth/logout" method="POST">
        <button className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
          Se déconnecter
        </button>
      </form>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:grid-cols-[260px_1fr] md:px-8 md:py-10">
        {/* Desktop sidebar */}
        <div className="sticky top-6 hidden h-fit md:block">
          <Sidebar />
        </div>

        {/* Mobile top bar + drawer */}
        <div className="md:hidden">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={18} className="text-[var(--primary)]" />
              <p className="text-sm font-semibold">Administration</p>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl border border-slate-200 bg-white p-2"
              aria-label="Ouvrir le menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button aria-label="Fermer" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/30" />
            <div className="absolute left-4 top-4 bottom-4 w-[86vw] max-w-[340px]">
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        ) : null}

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
