export type SchoolCycle = "primary" | "secondary";
export type SubjectAvailability = "available" | "planned";

export type EducationDomain = { id: string; label: string };
export type EducationSubject = {
  id: string;
  label: string;
  availability: SubjectAvailability;
  domains: EducationDomain[];
};
export type EducationGrade = { id: string; label: string; cycle: SchoolCycle };

export const REVISION_EDUCATION_SYSTEM = {
  countryCode: "CI",
  countryLabel: "Côte d’Ivoire",
  systemId: "cote-divoire",
  cycles: [
    { id: "primary" as const, label: "Primaire", description: "Pour les élèves de CM1 et CM2" },
    { id: "secondary" as const, label: "Secondaire", description: "Pour les élèves du collège et du lycée" },
  ],
};

export const REVISION_GRADES: EducationGrade[] = [
  { id: "CM1", label: "CM1", cycle: "primary" },
  { id: "CM2", label: "CM2", cycle: "primary" },
  ...[
    "6ème", "5ème", "4ème", "3ème", "Seconde", "2nde A", "2nde C", "Première",
    "1ère A", "1ère C", "1ère D", "Terminale", "Terminale A", "Terminale C", "Terminale D", "Autre",
  ].map((label) => ({ id: label, label, cycle: "secondary" as const })),
];

const domain = (id: string, label: string): EducationDomain => ({ id, label });

export const PRIMARY_REVISION_SUBJECTS: EducationSubject[] = [
  {
    id: "maths", label: "Mathématiques", availability: "available",
    domains: [domain("numeration", "Numération"), domain("operations", "Opérations"), domain("problem-solving", "Résolution de problèmes"), domain("measurement", "Mesures"), domain("geometry", "Géométrie")],
  },
  {
    id: "francais", label: "Français", availability: "available",
    domains: [domain("reading", "Lecture"), domain("comprehension", "Compréhension"), domain("grammar", "Grammaire"), domain("conjugation", "Conjugaison"), domain("spelling", "Orthographe"), domain("vocabulary", "Vocabulaire")],
  },
  {
    id: "sciences-technologie", label: "Sciences et technologie", availability: "planned",
    domains: [domain("observation", "Observation"), domain("human-body", "Corps humain"), domain("environment", "Environnement")],
  },
];

export const SECONDARY_REVISION_SUBJECTS: EducationSubject[] = [
  ["maths", "Mathématiques"], ["francais", "Français"], ["anglais", "Anglais"], ["espagnol", "Espagnol"],
  ["svt", "SVT"], ["physique-chimie", "Physique-Chimie"], ["histoire-geographie", "Histoire-Géographie"],
  ["philosophie", "Philosophie"], ["ses", "Sciences économiques et sociales"], ["informatique", "Informatique / NSI"],
  ["eps", "EPS"], ["arts", "Arts"],
].map(([id, label]) => ({ id, label, availability: "available" as const, domains: [] }));

export function gradesForCycle(cycle: SchoolCycle) {
  return REVISION_GRADES.filter((grade) => grade.cycle === cycle);
}

export function inferSchoolCycle(level?: string | null): SchoolCycle | null {
  const normalized = String(level ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (/^cm[12]\b/.test(normalized)) return "primary";
  if (/^(6|5|4|3)(e|eme)?\b/.test(normalized) || /^(seconde|2nde|premiere|1ere|terminale)\b/.test(normalized)) return "secondary";
  return null;
}

export function subjectsForEducation(cycle: SchoolCycle, level: string) {
  if (cycle === "primary") return PRIMARY_REVISION_SUBJECTS;
  const lowerSecondary = /^(6|5|4|3)/.test(level.trim());
  return lowerSecondary
    ? SECONDARY_REVISION_SUBJECTS.filter((subject) => !["philosophie", "ses"].includes(subject.id))
    : SECONDARY_REVISION_SUBJECTS;
}

export function selectableSubjectsForEducation(cycle: SchoolCycle, level: string) {
  return subjectsForEducation(cycle, level).filter((subject) => subject.availability === "available");
}

export function compatibleSubjectIds(cycle: SchoolCycle, level: string, subjectIds: string[]) {
  const allowed = new Set(selectableSubjectsForEducation(cycle, level).map((subject) => subject.id));
  return [...new Set(subjectIds)].filter((subjectId) => allowed.has(subjectId));
}

