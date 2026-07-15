import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { getAlerts } from "@/services/messageService";

export function AlertShortcut({ compact = false }: { compact?: boolean }) {
  const { activeSpace } = useAuth();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const refresh = () => { getAlerts().then((alerts) => setUnread(alerts.filter((alert) => !alert.read).length)); };
    refresh();
    window.addEventListener("elima:communications-changed", refresh);
    window.addEventListener("elima:messages-read", refresh);
    return () => { window.removeEventListener("elima:communications-changed", refresh); window.removeEventListener("elima:messages-read", refresh); };
  }, [activeSpace]);
  return <Link to={`/${activeSpace}/alertes`} aria-label={unread ? `${unread} alerte${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}` : "Ouvrir les alertes"} className={compact ? "relative flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600" : "relative flex items-center gap-3 rounded-2xl bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700"}><Bell className="h-5 w-5" />{compact ? null : <span>Alertes</span>}{unread ? <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span> : null}</Link>;
}
