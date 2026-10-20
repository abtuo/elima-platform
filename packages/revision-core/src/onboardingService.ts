import type { SupabaseClient } from "@supabase/supabase-js";
import type { SchoolCycle } from "./educationCatalog.ts";

export type RevisionOnboardingInput = {
  cycle: SchoolCycle;
  schoolLevelId: string;
  subjectIds: string[];
  guardianAcknowledged: boolean;
  declaredSchoolName?: string;
  declaredSchoolCity?: string;
};

export function createRevisionOnboardingService(dependencies: { mainDbClient: SupabaseClient | null }) {
  const { mainDbClient } = dependencies;
  return async function saveRevisionOnboarding(input: RevisionOnboardingInput) {
    if (!mainDbClient) throw new Error("Service indisponible.");
    const { data: auth } = await mainDbClient.auth.getUser();
    if (!auth.user) throw new Error("Session expirée.");
    const { data, error } = await mainDbClient.rpc("save_revision_onboarding", {
      p_cycle: input.cycle,
      p_school_level_id: input.schoolLevelId,
      p_subject_ids: input.subjectIds,
      p_guardian_acknowledged: input.guardianAcknowledged,
      p_declared_school_name: input.declaredSchoolName?.trim() || null,
      p_declared_school_city: input.declaredSchoolCity?.trim() || null,
    });
    if (error) throw new Error(error.message);
    return data as { cycle: SchoolCycle; schoolLevelId: string; subjectIds: string[]; onboardingCompleted: boolean };
  };
}

