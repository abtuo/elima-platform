const QUEUE_KEY = "elima-teacher-offline-queue";

export type OfflineAction = {
  id: string;
  type: "attendance" | "grade_draft" | "remark";
  payload: Record<string, unknown>;
  createdAt: string;
  status: "pending" | "synced" | "error";
  errorMessage?: string;
};

function readQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (raw) return JSON.parse(raw) as OfflineAction[];
  } catch { /* ignore */ }
  return [];
}

function writeQueue(queue: OfflineAction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("elima:sync-queue-updated"));
}

export function getPendingActions(): OfflineAction[] {
  return readQueue().filter((a) => a.status === "pending");
}

export function getAllActions(): OfflineAction[] {
  return readQueue();
}

export function enqueueAction(type: OfflineAction["type"], payload: Record<string, unknown>) {
  const queue = readQueue();
  queue.unshift({
    id: `action-${Date.now()}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
    status: "pending",
  });
  writeQueue(queue);
}

export function markActionSynced(id: string) {
  const queue = readQueue().map((a) => (a.id === id ? { ...a, status: "synced" as const } : a));
  writeQueue(queue);
}

export function markActionError(id: string, errorMessage: string) {
  const queue = readQueue().map((a) =>
    a.id === id ? { ...a, status: "error" as const, errorMessage } : a
  );
  writeQueue(queue);
}

export function clearSyncedActions() {
  writeQueue(readQueue().filter((a) => a.status !== "synced"));
}
