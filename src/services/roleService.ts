import type { MobileSpace, UserProfile, UserRole } from "../types/roles";
import { ROLE_HOME } from "../types/roles";
import { isDemoModeActive } from "./env";
import { demoAccounts, demoProfile } from "../constants/demoData";
export { fetchUserProfile } from "./profileService";

export function getHomeSpace(role: UserRole): MobileSpace {
  return ROLE_HOME[role];
}

export function getDemoProfile(email?: string): UserProfile {
  const account = demoAccounts.find((item) => item.email.toLowerCase() === email?.toLowerCase());
  if (!account) return demoProfile;
  return { ...demoProfile, id: `demo-${account.role.toLowerCase()}`, email: account.email, fullName: account.fullName, role: account.role, className: "className" in account ? account.className : null, schoolLevelId: "className" in account ? account.className : null };
}

export function shouldUseDemoProfile() {
  return isDemoModeActive();
}
