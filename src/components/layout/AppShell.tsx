import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/navigation/BottomNav";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { ElimaLogo } from "@/components/common/ElimaLogo";
import { LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { MessageShortcut } from "@/components/navigation/MessageShortcut";
import { SyncShortcut } from "@/components/navigation/SyncShortcut";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">{profile.schoolLogoUrl ? <img src={profile.schoolLogoUrl} alt="" className="h-9 w-9 rounded-xl bg-white object-contain" /> : <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">{profile.schoolName?.charAt(0) ?? "E"}</span>}<div className="min-w-0"><p className="max-w-44 truncate text-xs font-semibold text-accent">{profile.schoolName ?? "Elima"}</p><div className="flex items-center gap-1 text-[9px] text-gray-400">Propulsé par <ElimaLogo className="w-9" /></div></div></div>
        <div className="flex items-center gap-2">
          <div className="hidden text-right min-[380px]:block"><p className="max-w-36 truncate text-xs font-semibold text-accent">{profile.fullName}</p><p className="text-[10px] text-gray-400">{profile.schoolName}</p></div>
          <MessageShortcut compact />
          {profile.role === "TEACHER" ? <SyncShortcut compact /> : null}
          <button type="button" onClick={async () => { await signOut(); navigate("/auth/login", { replace: true }); }} className="tap flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-500" aria-label="Se déconnecter"><LogOut className="h-4 w-4" /></button>
        </div>
      </header>
      <main className="mx-auto max-w-screen-2xl lg:pl-72">
        <div className={`page-enter ${visible ? "page-enter-visible" : ""}`}>{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
