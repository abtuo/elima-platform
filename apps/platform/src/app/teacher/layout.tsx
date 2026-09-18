"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookMarked,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleMore,
  NotebookPen,
  Settings as SettingsIcon,
  ShoppingBag,
  StickyNote,
  University,
} from "lucide-react";

import { TeacherContextProvider } from "./TeacherContext";
import { ToastProvider } from "@/components/ui/Toast";
import { DemoModeBanner } from "@/components/ui/DemoModeBanner";
import { MessagerieNavLabel } from "@/components/messaging/MessagerieNavLabel";
import { useMessagingUnreadCount } from "@/hooks/useMessagingUnreadCount";

const nav = [
  { href: "/teacher", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/teacher/timetable", label: "Emploi du temps", icon: CalendarDays },
  { href: "/teacher/grades", label: "Notes", icon: FileText },
  { href: "/teacher/averages", label: "Moyennes", icon: BarChart3 },
  { href: "/teacher/attendance", label: "Présences", icon: ClipboardCheck },
  { href: "/teacher/homework", label: "Devoirs", icon: BookMarked },
  { href: "/teacher/supplies", label: "Fournitures", icon: ShoppingBag },
  { href: "/teacher/lessons", label: "Cahier de textes", icon: NotebookPen },
  { href: "/teacher/messages", label: "Messagerie", icon: MessageCircleMore },
  { href: "/teacher/memo", label: "Todo", icon: StickyNote },
  { href: "/teacher/resources", label: "Ressources", icon: University },
  { href: "/teacher/settings", label: "Paramètres", icon: SettingsIcon },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const unreadMessages = useMessagingUnreadCount(true);

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-[#256f47] to-[var(--primary)] p-4 text-white shadow-xl shadow-[var(--primary)]/20">
      <Link href="/" className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-white/10" onClick={onNavigate}>
        <Image src="/logo.png" alt="Logo Elima" width={36} height={36} className="rounded-full bg-white ring-2 ring-white/30" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Espace Enseignant</p>
          <p className="text-xs text-white/70">Suivi pédagogique</p>
        </div>
      </Link>

      <nav className="mt-5 space-y-0.5">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={
                active
                  ? "flex items-center gap-3 rounded-xl bg-white/15 px-3 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-white/10"
                  : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10"
              }
            >
              <item.icon size={18} className={active ? "text-[var(--secondary)]" : "text-white/90"} />
              {item.href === "/teacher/messages" ? (
                <MessagerieNavLabel count={unreadMessages} variant="sidebar-dark" />
              ) : (
                item.label
              )}
            </Link>
          );
        })}
      </nav>

      <form className="mt-auto border-t border-white/15 pt-4" action="/api/auth/logout" method="POST">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white/85 transition hover:bg-white/10">
          <LogOut size={18} />
          Se déconnecter
        </button>
      </form>
    </aside>
  );
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    let active = true;
    async function checkOnboarding() {
      try {
        const res = await fetch("/api/teacher/onboarding");
        const body = (await res.json().catch(() => null)) as { mustChangeCode?: boolean } | null;
        if (!active) return;
        const mustChange = Boolean(body?.mustChangeCode);
        if (mustChange && pathname !== "/teacher/onboarding") {
          router.replace("/teacher/onboarding");
          return;
        }
        if (!mustChange && pathname === "/teacher/onboarding") {
          router.replace("/teacher");
          return;
        }
      } catch {
      } finally {
        if (active) setCheckingOnboarding(false);
      }
    }
    checkOnboarding().catch(() => {
      if (active) setCheckingOnboarding(false);
    });
    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (checkingOnboarding && pathname !== "/teacher/onboarding") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-slate-500">Chargement...</p>
      </div>
    );
  }

  return (
    <TeacherContextProvider>
      <ToastProvider>
        <div className="min-h-screen bg-background text-foreground">
          <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 md:grid-cols-[248px_1fr] md:px-6 md:py-8">
            <div className="sticky top-5 hidden h-fit md:block">
              <Sidebar />
            </div>

            <div className="md:hidden">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <Link href="/" className="flex items-center gap-2">
                  <GraduationCap size={18} className="text-[var(--primary)]" />
                  <p className="text-sm font-semibold">Espace Enseignant</p>
                </Link>
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
                <button
                  aria-label="Fermer"
                  onClick={() => setDrawerOpen(false)}
                  className="absolute inset-0 bg-black/30"
                />
                <div className="absolute left-3 top-3 bottom-3 w-[88vw] max-w-[320px]">
                  <Sidebar onNavigate={() => setDrawerOpen(false)} />
                </div>
              </div>
            ) : null}

            <main className="min-w-0">
              <DemoModeBanner />
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </TeacherContextProvider>
  );
}
