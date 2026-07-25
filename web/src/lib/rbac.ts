import { type AppRole } from "@/lib/types";

const roleScopes: Record<AppRole, AppRole[]> = {
  SUPER_ADMIN: ["SUPER_ADMIN", "SCHOOL_ADMIN", "COMPTABLE", "TEACHER"],
  SCHOOL_ADMIN: ["SCHOOL_ADMIN", "COMPTABLE", "TEACHER"],
  // Comptable: accès finance uniquement (espace dédié réutilisant /dashboard/finance).
  COMPTABLE: ["COMPTABLE"],
  TEACHER: ["TEACHER"],
  // Parent / Élève: espaces réactivés (Lot 4), accès strictement à leur propre périmètre.
  PARENT: ["PARENT"],
  STUDENT: ["STUDENT"],
};

export function canAccessRole(actor: AppRole, target: AppRole) {
  return roleScopes[actor].includes(target);
}

export function isValidRole(value: string): value is AppRole {
  return ["SUPER_ADMIN", "SCHOOL_ADMIN", "COMPTABLE", "TEACHER", "PARENT", "STUDENT"].includes(value);
}
