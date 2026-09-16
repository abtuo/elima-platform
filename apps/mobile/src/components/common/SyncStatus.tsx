import { RefreshCw, Cloud, CloudOff } from "lucide-react";
import { getSyncSummary } from "@/services/syncService";
import { cn } from "@/lib/utils";

export function SyncStatus({ className }: { className?: string }) {
  const { pendingCount, online } = getSyncSummary();

  return (
    <div className={cn("card flex items-center gap-3 p-4", className)}>
      {online ? <Cloud className="h-5 w-5 text-primary" /> : <CloudOff className="h-5 w-5 text-amber-500" />}
      <div className="flex-1">
        <p className="text-sm font-semibold text-accent">
          {online ? "En ligne" : "Hors ligne"}
        </p>
        <p className="text-xs text-gray-500">
          {pendingCount > 0
            ? `${pendingCount} action${pendingCount > 1 ? "s" : ""} en attente`
            : "Tout est à jour"}
        </p>
      </div>
      {pendingCount > 0 ? <RefreshCw className="h-4 w-4 text-primary" /> : null}
    </div>
  );
}
