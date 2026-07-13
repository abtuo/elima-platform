import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { getMessages } from "@/services/messageService";

export function MessageShortcut({ compact = false }: { compact?: boolean }) {
  const { activeSpace } = useAuth();
  const [unread, setUnread] = useState(0);
  useEffect(() => { const refresh = () => { getMessages().then((messages) => setUnread(messages.filter((message) => !message.read).length)); }; refresh(); window.addEventListener("elima:messages-read", refresh); return () => window.removeEventListener("elima:messages-read", refresh); }, [activeSpace]);
  return <Link to={`/${activeSpace}/messages`} aria-label={unread ? `${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}` : "Ouvrir la messagerie"} className={compact ? "relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-600" : "relative flex items-center gap-3 rounded-2xl bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-600"}><Mail className="h-5 w-5" />{compact ? null : <span>Messagerie</span>}{unread ? <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span> : null}</Link>;
}
