import type { MobileSpace } from "../types/roles";

export type NavItem = {
  id: string;
  href: string;
  label: string;
  mobileLabel: string;
};

const parentNav: NavItem[] = [
  { id: "home", href: "/parent", label: "Accueil", mobileLabel: "Accueil" },
  { id: "children", href: "/parent/enfants", label: "Enfants", mobileLabel: "Enfants" },
  { id: "payments", href: "/parent/paiements", label: "Paiements", mobileLabel: "Paiements" },
  { id: "messages", href: "/parent/messages", label: "Communication", mobileLabel: "Messages" },
  { id: "profile", href: "/parent/profil", label: "Profil", mobileLabel: "Profil" },
];

const studentNav: NavItem[] = [
  { id: "home", href: "/student", label: "Accueil", mobileLabel: "Accueil" },
  { id: "timetable", href: "/student/emploi-du-temps", label: "Emploi du temps", mobileLabel: "Planning" },
  { id: "revision", href: "/student/reviser", label: "Réviser", mobileLabel: "Réviser" },
  { id: "documents", href: "/student/documents", label: "Mes documents", mobileLabel: "Documents" },
  { id: "profile", href: "/student/profil", label: "Mon parcours", mobileLabel: "Parcours" },
];

const teacherNav: NavItem[] = [
  { id: "today", href: "/teacher", label: "Aujourd'hui", mobileLabel: "Aujourd'hui" },
  { id: "classes", href: "/teacher/classes", label: "Classes", mobileLabel: "Classes" },
  { id: "assignments", href: "/teacher/devoirs", label: "Devoirs", mobileLabel: "Devoirs" },
  { id: "resources", href: "/teacher/ressources", label: "Publier", mobileLabel: "Publier" },
  { id: "messages", href: "/teacher/messages", label: "Communication", mobileLabel: "Messages" },
];

const adminNav: NavItem[] = [
  { id: "dashboard", href: "/admin", label: "Pilotage", mobileLabel: "Pilotage" },
  { id: "students", href: "/admin/eleves", label: "Annuaire", mobileLabel: "Annuaire" },
  { id: "payments", href: "/admin/paiements", label: "Finances", mobileLabel: "Finances" },
  { id: "messages", href: "/admin/messages", label: "Communication", mobileLabel: "Messages" },
  { id: "profile", href: "/admin/profil", label: "Profil", mobileLabel: "Profil" },
];

export function getNavItems(space: MobileSpace): NavItem[] {
  switch (space) {
    case "parent": return parentNav;
    case "student": return studentNav;
    case "teacher": return teacherNav;
    case "admin": return adminNav;
  }
}

export function getSpaceBasePath(space: MobileSpace) {
  return `/${space === "parent" ? "parent" : space}`;
}
