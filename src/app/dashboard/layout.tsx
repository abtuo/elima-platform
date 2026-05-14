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
  LogOut,
  Menu,
  MessageCircleMore,
  Settings,
  Users,
} from "lucide-react";
import { ToastProvider } from "@/components/ui/Toast";

const nav = [
  { href: "/dashboard", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/dashboard/kpis", label: "KPIs", icon: BarChart3 },
  { href: "/dashboard/students", label: "Élèves", icon: BookOpen },
  { href: "/dashboard/teachers", label: "Enseignants", icon: Users },
  { href: "/dashboard/classes", label: "Classes", icon: CalendarDays },
  { href: "/dashboard/reports", label: "Bulletins", icon: BarChart3 },
  { href: "/dashboard/messages", label: "Messages", icon: MessageCircleMore },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col rounded-3xl bg-[var(--primary)] p-4 text-white shadow-lg">
      <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
        <Image src="/logo.png" alt="Logo Elima" width={36} height={36} className="rounded-full bg-white" />
        <div>
          <p className="text-sm font-semibold">Espace Administration</p>
          <p className="text-xs text-white/80">Retour à l’accueil</p>
        </div>
      </Link>

      <nav className="mt-6 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={
                active
                  ? "flex items-center gap-3 rounded-2xl bg-white/15 px-3 py-2 text-sm font-semibold text-white"
                  : "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10"
              }
            >
              <item.icon size={18} className="text-white" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-white/15 pt-4">
        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          className={
            pathname === "/dashboard/settings"
              ? "flex items-center gap-3 rounded-2xl bg-white/15 px-3 py-2 text-sm font-semibold text-white"
              : "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10"
          }
        >
          <Settings size={18} className="text-white" />
          Paramètres
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-white/10">
            <LogOut size={18} className="text-white" />
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <ToastProvider>
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
    </ToastProvider>
  );
}
