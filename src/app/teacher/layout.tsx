import Image from "next/image";
import Link from "next/link";
import { GraduationCap, CalendarDays, ClipboardCheck, FileText, ListTodo, BarChart3 } from "lucide-react";

const nav = [
  { href: "/teacher", label: "Accueil", icon: GraduationCap },
  { href: "/teacher/timetable", label: "Emploi du temps", icon: CalendarDays },
  { href: "/teacher/grades", label: "Saisie de notes", icon: FileText },
  { href: "/teacher/averages", label: "Moyennes", icon: BarChart3 },
  { href: "/teacher/attendance", label: "Présences", icon: ClipboardCheck },
  { href: "/teacher/memo", label: "Todo / Mémo", icon: ListTodo },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:grid-cols-[260px_1fr] md:px-8 md:py-10">
        <aside className="sticky top-6 h-fit rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <Image src="/logo_elima.png" alt="Logo Elima" width={36} height={36} className="rounded-lg" />
            <div>
              <p className="text-sm font-bold text-[var(--accent)]">Espace Enseignant</p>
              <p className="text-xs text-slate-600">M. Traoré</p>
            </div>
          </div>

          <nav className="mt-4 space-y-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <item.icon size={18} className="text-[var(--primary)]" />
                {item.label}
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
