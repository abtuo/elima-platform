import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";
import {
  hasFeature,
  normalizePlan,
  requiredPlanLabel,
  resolveEffectivePlan,
  type PlanFeature,
  type SchoolPlan,
} from "@/lib/plans";

export type SchoolPlanContext = {
  schoolId: string;
  plan: SchoolPlan;
  isDemo: boolean;
  effectivePlan: SchoolPlan;
};

export class PlanFeatureError extends Error {
  readonly status = 403;
  readonly feature: PlanFeature;
  readonly requiredLabel: string;

  constructor(feature: PlanFeature) {
    super(`Cette fonctionnalité fait partie de l'offre ${requiredPlanLabel(feature)}.`);
    this.feature = feature;
    this.requiredLabel = requiredPlanLabel(feature);
  }
}

export async function getSchoolPlanContext(schoolId: string): Promise<SchoolPlanContext | null> {
  const admin = await createSupabaseAdminServerClient();
  const { data } = await admin
    .from("schools")
    .select("id, plan, is_demo")
    .eq("id", schoolId)
    .maybeSingle();

  if (!data) return null;

  const plan = normalizePlan((data as { plan?: string | null }).plan);
  const isDemo = Boolean((data as { is_demo?: boolean }).is_demo);
  return {
    schoolId: String((data as { id: string }).id),
    plan,
    isDemo,
    effectivePlan: resolveEffectivePlan(plan, isDemo),
  };
}

export function assertPlanFeature(ctx: SchoolPlanContext, feature: PlanFeature, actorRole?: AppRole | null) {
  if (actorRole === "SUPER_ADMIN") return;
  if (!hasFeature(ctx.effectivePlan, feature)) {
    throw new PlanFeatureError(feature);
  }
}

export async function assertSchoolFeature(
  schoolId: string,
  feature: PlanFeature,
  actorRole?: AppRole | null,
) {
  const ctx = await getSchoolPlanContext(schoolId);
  if (!ctx) {
    throw new Error("École introuvable");
  }
  assertPlanFeature(ctx, feature, actorRole);
  return ctx;
}

export function planFeatureErrorResponse(err: unknown) {
  if (err instanceof PlanFeatureError) {
    return NextResponse.json({ message: err.message, requiredPlan: err.requiredLabel }, { status: err.status });
  }
  if (err instanceof Error && err.message === "École introuvable") {
    return NextResponse.json({ message: err.message }, { status: 404 });
  }
  return null;
}

/** Returns a 403/404 response when the school plan does not include the feature, otherwise null. */
export async function checkSchoolFeature(
  schoolId: string,
  feature: PlanFeature,
  actorRole?: AppRole | null,
) {
  try {
    await assertSchoolFeature(schoolId, feature, actorRole);
    return null;
  } catch (err) {
    return planFeatureErrorResponse(err);
  }
}
