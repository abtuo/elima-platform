import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MessageCircleMore,
  Settings as SettingsIcon,
  FileBarChart2,
} from "lucide-react";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

const nav = [
  { href: "/parent/overview", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/parent/grades", label: "Notes", icon: FileText },
  { href: "/parent/attendance", label: "Présences", icon: ClipboardCheck },
  { href: "/parent/reports", label: "Bulletins", icon: FileBarChart2 },
  { href: "/parent/timetable", label: "Emploi du temps", icon: CalendarDays },
  { href: "/parent/messages", label: "Messages", icon: MessageCircleMore },
  { href: "/parent/settings", label: "Paramètres", icon: SettingsIcon },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
          <div className="elima-card">
            <h1 className="text-2xl font-bold text-[var(--accent)]">Configuration Supabase requise</h1>
            <p className="mt-2 text-sm text-slate-600">
              Ajoute <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> et <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> dans
              <span className="font-mono"> .env.local</span> (voir <span className="font-mono">.env.local.example</span>), puis relance le serveur.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login/phone-password?redirect=/parent");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:grid-cols-[260px_1fr] md:px-8 md:py-10">
        <aside className="sticky top-6 h-fit rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <Image src="/logo_e-lima.png" alt="Logo Elima" width={36} height={36} className="rounded-full" />
            <div>
              <p className="text-sm font-bold text-[var(--accent)]">Espace Parent</p>
              <p className="text-xs text-slate-600">{data.user.phone ?? data.user.id}</p>
            </div>
          </div>

          <nav className="mt-4 space-y-1">
            {nav.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <it.icon size={18} className="text-[var(--primary)]" />
                {it.label}
              </Link>
            ))}
          </nav>

          <form className="mt-4" action="/api/auth/logout" method="POST">
            <button className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
              Se déconnecter
            </button>
          </form>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
