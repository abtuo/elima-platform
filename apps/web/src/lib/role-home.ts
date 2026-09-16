import type { AppRole } from "@/lib/types";

/** Client-safe role → default home path (no server-only imports). */
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
