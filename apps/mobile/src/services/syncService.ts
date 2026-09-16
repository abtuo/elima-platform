import { isOnline } from "./networkStatusService";
import { getAllActions, markActionError, markActionSynced, removeActions, type OfflineAction } from "./offlineQueueService";
import { mainDbClient } from "./mainDbClient";
import { isDemoModeActive } from "./env";

export type SyncResult = {
  synced: number;
  errors: number;
  discarded: number;
  skipped: boolean;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorMessage(reason: unknown) {
  if (reason && typeof reason === "object" && "message" in reason) return String(reason.message);
  return reason instanceof Error ? reason.message : "Synchronisation impossible pour le moment.";
}

function validAttendanceAction(action: OfflineAction) {
  return typeof action.payload.student_id === "string" && UUID_PATTERN.test(action.payload.student_id)
    && typeof action.payload.class_id === "string" && UUID_PATTERN.test(action.payload.class_id)
    && typeof action.payload.date === "string"
    && ["PRESENT", "ABSENT", "LATE"].includes(String(action.payload.status));
}

export async function syncPendingActions(): Promise<SyncResult> {
  if (!isOnline()) return { synced: 0, errors: 0, discarded: 0, skipped: true };

  const actions = getAllActions().filter((action) => action.status === "pending" || action.status === "error");
  if (!actions.length) return { synced: 0, errors: 0, discarded: 0, skipped: false };
  if (!mainDbClient || isDemoModeActive()) {
    actions.forEach((action) => markActionSynced(action.id));
    return { synced: actions.length, errors: 0, discarded: 0, skipped: false };
  }

  let synced = 0;
  let errors = 0;
  let discarded = 0;
  const attendance = actions.filter((action) => action.type === "attendance");
  const stale = attendance.filter((action) => !validAttendanceAction(action));
  if (stale.length) {
    removeActions(stale.map((action) => action.id));
    discarded += stale.length;
  }

  const validAttendance = attendance.filter(validAttendanceAction);
  if (validAttendance.length) {
    const records = validAttendance.map((action) => {
      const { student_name: _studentName, ...record } = action.payload;
      return record;
    });
    const { error } = await mainDbClient.rpc("mobile_sync_teacher_attendance", { p_records: records });
    if (error) {
      const message = error.code === "PGRST202" || /schema cache|function.*not found/i.test(error.message)
        ? "Migration de synchronisation manquante sur Supabase."
        : error.message;
      validAttendance.forEach((action) => markActionError(action.id, message));
      errors += validAttendance.length;
    } else {
      validAttendance.forEach((action) => markActionSynced(action.id));
      synced += validAttendance.length;
    }
  }

  for (const action of actions.filter((item) => item.type !== "attendance")) {
    const message = `Le type d'action « ${action.type} » n'est pas encore synchronisable.`;
    markActionError(action.id, message);
    errors += 1;
  }

  return { synced, errors, discarded, skipped: false };
}

export function getSyncSummary() {
  const unsynced = getAllActions().filter((action) => action.status === "pending" || action.status === "error");
  return { pendingCount: unsynced.length, online: isOnline() };
}

export { errorMessage };
