export type ConversationCategory = "notification" | "conversation";

export type ConversationTypeStyle = {
  label: string;
  badgeClass: string;
  dotClass: string;
};

const STYLES: Record<string, ConversationTypeStyle> = {
  absence_notification: {
    label: "Absence",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    dotClass: "bg-orange-500",
  },
  grade_notification: {
    label: "Note",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  payment_reminder: {
    label: "Paiement",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
    dotClass: "bg-amber-500",
  },
  store_order: {
    label: "Store",
    badgeClass: "bg-violet-100 text-violet-800 border-violet-200",
    dotClass: "bg-violet-500",
  },
  class_announcement: {
    label: "Annonce",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
    dotClass: "bg-sky-500",
  },
  schedule_update: {
    label: "Emploi du temps",
    badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-200",
    dotClass: "bg-cyan-500",
  },
  supply_list_review: {
    label: "Fournitures",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
    dotClass: "bg-indigo-500",
  },
  teacher_student: {
    label: "Message",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
    dotClass: "bg-teal-500",
  },
  parent_teacher: {
    label: "Enseignant",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
    dotClass: "bg-teal-500",
  },
  parent_admin: {
    label: "Administration",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-500",
  },
};

const DEFAULT_STYLE: ConversationTypeStyle = {
  label: "Message",
  badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  dotClass: "bg-slate-400",
};

export function conversationTypeStyle(type: string): ConversationTypeStyle {
  return STYLES[type] ?? DEFAULT_STYLE;
}

export function conversationTypeLabel(type: string): string {
  return conversationTypeStyle(type).label;
}

/** Threads where participants can send replies (justification, questions, etc.). */
export const REPLYABLE_CONVERSATION_TYPES = new Set([
  "absence_notification",
  "payment_reminder",
  "store_order",
  "grade_notification",
  "parent_admin",
  "parent_teacher",
]);

export function canReplyToConversation(type: string) {
  return REPLYABLE_CONVERSATION_TYPES.has(type);
}

/** Automated alerts (absence, note, paiement, store…) vs human exchanges. */
export function conversationCategory(type: string): ConversationCategory {
  if (
    type.includes("notification") ||
    type.includes("reminder") ||
    type === "store_order" ||
    type === "class_announcement" ||
    type === "schedule_update" ||
    type === "supply_list_review"
  ) {
    return "notification";
  }
  return "conversation";
}
