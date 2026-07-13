export type UserRole =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "COMPTABLE"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

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
  currency: string;
  plan: SchoolPlan;
};

export const ROLE_HOME: Record<UserRole, MobileSpace> = {
  PARENT: "parent",
  STUDENT: "student",
  TEACHER: "teacher",
  SCHOOL_ADMIN: "admin",
  SUPER_ADMIN: "admin",
  COMPTABLE: "admin",
};
