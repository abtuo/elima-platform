import { useEffect, useState } from "react";
import { Cloud, CloudOff } from "lucide-react";
import { Link } from "react-router-dom";
import { getPendingActions } from "@/services/offlineQueueService";
import { isOnline, subscribeNetworkStatus } from "@/services/networkStatusService";

export function SyncShortcut({ compact = false }: { compact?: boolean }) {
  const [online, setOnline] = useState(isOnline());
  const [pending, setPending] = useState(() => getPendingActions().length);
  useEffect(() => { const refresh = () => setPending(getPendingActions().length); const unsubscribe = subscribeNetworkStatus(setOnline); window.addEventListener("elima:sync-queue-updated", refresh); window.addEventListener("storage", refresh); return () => { unsubscribe(); window.removeEventListener("elima:sync-queue-updated", refresh); window.removeEventListener("storage", refresh); }; }, []);
  const synced = online && pending === 0;
  const Icon = synced ? Cloud : CloudOff;
  const label = synced ? "Synchronisé" : !online ? "Hors ligne" : `${pending} en attente`;
  return <Link to="/teacher/sync" aria-label={label} title={label} className={compact ? `relative flex h-10 w-10 items-center justify-center rounded-2xl ${synced ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}` : `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold ${synced ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}><Icon className="h-5 w-5" />{compact ? null : <span>{label}</span>}{!synced && pending > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{pending > 99 ? "99+" : pending}</span> : null}</Link>;
}
