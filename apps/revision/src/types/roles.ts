import type { AppRole } from "@elima/shared-domain/roles";

export type UserRole = AppRole;

export type SchoolPlan = "basic" | "premium" | "custom";

export type MobileSpace = "parent" | "student" | "teacher" | "admin";

export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  schoolId: string | null;
  schoolName: string | null;
  schoolLogoUrl: string | null;
  avatarUrl: string | null;
  currency: string;
  plan: SchoolPlan;
  schoolMembershipStatus: "standalone" | "linked";
  declaredSchoolName: string | null;
  declaredSchoolCity: string | null;
  schoolLevelId: string | null;
  className: string | null;
};

export function isStandaloneStudent(profile: UserProfile) {
  return profile.role === "STUDENT" && profile.schoolMembershipStatus === "standalone";
}

export function getProfileHomePath(profile: UserProfile) {
  return isStandaloneStudent(profile) ? "/student/reviser" : `/${ROLE_HOME[profile.role]}`;
}

export const ROLE_HOME: Record<UserRole, MobileSpace> = {
  PARENT: "parent",
  STUDENT: "student",
  TEACHER: "teacher",
  SCHOOL_ADMIN: "admin",
  SUPER_ADMIN: "admin",
  COMPTABLE: "admin",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super administrateur",
  SCHOOL_ADMIN: "Chef d’établissement",
  COMPTABLE: "Comptable",
  TEACHER: "Enseignant",
  PARENT: "Parent d’élève",
  STUDENT: "Élève",
};

export function getRoleLabel(role: UserRole) {
  return ROLE_LABELS[role];
}
