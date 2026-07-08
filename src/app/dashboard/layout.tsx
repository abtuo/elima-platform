"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleMore,
  Settings,
  Users,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { ToastProvider } from "@/components/ui/Toast";
import { DemoModeBanner } from "@/components/ui/DemoModeBanner";
import { MessagerieNavLabel } from "@/components/messaging/MessagerieNavLabel";
import { useMessagingUnreadCount } from "@/hooks/useMessagingUnreadCount";
import { getRoleHomePath } from "@/lib/role-home";
import { resolveAppMode } from "@/lib/app-mode";
import type { AppRole } from "@/lib/types";
import {
  isNavItemLocked,
  PLAN_NAV_GATES,
  requiredPlanLabel,
  type SchoolPlan,
} from "@/lib/plans";

const DASHBOARD_ROLES = new Set<AppRole>(["SUPER_ADMIN", "SCHOOL_ADMIN", "COMPTABLE"]);

const isAppDemoMode =
  resolveAppMode({
    NEXT_PUBLIC_ELIMA_APP_MODE: process.env.NEXT_PUBLIC_ELIMA_APP_MODE,
    NODE_ENV: process.env.NODE_ENV,
  }) === "demo";

function fallbackEffectivePlan(stored?: SchoolPlan): SchoolPlan {
  return stored ?? (isAppDemoMode ? "custom" : "basic");
}

const nav = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/kpis", label: "KPIs", icon: BarChart3 },
  { href: "/dashboard/students", label: "Élèves", icon: BookOpen },
  { href: "/dashboard/teachers", label: "Enseignants", icon: Users },
  { href: "/dashboard/classes", label: "Classes", icon: CalendarDays },
  { href: "/dashboard/attendance", label: "Présences", icon: ClipboardCheck },
  { href: "/dashboard/finance", label: "Finances", icon: Wallet },
  { href: "/dashboard/supplies", label: "Fournitures", icon: ShoppingBag },
  { href: "/dashboard/reports", label: "Bulletins", icon: FileText },
  { href: "/dashboard/messages", label: "Messagerie", icon: MessageCircleMore },
];

type SchoolBrand = {
  name: string;
  logoUrl: string | null;
  effectivePlan: SchoolPlan;
};

const accountantHrefs = new Set(["/dashboard/finance"]);

function Sidebar({
  onNavigate,
  school,
  navItems,
  effectivePlan,
  bypassPlanGating,
}: {
  onNavigate?: () => void;
  school: SchoolBrand | null;
  navItems: typeof nav;
  effectivePlan: SchoolPlan;
  bypassPlanGating?: boolean;
}) {
  const pathname = usePathname();
  const unreadMessages = useMessagingUnreadCount(navItems.some((item) => item.href === "/dashboard/messages"));

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-[#256f47] to-[var(--primary)] p-4 text-white shadow-xl shadow-[var(--primary)]/20">
      <Link href="/" className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-white/10" onClick={onNavigate}>
        <Image src="/logo.png" alt="Logo Elima" width={36} height={36} className="rounded-full bg-white ring-2 ring-white/30" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{school?.name ?? "Espace Administration"}</p>
          <p className="text-xs text-white/70">Pilotage établissement</p>
        </div>
      </Link>

      <nav className="mt-5 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const locked = !bypassPlanGating && isNavItemLocked(effectivePlan, item.href);
          const feature = PLAN_NAV_GATES[item.href];
          const badge = locked && feature ? requiredPlanLabel(feature) : null;

          if (locked) {
            return (
              <Link
                key={item.href}
                href="/contact"
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 transition hover:bg-white/10"
                title={`Offre ${badge}`}
              >
                <item.icon size={18} className="text-white/50" />
                <span className="flex-1">{item.label}</span>
                {badge ? (
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          }

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
              {item.href === "/dashboard/messages" ? (
                <MessagerieNavLabel count={unreadMessages} variant="sidebar-dark" />
              ) : (
                item.label
              )}
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
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [school, setSchool] = useState<SchoolBrand | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { profile?: { role?: AppRole | null } } | null) => {
        if (!active) return;
        setRole(body?.profile?.role ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setRoleChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!roleChecked || !role || DASHBOARD_ROLES.has(role)) return;
    if (role === "TEACHER" && pathname.startsWith("/dashboard/supplies")) {
      router.replace(`/teacher/supplies${window.location.search}`);
      return;
    }
    router.replace(getRoleHomePath(role));
  }, [role, roleChecked, pathname, router]);

  const navItems = role === "COMPTABLE" ? nav.filter((item) => accountantHrefs.has(item.href)) : nav;

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard/school-settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { school?: { name?: string; logo_url?: string | null; effectivePlan?: SchoolPlan } } | null) => {
        if (!active || !body?.school) return;
        setSchool({
          name: String(body.school.name ?? ""),
          logoUrl: body.school.logo_url ?? null,
          effectivePlan: fallbackEffectivePlan(body.school.effectivePlan),
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onBrandingUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; url?: string }>).detail;
      if (detail?.kind === "logo" && detail.url) {
        setSchool((prev) =>
          prev
            ? { ...prev, logoUrl: detail.url! }
            : { name: "", logoUrl: detail.url!, effectivePlan: fallbackEffectivePlan() },
        );
      }
    };
    window.addEventListener("elima:branding-updated", onBrandingUpdated);
    return () => window.removeEventListener("elima:branding-updated", onBrandingUpdated);
  }, []);

  if (roleChecked && role && !DASHBOARD_ROLES.has(role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-sm text-slate-500">Redirection…</p>
      </div>
    );
  }

  const effectivePlan = fallbackEffectivePlan(school?.effectivePlan);
  const bypassPlanGating = role === "SUPER_ADMIN";

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[var(--background)] text-foreground">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 md:grid-cols-[248px_1fr] md:px-6 md:py-8">
          <div className="sticky top-5 hidden h-fit md:block">
            <Sidebar
              school={school}
              navItems={navItems}
              effectivePlan={effectivePlan}
              bypassPlanGating={bypassPlanGating}
            />
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
                <Sidebar
                  school={school}
                  navItems={navItems}
                  effectivePlan={effectivePlan}
                  bypassPlanGating={bypassPlanGating}
                  onNavigate={() => setDrawerOpen(false)}
                />
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
  );
}
