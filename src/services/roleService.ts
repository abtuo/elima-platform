import type { MobileSpace, SchoolPlan, UserProfile, UserRole } from "../types/roles";
import { ROLE_HOME } from "../types/roles";
import { isDemoModeActive } from "./env";
import { mainDbClient } from "./mainDbClient";
import { demoAccounts, demoProfile } from "../constants/demoData";

export function getHomeSpace(role: UserRole): MobileSpace {
  return ROLE_HOME[role];
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!mainDbClient) return null;

  const { data: userRow, error } = await mainDbClient
    .from("users")
    .select("id, email, full_name, role, school_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !userRow) return null;

  let schoolName: string | null = null;
  let schoolLogoUrl: string | null = null;
  let currency = "FCFA";
  let plan: SchoolPlan = "basic";

  if (userRow.school_id) {
    const { data: school } = await mainDbClient
      .from("schools")
      .select("name, logo_url, currency, plan, is_demo")
      .eq("id", userRow.school_id)
      .maybeSingle();

    if (school) {
      schoolName = school.name ?? null;
      schoolLogoUrl = school.logo_url ?? null;
      currency = String(school.currency ?? "FCFA").replace("XOF", "FCFA");
      plan = (school.is_demo ? "custom" : school.plan ?? "basic") as SchoolPlan;
    }
  }

  const { data: studentProfile } = userRow.role === "STUDENT"
    ? await mainDbClient.from("student_profiles").select("school_membership_status, declared_school_name, declared_school_city, school_level_id").eq("id", userId).maybeSingle()
    : { data: null };

  return {
    id: userRow.id,
    email: userRow.email ?? "",
    fullName: userRow.full_name ?? "Utilisateur",
    role: userRow.role as UserRole,
    schoolId: userRow.school_id,
    schoolName,
    schoolLogoUrl,
    currency,
    plan,
    schoolMembershipStatus: studentProfile?.school_membership_status === "linked" || userRow.school_id ? "linked" : "standalone",
    declaredSchoolName: studentProfile?.declared_school_name ?? null,
    declaredSchoolCity: studentProfile?.declared_school_city ?? null,
    schoolLevelId: studentProfile?.school_level_id || null,
  };
}

export function getDemoProfile(email?: string): UserProfile {
  const account = demoAccounts.find((item) => item.email.toLowerCase() === email?.toLowerCase());
  if (!account) return demoProfile;
  return { ...demoProfile, id: `demo-${account.role.toLowerCase()}`, email: account.email, fullName: account.fullName, role: account.role };
}

export function shouldUseDemoProfile() {
  return isDemoModeActive();
}
