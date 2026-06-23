"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleMore,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { ToastProvider } from "@/components/ui/Toast";

const nav = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/kpis", label: "KPIs", icon: BarChart3 },
  { href: "/dashboard/students", label: "Élèves", icon: BookOpen },
  { href: "/dashboard/teachers", label: "Enseignants", icon: Users },
  { href: "/dashboard/classes", label: "Classes", icon: CalendarDays },
  { href: "/dashboard/finance", label: "Finances", icon: Wallet },
  { href: "/dashboard/reports", label: "Bulletins", icon: FileText },
  { href: "/dashboard/messages", label: "Messages", icon: MessageCircleMore },
];

type SchoolBrand = { name: string; logoUrl: string | null };

// Comptable: accès restreint aux finances (espace dédié réutilisant le dashboard).
const accountantHrefs = new Set(["/dashboard/finance"]);

function Sidebar({
  onNavigate,
  school,
  navItems,
}: {
  onNavigate?: () => void;
  school: SchoolBrand | null;
  navItems: typeof nav;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-[#256f47] to-[var(--primary)] p-4 text-white shadow-xl shadow-[var(--primary)]/20">
      <Link href="/" className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-white/10" onClick={onNavigate}>
        {school?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={school.logoUrl}
            alt={`Logo ${school.name}`}
            className="h-9 w-9 rounded-full bg-white object-contain ring-2 ring-white/30"
          />
        ) : (
          <Image src="/logo.png" alt="Logo Elima" width={36} height={36} className="rounded-full bg-white ring-2 ring-white/30" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{school?.name ?? "Espace Administration"}</p>
          <p className="text-xs text-white/70">Pilotage établissement</p>
        </div>
      </Link>

      <nav className="mt-5 space-y-0.5">
        {navItems.map((item) => {
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
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-white/15 pt-4">
        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          className={
            pathname === "/dashboard/settings"
              ? "flex items-center gap-3 rounded-xl bg-white/15 px-3 py-2.5 text-sm font-semibold text-white"
              : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10"
          }
        >
          <Settings size={18} />
          Paramètres
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white/85 transition hover:bg-white/10">
            <LogOut size={18} />
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [school, setSchool] = useState<SchoolBrand | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { profile?: { role?: string | null } } | null) => {
        if (!active) return;
        setRole(body?.profile?.role ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const navItems = role === "COMPTABLE" ? nav.filter((item) => accountantHrefs.has(item.href)) : nav;

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard/school-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { school?: { name?: string; logo_url?: string | null } } | null) => {
        if (!active || !body?.school) return;
        setSchool({ name: String(body.school.name ?? ""), logoUrl: body.school.logo_url ?? null });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Refresh the sidebar logo instantly when the admin uploads a new one.
  useEffect(() => {
    const onBrandingUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; url?: string }>).detail;
      if (detail?.kind === "logo" && detail.url) {
        setSchool((prev) => (prev ? { ...prev, logoUrl: detail.url! } : { name: "", logoUrl: detail.url! }));
      }
    };
    window.addEventListener("elima:branding-updated", onBrandingUpdated);
    return () => window.removeEventListener("elima:branding-updated", onBrandingUpdated);
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[var(--background)] text-foreground">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 md:grid-cols-[248px_1fr] md:px-6 md:py-8">
          <div className="sticky top-5 hidden h-fit md:block">
            <Sidebar school={school} navItems={navItems} />
          </div>

          <div className="md:hidden">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                {school?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={school.logoUrl} alt={`Logo ${school.name}`} className="h-6 w-6 rounded-full object-contain" />
                ) : (
                  <LayoutDashboard size={18} className="text-[var(--primary)]" />
                )}
                <p className="truncate text-sm font-semibold">{school?.name ?? "Administration"}</p>
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
              <button aria-label="Fermer" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/40" />
              <div className="absolute left-3 top-3 bottom-3 w-[88vw] max-w-[320px]">
                <Sidebar school={school} navItems={navItems} onNavigate={() => setDrawerOpen(false)} />
              </div>
            </div>
          ) : null}

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
