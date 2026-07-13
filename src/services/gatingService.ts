import type { SchoolPlan } from "../types/roles";

export type PlanFeature =
  | "parent_student_portal"
  | "messaging"
  | "timetable"
  | "reports"
  | "finance"
  | "parent_payments"
  | "store"
  | "kpis"
  | "revision"
  | "ocr"
  | "teacher_offline"
  | "whatsapp_reminders";

const minPlan: Record<PlanFeature, SchoolPlan> = {
  parent_student_portal: "basic",
  messaging: "basic",
  timetable: "basic",
  reports: "basic",
  revision: "basic",
  teacher_offline: "basic",
  finance: "premium",
  parent_payments: "premium",
  store: "premium",
  kpis: "premium",
  whatsapp_reminders: "premium",
  ocr: "custom",
};

const rank: SchoolPlan[] = ["basic", "premium", "custom"];

export function hasFeature(plan: SchoolPlan, feature: PlanFeature) {
  return rank.indexOf(plan) >= rank.indexOf(minPlan[feature]);
}

export function getPlanLabel(plan: SchoolPlan) {
  const labels: Record<SchoolPlan, string> = {
    basic: "Basic",
    premium: "Premium",
    custom: "Sur mesure",
  };
  return labels[plan];
}
