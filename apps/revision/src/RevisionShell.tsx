import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, Home, LogOut, User } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { ElimaLogo } from "@/components/common/ElimaLogo";
import { useAuth } from "@/features/auth/AuthProvider";

const items = [
  { href: "/student", label: "Accueil", icon: Home },
  { href: "/student/reviser", label: "Réviser", icon: BookOpen },
  { href: "/student/profil", label: "Profil", icon: User },
] as const;

export function RevisionShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  async function handleSignOut() {
    await signOut();
    navigate("/auth/login", { replace: true });
  }

  function isItemActive(href: string) {
    return href === "/student" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <OfflineBanner />
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white/90 px-4 pb-2.5 pt-[max(.625rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
        <ElimaLogo className="w-24" />
        <div className="flex min-w-0 items-center gap-2">
          <p className="max-w-36 truncate text-xs font-semibold text-accent">{profile.fullName}</p>
          <button type="button" onClick={handleSignOut} className="tap flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-500" aria-label="Se déconnecter"><LogOut className="h-4 w-4" /></button>
        </div>
      </header>
      <main className="mx-auto max-w-screen-2xl lg:pl-64"><div className={`page-enter ${visible ? "page-enter-visible" : ""}`}>{children}</div></main>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden" aria-label="Navigation Révision">
        <ul className="mx-auto flex max-w-sm gap-2">{items.map(({ href, label, icon: Icon }) => <li key={href} className="min-w-0 flex-1"><NavLink to={href} end={href === "/student"} className={() => `tap flex flex-col items-center rounded-2xl px-2 py-2 text-[11px] font-semibold ${isItemActive(href) ? "bg-revision text-white" : "text-gray-500"}`}><Icon className="mb-1 h-4 w-4" />{label}</NavLink></li>)}</ul>
      </nav>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-gray-200 bg-white p-5 lg:flex lg:flex-col">
        <ElimaLogo className="mb-8 w-28" />
        <nav className="space-y-2" aria-label="Navigation Révision">{items.map(({ href, label, icon: Icon }) => <NavLink key={href} to={href} end={href === "/student"} className={() => `tap flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${isItemActive(href) ? "bg-revision text-white" : "text-gray-600 hover:bg-gray-50"}`}><Icon className="h-5 w-5" />{label}</NavLink>)}</nav>
        <div className="mt-auto border-t border-gray-100 pt-4"><p className="truncate px-3 text-sm font-semibold text-accent">{profile.fullName}</p><p className="truncate px-3 text-xs text-gray-500">{profile.className || profile.schoolLevelId || "Niveau non renseigné"}</p><button type="button" onClick={handleSignOut} className="tap mt-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"><LogOut className="h-5 w-5" />Se déconnecter</button></div>
      </aside>
    </div>
  );
}
