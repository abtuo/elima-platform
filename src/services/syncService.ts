import { isOnline } from "./networkStatusService";
import { getPendingActions, markActionSynced, markActionError } from "./offlineQueueService";
import { mainDbClient } from "./mainDbClient";

export type SyncResult = {
  synced: number;
  errors: number;
  skipped: boolean;
};

export async function syncPendingActions(): Promise<SyncResult> {
  if (!isOnline()) return { synced: 0, errors: 0, skipped: true };

  const pending = getPendingActions();
  if (!pending.length) return { synced: 0, errors: 0, skipped: false };

  let synced = 0;
  let errors = 0;

  for (const action of pending) {
    if (!mainDbClient) {
      markActionSynced(action.id);
      synced++;
      continue;
    }

    try {
      if (action.type === "attendance") {
        const { error } = await mainDbClient.from("attendance").upsert(action.payload);
        if (error) throw error;
      }
      markActionSynced(action.id);
      synced++;
    } catch {
      markActionError(action.id, "Synchronisation impossible pour le moment.");
      errors++;
    }
  }

  return { synced, errors, skipped: false };
}

export function getSyncSummary() {
  const pending = getPendingActions();
  return {
    pendingCount: pending.length,
    online: isOnline(),
  };
}
