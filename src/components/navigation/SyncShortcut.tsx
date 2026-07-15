import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { getAllActions, getPendingActions } from "@/services/offlineQueueService";
import { isOnline, subscribeNetworkStatus } from "@/services/networkStatusService";
import { syncPendingActions } from "@/services/syncService";

export function SyncShortcut({ compact = false }: { compact?: boolean }) {
  const [online, setOnline] = useState(isOnline());
  const [pending, setPending] = useState(() => getPendingActions().length);
  const [errors, setErrors] = useState(() => getAllActions().filter((action) => action.status === "error").length);
  const [syncing, setSyncing] = useState(false);
  useEffect(() => { const refresh = () => { setPending(getPendingActions().length); setErrors(getAllActions().filter((action) => action.status === "error").length); }; const unsubscribe = subscribeNetworkStatus(setOnline); window.addEventListener("elima:sync-queue-updated", refresh); window.addEventListener("storage", refresh); return () => { unsubscribe(); window.removeEventListener("elima:sync-queue-updated", refresh); window.removeEventListener("storage", refresh); }; }, []);
  useEffect(() => {
    if (!online || !pending || syncing) return;
    setSyncing(true);
    syncPendingActions().finally(() => setSyncing(false));
  }, [online, pending, syncing]);
  const synced = online && pending === 0 && errors === 0 && !syncing;
  const Icon = !online ? CloudOff : errors ? TriangleAlert : syncing || pending ? RefreshCw : Cloud;
  const label = !online ? "Hors ligne" : errors ? `${errors} erreur${errors > 1 ? "s" : ""} de synchronisation` : syncing || pending ? "Synchronisation…" : "Synchronisé";
  const alertCount = errors || pending;
  return <Link to="/teacher/sync" aria-label={label} title={label} className={compact ? `relative flex h-10 w-10 items-center justify-center rounded-2xl ${synced ? "bg-emerald-50 text-emerald-600" : !online ? "bg-gray-100 text-gray-500" : "bg-amber-50 text-amber-700"}` : `relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold ${synced ? "bg-emerald-50 text-emerald-700" : !online ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-700"}`}><Icon className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />{compact ? null : <span>{label}</span>}{alertCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">{alertCount > 99 ? "99+" : alertCount}</span> : null}</Link>;
}
