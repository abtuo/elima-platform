function requireDemoPassword() {
  const password = process.env.SEED_AUTH_PASSWORD?.trim();
  if (!password || password.length < 12) {
    throw new Error(
      "SEED_AUTH_PASSWORD doit contenir au moins 12 caractères et rester hors de Git.",
    );
  }
  return password;
}

export const DEMO_PASSWORD = requireDemoPassword();
export const DEMO_ACADEMIC_YEAR = "2025-2026";

export const DEMO_SCHOOLS = [
  {
    id: "a1111111-1111-4111-8111-111111110001",
    slug: "college-moderne-abidjan-demo",
    name: "Collège Moderne Abidjan",
    city: "Abidjan",
    principal: true,
  },
] as const;

export const DEMO_SCHOOL_IDS = DEMO_SCHOOLS.map((school) => school.id);

export const DEMO_ACCOUNTS = [
  { email: "direction@demo.elima.invalid", role: "SUPER_ADMIN", schoolId: DEMO_SCHOOLS[0].id, fullName: "Direction Démo" },
  { email: "admin@demo.elima.invalid", role: "SCHOOL_ADMIN", schoolId: DEMO_SCHOOLS[0].id, fullName: "Administration Démo" },
  { email: "comptable@demo.elima.invalid", role: "COMPTABLE", schoolId: DEMO_SCHOOLS[0].id, fullName: "Comptabilité Démo" },
  { email: "enseignant.maths.01@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "M. Serge N'Guessan", subject: "Mathématiques" },
  { email: "enseignant.maths.02@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mme Estelle Yao", subject: "Mathématiques" },
  { email: "enseignant.francais.01@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mme Nadia Bamba", subject: "Français" },
  { email: "enseignant.francais.02@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "M. Alain Kouassi", subject: "Français" },
  { email: "enseignant.physique.01@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "M. Karim Coulibaly", subject: "Physique-Chimie" },
  { email: "enseignant.physique.02@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mme Rosine Brou", subject: "Physique-Chimie" },
  { email: "enseignant.svt.01@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mme Mireille Assi", subject: "SVT" },
  { email: "enseignant.svt.02@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "M. Paul Kouamé", subject: "SVT" },
  { email: "enseignant.histoire.01@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "M. Ange Koffi", subject: "Histoire-Géographie" },
  { email: "enseignant.histoire.02@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mme Aïcha Bakayoko", subject: "Histoire-Géographie" },
  { email: "enseignant.anglais.01@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mme Claire Kouadio", subject: "Anglais" },
  { email: "enseignant.anglais.02@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "M. Étienne N'Dri", subject: "Anglais" },
  { email: "enseignant.philo.01@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "M. Jules Amani", subject: "Philosophie" },
  { email: "enseignant.philo.02@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mme Grâce Touré", subject: "Philosophie" },
  { email: "enseignant.eps.01@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "M. Marc Tano", subject: "EPS" },
  { email: "enseignant.eps.02@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mme Olga Konan", subject: "EPS" },
  { email: "enseignant.info.01@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "M. Ismaël Diomandé", subject: "Informatique" },
  { email: "enseignant.arts.01@demo.elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mme Diane Kanga", subject: "Arts" },
  { email: "parent.multi@demo.elima.invalid", role: "PARENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Parent Démo Multi-enfant" },
  { email: "parent.simple.01@demo.elima.invalid", role: "PARENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Parent Démo Awa" },
  { email: "parent.simple.02@demo.elima.invalid", role: "PARENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Parent Démo Eli" },
  { email: "parent.simple.03@demo.elima.invalid", role: "PARENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Parent Démo Yao" },
  { email: "eleve.awa@demo.elima.invalid", role: "STUDENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Awa Koné" },
  { email: "eleve.yao@demo.elima.invalid", role: "STUDENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Yao Kouamé" },
  { email: "eleve.lina@demo.elima.invalid", role: "STUDENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Lina Traoré" },
  { email: "eleve.eli@demo.elima.invalid", role: "STUDENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Eli Tuo" },
  { email: "eleve.kader@demo.elima.invalid", role: "STUDENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Kader Koné" },
] as const;

export const SECONDARY_CLASSES = [
  { name: "6ème A", level: "6ème" },
  { name: "6ème B", level: "6ème" },
  { name: "5ème A", level: "5ème" },
  { name: "5ème B", level: "5ème" },
  { name: "4ème A", level: "4ème" },
  { name: "3ème A", level: "3ème" },
  { name: "2nde C1", level: "2nde C" },
  { name: "1ère D", level: "1ère D" },
  { name: "Terminale C", level: "Terminale C" },
  { name: "Terminale D", level: "Terminale D" },
] as const;
