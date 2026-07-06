export const DEMO_PASSWORD = process.env.SEED_AUTH_PASSWORD || "ElimaSeed!2026";
export const DEMO_ACADEMIC_YEAR = "2025-2026";

export const DEMO_SCHOOLS = [
  {
    id: "a1111111-1111-4111-8111-111111110001",
    slug: "college-moderne-abidjan-demo",
    name: "Collège Moderne d'Abidjan",
    city: "Abidjan",
    principal: true,
  },
  {
    id: "a1111111-1111-4111-8111-111111110002",
    slug: "institut-excellence-yamoussoukro-demo",
    name: "Institut Excellence Yamoussoukro",
    city: "Yamoussoukro",
    principal: false,
  },
] as const;

export const DEMO_SCHOOL_IDS = DEMO_SCHOOLS.map((school) => school.id);

export const DEMO_ACCOUNTS = [
  { email: "admin.abidjan@seed-elima.invalid", role: "SCHOOL_ADMIN", schoolId: DEMO_SCHOOLS[0].id, fullName: "Admin Collège Moderne d'Abidjan" },
  { email: "teacher.abidjan@seed-elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mme Fatou Diabaté", subject: "Français" },
  { email: "enseignant.serge@elima.school", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "M. Serge N'Guessan", subject: "Mathématiques" },
  { email: "enseignant.nadia@elima.school", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mme Nadia Bamba", subject: "Français" },
  { email: "enseignant.karim@elima.school", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "M. Karim Coulibaly", subject: "Physique-Chimie" },
  { email: "enseignant.mireille@elima.school", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mme Mireille Assi", subject: "SVT" },
  { email: "enseignant.ange@elima.school", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "M. Ange Koffi", subject: "Histoire-Géographie" },
  { email: "enseignant.claire@elima.school", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mme Claire Kouadio", subject: "Anglais" },
  { email: "enseignant.jules@elima.school", role: "TEACHER", schoolId: DEMO_SCHOOLS[0].id, fullName: "M. Jules Amani", subject: "Philosophie" },
  { email: "parent.mariam@elima.school", role: "PARENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Mariam Koné" },
  { email: "parent.jean@elima.school", role: "PARENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Jean Kouamé" },
  { email: "parent.aminata@elima.school", role: "PARENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Aminata Traoré" },
  { email: "parent.aboubacar@elima.school", role: "PARENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Aboubacar Tuo" },
  { email: "eleve.awa@elima.school", role: "STUDENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Awa Koné" },
  { email: "eleve.yao@elima.school", role: "STUDENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Yao Kouamé" },
  { email: "eleve.lina@elima.school", role: "STUDENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Lina Traoré" },
  { email: "eleve.eli@elima.school", role: "STUDENT", schoolId: DEMO_SCHOOLS[0].id, fullName: "Eli Tuo" },
  { email: "admin.yamoussoukro@seed-elima.invalid", role: "SCHOOL_ADMIN", schoolId: DEMO_SCHOOLS[1].id, fullName: "Admin Institut Excellence Yamoussoukro" },
  { email: "teacher.yamoussoukro@seed-elima.invalid", role: "TEACHER", schoolId: DEMO_SCHOOLS[1].id, fullName: "Enseignant Institut Excellence Yamoussoukro", subject: "Mathématiques" },
  { email: "enseignant.iey.francais@elima.school", role: "TEACHER", schoolId: DEMO_SCHOOLS[1].id, fullName: "Mme Aïcha Bakayoko", subject: "Français" },
  { email: "enseignant.iey.svt@elima.school", role: "TEACHER", schoolId: DEMO_SCHOOLS[1].id, fullName: "M. Paul Kouassi", subject: "SVT" },
  { email: "enseignant.iey.physique@elima.school", role: "TEACHER", schoolId: DEMO_SCHOOLS[1].id, fullName: "Mme Rosine Brou", subject: "Physique-Chimie" },
  { email: "enseignant.iey.histoire@elima.school", role: "TEACHER", schoolId: DEMO_SCHOOLS[1].id, fullName: "M. Étienne Koffi", subject: "Histoire-Géographie" },
  { email: "enseignant.iey.anglais@elima.school", role: "TEACHER", schoolId: DEMO_SCHOOLS[1].id, fullName: "Mme Grâce N'Dri", subject: "Anglais" },
] as const;

export const SECONDARY_CLASSES = [
  { name: "6ème A", level: "6ème" },
  { name: "6ème B", level: "6ème" },
  { name: "6ème C", level: "6ème" },
  { name: "5ème A", level: "5ème" },
  { name: "5ème B", level: "5ème" },
  { name: "4ème A", level: "4ème" },
  { name: "4ème B", level: "4ème" },
  { name: "3ème A", level: "3ème" },
  { name: "2nde A", level: "2nde A" },
  { name: "2nde C1", level: "2nde C" },
  { name: "1ère A", level: "1ère A" },
  { name: "1ère D", level: "1ère D" },
  { name: "Terminale C", level: "Terminale C" },
  { name: "Terminale D", level: "Terminale D" },
] as const;
