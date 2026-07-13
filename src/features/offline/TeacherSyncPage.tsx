import { useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { SyncStatus } from "@/components/common/SyncStatus";
import { ElimaCard } from "@/components/common/ElimaCard";
import { getAllActions } from "@/services/offlineQueueService";
import { syncPendingActions } from "@/services/syncService";
import { RefreshCw } from "lucide-react";

export function TeacherSyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState("");
  const actions = getAllActions();

  async function handleSync() {
    setSyncing(true);
    const res = await syncPendingActions();
    if (res.skipped) setResult("Connexion requise pour synchroniser.");
    else if (res.synced > 0) setResult(`${res.synced} action${res.synced > 1 ? "s" : ""} synchronisée${res.synced > 1 ? "s" : ""}.`);
    else setResult("Tout est à jour.");
    if (res.errors > 0) setResult((prev) => `${prev} ${res.errors} erreur${res.errors > 1 ? "s" : ""}.`);
    setSyncing(false);
  }

  return (
    <PageContainer>
      <AppHeader title="Synchronisation" subtitle="Actions hors ligne" />
      <SyncStatus className="mb-5" />
      <button type="button" onClick={handleSync} disabled={syncing} className="tap mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60">
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Synchronisation..." : "Synchroniser maintenant"}
      </button>
      {result ? <p className="mb-5 text-center text-sm text-gray-600">{result}</p> : null}
      <section className="space-y-3">
        <h2 className="font-title text-lg font-semibold text-accent">File d'actions</h2>
        {actions.length ? actions.map((a) => (
          <ElimaCard key={a.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-accent capitalize">{a.type.replace("_", " ")}</p>
                <p className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString("fr-FR")}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                a.status === "pending" ? "bg-amber-50 text-amber-700" :
                a.status === "synced" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {a.status === "pending" ? "En attente" : a.status === "synced" ? "Synchronisé" : "Erreur"}
              </span>
            </div>
          </ElimaCard>
        )) : (
          <p className="text-center text-sm text-gray-500">Aucune action en attente.</p>
        )}
      </section>
    </PageContainer>
  );
}
