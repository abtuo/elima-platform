import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { getSchoolPlanContext } from "@/lib/plans-server";
import { hasFeature, requiredPlanLabel, type PlanFeature } from "@/lib/plans";
import type { AppRole } from "@/lib/types";
import { PlanUpgradeCard } from "@/components/ui/PlanUpgradeCard";

async function resolveActorSchool() {
  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user?.id) return null;

  const { data: userRow } = await admin
    .from("users")
    .select("school_id, role")
    .eq("id", authData.user.id)
    .maybeSingle();

  const schoolId = (userRow as { school_id?: string | null } | null)?.school_id;
  if (!schoolId) return null;

  return {
    schoolId: String(schoolId),
    role: (userRow as { role?: AppRole } | null)?.role ?? null,
  };
}

export async function DashboardPlanGate({
  feature,
  children,
}: {
  feature: PlanFeature;
  children: React.ReactNode;
}) {
  const actor = await resolveActorSchool();
  if (!actor) return <PlanUpgradeCard requiredPlan={requiredPlanLabel(feature)} />;

  if (actor.role === "SUPER_ADMIN") return children;

  const planCtx = await getSchoolPlanContext(actor.schoolId);
  if (!planCtx || !hasFeature(planCtx.effectivePlan, feature)) {
    return <PlanUpgradeCard requiredPlan={requiredPlanLabel(feature)} />;
  }

  return children;
}

export async function PortalPlanGate({
  schoolId,
  feature,
  children,
}: {
  schoolId: string | null;
  feature: PlanFeature;
  children: React.ReactNode;
}) {
  if (!schoolId) return <PlanUpgradeCard requiredPlan={requiredPlanLabel(feature)} />;

  const planCtx = await getSchoolPlanContext(schoolId);
  if (!planCtx || !hasFeature(planCtx.effectivePlan, feature)) {
    return <PlanUpgradeCard requiredPlan={requiredPlanLabel(feature)} />;
  }

  return children;
}
