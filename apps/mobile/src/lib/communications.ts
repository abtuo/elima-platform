export type CommunicationKind = "message" | "alert";

export const ALERT_CONVERSATION_TYPES = new Set([
  "absence_notification",
  "grade_notification",
  "payment_reminder",
  "schedule_update",
  "class_announcement",
  "store_order",
]);

export function isAlertConversationType(type?: string | null) {
  return ALERT_CONVERSATION_TYPES.has(String(type ?? ""));
}

export function communicationKind(type?: string | null): CommunicationKind {
  return isAlertConversationType(type) ? "alert" : "message";
}
