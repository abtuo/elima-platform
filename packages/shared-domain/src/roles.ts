export const APP_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "COMPTABLE",
  "TEACHER",
  "PARENT",
  "STUDENT",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const STAFF_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "COMPTABLE",
  "TEACHER",
] as const satisfies readonly AppRole[];
