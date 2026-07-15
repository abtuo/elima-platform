import clsx from "clsx";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Users, MessageSquare, CreditCard, User,
  ClipboardList, BookOpen, ScanLine, Calendar,
  GraduationCap, FolderOpen, RefreshCw, Bell, LayoutDashboard,
  LogOut, PackageOpen,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { getNavItems } from "@/constants/navigation";
import type { MobileSpace } from "@/types/roles";
import { MessageShortcut } from "@/components/navigation/MessageShortcut";
import { AlertShortcut } from "@/components/navigation/AlertShortcut";
import { SyncShortcut } from "@/components/navigation/SyncShortcut";
import { isStandaloneStudent } from "@/types/roles";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  children: Users,
  messages: MessageSquare,
  payments: CreditCard,
  profile: User,
  assignments: ClipboardList,
  revision: BookOpen,
  scanner: ScanLine,
  documents: FolderOpen,
  supplies: PackageOpen,
  today: Calendar,
  timetable: Calendar,
  classes: GraduationCap,
  resources: FolderOpen,
  sync: RefreshCw,
  dashboard: LayoutDashboard,
  students: Users,
  alerts: Bell,
};

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { activeSpace, profile, signOut } = useAuth();
  const items = getNavItems(activeSpace as MobileSpace, profile);

  async function handleSignOut() {
    await signOut();
    navigate("/auth/login", { replace: true });
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-2 lg:hidden">
        <ul className="mx-auto flex max-w-lg justify-around gap-1">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== `/${activeSpace}` && pathname.startsWith(item.href));
          const Icon = iconMap[item.id] ?? Home;
          return (
            <li key={item.href} className="min-w-20 flex-1">
              <NavLink
                to={item.href}
                className={clsx(
                  "tap flex flex-col items-center rounded-2xl px-1 py-2 text-[11px] font-semibold",
                  active ? "bg-primary text-white" : "text-gray-500"
                )}
              >
                <span className={clsx("mb-0.5 flex h-7 w-7 items-center justify-center rounded-xl", active ? "bg-white/20" : "bg-gray-100")}>
                  <Icon className="h-4 w-4" />
                </span>
                <span>{item.mobileLabel}</span>
              </NavLink>
            </li>
          );
        })}
        </ul>
      </nav>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-gray-200 bg-white p-5 lg:flex lg:flex-col">
        <div className="mb-8 px-3">
          {profile.schoolLogoUrl ? <img src={profile.schoolLogoUrl} alt={profile.schoolName ?? "Logo de l’établissement"} className="h-12 w-12 rounded-2xl border border-gray-100 bg-white object-contain p-1" /> : <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white" aria-label={profile.schoolName ?? "Établissement"}>{profile.schoolName?.charAt(0) ?? "E"}</span>}
        </div>
        <div className="mb-4 space-y-2 px-3">{!isStandaloneStudent(profile) ? <><MessageShortcut /><AlertShortcut /></> : null}{profile.role === "TEACHER" ? <SyncShortcut /> : null}</div>
        <nav className="space-y-2">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== `/${activeSpace}` && pathname.startsWith(item.href));
            const Icon = iconMap[item.id] ?? Home;
            return (
              <NavLink key={item.href} to={item.href} className={clsx("tap flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold", active ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50")}>
                <Icon className="h-5 w-5" /> {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-gray-100 pt-4">
          <p className="truncate px-3 text-sm font-semibold text-accent">{profile.fullName}</p>
          <p className="truncate px-3 text-xs text-gray-500">{profile.email}</p>
          <button type="button" onClick={handleSignOut} className="tap mt-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            <LogOut className="h-5 w-5" /> Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
}
