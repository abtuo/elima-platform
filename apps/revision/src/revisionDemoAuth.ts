import type { UserProfile } from "@/types/roles";

export const revisionDemoAccounts = [
  { label: "Élève Awa", email: "eleve.awa@elima.school", password: "ElimaSeed!2026", fullName: "Awa Koné", role: "STUDENT" as const, className: "6ème B" },
  { label: "Élève Yao", email: "eleve.yao@elima.school", password: "ElimaSeed!2026", fullName: "Yao Kouamé", role: "STUDENT" as const, className: "6ème B" },
  { label: "Élève Lina", email: "eleve.lina@elima.school", password: "ElimaSeed!2026", fullName: "Lina Traoré", role: "STUDENT" as const, className: "3ème A" },
  { label: "Élève Eli", email: "eleve.eli@elima.school", password: "ElimaSeed!2026", fullName: "Eli Tuo", role: "STUDENT" as const, className: "6ème B" },
  { label: "Élève Kader · Tle C", email: "eleve.kader@elima.school", password: "ElimaSeed!2026", fullName: "Kader Koné", role: "STUDENT" as const, className: "Terminale C" },
] as const;

export function getRevisionDemoProfile(email?: string): UserProfile {
  const account = revisionDemoAccounts.find((item) => item.email.toLowerCase() === email?.toLowerCase()) ?? revisionDemoAccounts[0];
  return {
    id: `demo-student-${account.email.split("@")[0]}`,
    email: account.email,
    fullName: account.fullName,
    role: "STUDENT",
    schoolId: null,
    schoolName: null,
    schoolLogoUrl: null,
    avatarUrl: null,
    currency: "FCFA",
    plan: "basic",
    schoolMembershipStatus: "standalone",
    declaredSchoolName: null,
    declaredSchoolCity: null,
    schoolLevelId: account.className,
    className: account.className,
  };
}
