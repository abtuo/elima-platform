export type SchoolPlan = "basic" | "premium" | "custom";

export type PlanFeature =
  | "core_admin"
  | "core_pedagogy"
  | "reports"
  | "timetable"
  | "messaging"
  | "parent_student_portal"
  | "cockpit"
  | "online_enrollment"
  | "finance"
  | "comptable"
  | "store"
  | "parent_payments"
  | "kpis"
  | "whatsapp_reminders"
  | "ai_import"
  | "ocr"
  | "admin_assistant"
  | "advanced_reporting"
  | "multi_school";

export const PLAN_ORDER: SchoolPlan[] = ["basic", "premium", "custom"];

const FEATURE_MIN_PLAN: Record<PlanFeature, SchoolPlan> = {
  core_admin: "basic",
  core_pedagogy: "basic",
  reports: "basic",
  timetable: "basic",
  messaging: "basic",
  parent_student_portal: "basic",
  cockpit: "basic",
  online_enrollment: "premium",
  finance: "premium",
  comptable: "premium",
  store: "premium",
  parent_payments: "premium",
  kpis: "premium",
  whatsapp_reminders: "premium",
  ai_import: "custom",
  ocr: "custom",
  admin_assistant: "custom",
  advanced_reporting: "custom",
  multi_school: "custom",
};

const PLAN_LABELS: Record<SchoolPlan, string> = {
  basic: "Basic",
  premium: "Premium",
  custom: "Sur mesure",
};

export function normalizePlan(raw: string | null | undefined): SchoolPlan {
  if (raw === "premium" || raw === "custom") return raw;
  return "basic";
}

export function planRank(plan: SchoolPlan) {
  return PLAN_ORDER.indexOf(plan);
}

export function hasFeature(plan: SchoolPlan, feature: PlanFeature) {
  return planRank(plan) >= planRank(FEATURE_MIN_PLAN[feature]);
}

export function requiredPlan(feature: PlanFeature): SchoolPlan {
  return FEATURE_MIN_PLAN[feature];
}

export function requiredPlanLabel(feature: PlanFeature) {
  return PLAN_LABELS[requiredPlan(feature)];
}

export function resolveEffectivePlan(plan: SchoolPlan, isDemo: boolean): SchoolPlan {
  return isDemo ? "custom" : plan;
}

/** Dashboard sidebar / page paths gated by plan feature. */
export const PLAN_NAV_GATES: Record<string, PlanFeature> = {
  "/dashboard/kpis": "kpis",
  "/dashboard/finance": "finance",
  "/dashboard/supplies": "store",
};

/** Parent portal tabs gated by plan feature. */
export const PARENT_NAV_GATES: Record<string, PlanFeature> = {
  "/parent/pay": "parent_payments",
  "/parent/store": "store",
  "/parent/invoices": "parent_payments",
};

export function isNavItemLocked(effectivePlan: SchoolPlan, href: string) {
  const feature = PLAN_NAV_GATES[href] ?? PARENT_NAV_GATES[href];
  if (!feature) return false;
  return !hasFeature(effectivePlan, feature);
}
