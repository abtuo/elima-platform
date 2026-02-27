import { type AppRole } from "@/lib/types";

const roleScopes: Record<AppRole, AppRole[]> = {
  SUPER_ADMIN: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"],
  SCHOOL_ADMIN: ["SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"],
  TEACHER: ["TEACHER", "STUDENT"],
  PARENT: ["PARENT", "STUDENT"],
  STUDENT: ["STUDENT"],
};

export function canAccessRole(actor: AppRole, target: AppRole) {
  return roleScopes[actor].includes(target);
}

export function isValidRole(value: string): value is AppRole {
  return ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"].includes(value);
}
