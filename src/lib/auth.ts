import { cookies, headers } from "next/headers";
import { isValidRole } from "@/lib/rbac";
import type { AppRole } from "@/lib/types";

export async function getRequestRole(defaultRole: AppRole = "SCHOOL_ADMIN"): Promise<AppRole> {
  const h = await headers();
  const role = h.get("x-elima-role") ?? defaultRole;
  return isValidRole(role) ? role : defaultRole;
}

export async function getSessionRole(): Promise<AppRole | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get("elima_role")?.value;
  if (!role || !isValidRole(role)) return null;
  return role;
}

export function getRoleHomePath(role: AppRole) {
  switch (role) {
    case "SUPER_ADMIN":
    case "SCHOOL_ADMIN":
      return "/dashboard";
    case "COMPTABLE":
      return "/dashboard/finance";
    case "TEACHER":
      return "/teacher";
    case "PARENT":
      return "/parent";
    case "STUDENT":
      return "/student";
    default:
      return "/";
  }
}
