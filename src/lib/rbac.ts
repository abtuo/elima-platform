import { type AppRole } from "@/lib/types";

const roleScopes: Record<AppRole, AppRole[]> = {
  SUPER_ADMIN: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"],
  SCHOOL_ADMIN: ["SCHOOL_ADMIN", "TEACHER"],
  TEACHER: ["TEACHER"],
  // Note: PARENT/STUDENT roles still exist in the DB, but their UI spaces are removed.
  // We keep them as valid roles to avoid breaking existing data, but we don't grant them access to protected areas.
  PARENT: ["PARENT"],
  STUDENT: ["STUDENT"],
};

export function canAccessRole(actor: AppRole, target: AppRole) {
  return roleScopes[actor].includes(target);
}

export function isValidRole(value: string): value is AppRole {
  return ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"].includes(value);
}
