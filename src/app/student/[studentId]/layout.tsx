"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Menu,
  Settings as SettingsIcon,
  BookOpen,
  Files,
} from "lucide-react";

import { getStudentProfile } from "@/lib/student/demo";

function Nav({ studentId }: { studentId: string }) {
  const pathname = usePathname();

  const items = useMemo(
    () => [
      { href: `/student/${studentId}`, label: "Vue d’ensemble", icon: LayoutDashboard },
      { href: `/student/${studentId}/timetable`, label: "Emploi du temps", icon: CalendarDays },
      { href: `/student/${studentId}/grades`, label: "Notes", icon: FileText },
      { href: `/student/${studentId}/averages`, label: "Moyennes", icon: BarChart3 },
      { href: `/student/${studentId}/attendance`, label: "Présences", icon: ClipboardCheck },
      { href: `/student/${studentId}/homework`, label: "Devoirs", icon: BookOpen },
      { href: `/student/${studentId}/documents`, label: "Documents", icon: Files },
      { href: `/student/${studentId}/settings`, label: "Paramètres", icon: SettingsIcon },
    ],
    [studentId],
  );

  return (
    <nav className="mt-4 space-y-1">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={
              active
                ? "flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900"
                : "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            }
          >
            <it.icon size={18} className="text-[var(--primary)]" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function StudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { studentId: string };
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const profile = getStudentProfile(params.studentId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:grid-cols-[260px_1fr] md:px-8 md:py-10">
        {/* Desktop sidebar */}
        <aside className="sticky top-6 hidden h-fit md:block">
          <div className="h-full rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <Image src="/logo_e-lima.png" alt="Logo Elima" width={36} height={36} className="rounded-full" />
              <div>
                <p className="text-sm font-bold text-[var(--accent)]">Espace Élève</p>
                <p className="text-xs text-slate-600">{profile.fullName} • {profile.className}</p>
              </div>
            </div>
            <Nav studentId={profile.id} />
          </div>
        </aside>

        {/* Mobile top bar + drawer */}
        <div className="md:hidden">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile.fullName}</p>
              <p className="truncate text-xs text-slate-600">{profile.className}</p>
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
            <button
              aria-label="Fermer"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/30"
            />
            <div className="absolute left-4 top-4 bottom-4 w-[86vw] max-w-[340px]">
              <div className="h-full rounded-3xl border border-slate-200/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-3">
                  <Image src="/logo_e-lima.png" alt="Logo Elima" width={36} height={36} className="rounded-full" />
                  <div>
                    <p className="text-sm font-bold text-[var(--accent)]">Espace Élève</p>
                    <p className="text-xs text-slate-600">{profile.fullName} • {profile.className}</p>
                  </div>
                </div>
                <div onClick={() => setDrawerOpen(false)}>
                  <Nav studentId={profile.id} />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
