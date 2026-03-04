import { demoClasses, demoStudents, demoSubjects, demoTerms } from "@/lib/teacher/demo";

export { demoSubjects, demoTerms, demoClasses };

export type StudentId = "stu-001" | "stu-002";

export type StudentProfile = {
  id: StudentId;
  fullName: string;
  className: (typeof demoClasses)[number];
};

export type StudentGrade = {
  id: string;
  studentId: StudentId;
  subject: string;
  term: (typeof demoTerms)[number];
  evaluation: string;
  score: number;
  maxScore: number;
  coef: number;
  dateISO: string;
};

export type StudentAttendanceEvent = {
  id: string;
  studentId: StudentId;
  dateISO: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  note?: string;
};

export type StudentHomework = {
  id: string;
  studentId: StudentId;
  subject: string;
  dueDateISO: string;
  title: string;
  description?: string;
};

export type StudentDocument = {
  id: string;
  studentId: StudentId;
  title: string;
  category: "Bulletin" | "Devoir" | "Ressource";
  dateISO: string;
};

export const demoStudentProfiles: StudentProfile[] = [
  { id: "stu-001", fullName: "Moussa Traoré", className: "6e A" },
  { id: "stu-002", fullName: "Aïcha Koné", className: "6e A" },
];

export function getStudentProfile(studentId: string): StudentProfile {
  return demoStudentProfiles.find((s) => s.id === studentId) ?? demoStudentProfiles[0];
}

export const demoStudentGrades: StudentGrade[] = [
  {
    id: "g-001",
    studentId: "stu-001",
    subject: "Mathématiques",
    term: "Trimestre 1",
    evaluation: "Contrôle 1",
    score: 9,
    maxScore: 20,
    coef: 2,
    dateISO: "2026-02-10",
  },
  {
    id: "g-002",
    studentId: "stu-001",
    subject: "Français",
    term: "Trimestre 1",
    evaluation: "Rédaction",
    score: 12.5,
    maxScore: 20,
    coef: 2,
    dateISO: "2026-02-12",
  },
  {
    id: "g-003",
    studentId: "stu-001",
    subject: "SVT",
    term: "Trimestre 1",
    evaluation: "Interro",
    score: 14,
    maxScore: 20,
    coef: 1,
    dateISO: "2026-02-15",
  },
  {
    id: "g-004",
    studentId: "stu-002",
    subject: "Mathématiques",
    term: "Trimestre 1",
    evaluation: "Contrôle 1",
    score: 16,
    maxScore: 20,
    coef: 2,
    dateISO: "2026-02-10",
  },
];

export const demoStudentAttendance: StudentAttendanceEvent[] = [
  { id: "a-001", studentId: "stu-001", dateISO: "2026-02-20", status: "ABSENT", note: "Non justifiée" },
  { id: "a-002", studentId: "stu-001", dateISO: "2026-02-24", status: "LATE", note: "10 min" },
  { id: "a-003", studentId: "stu-001", dateISO: "2026-02-25", status: "PRESENT" },
];

export const demoStudentHomework: StudentHomework[] = [
  {
    id: "h-001",
    studentId: "stu-001",
    subject: "Mathématiques",
    dueDateISO: "2026-03-08",
    title: "Exercices fractions (p. 32)",
    description: "Faire les exercices 1 à 6."
  },
  {
    id: "h-002",
    studentId: "stu-001",
    subject: "Français",
    dueDateISO: "2026-03-06",
    title: "Lecture : chapitre 3",
  },
];

export const demoStudentDocuments: StudentDocument[] = [
  { id: "d-001", studentId: "stu-001", title: "Bulletin — Trimestre 1", category: "Bulletin", dateISO: "2026-02-28" },
  { id: "d-002", studentId: "stu-001", title: "Devoir — Mathématiques", category: "Devoir", dateISO: "2026-02-18" },
];

export function computeWeightedAverage(grades: StudentGrade[]) {
  const totalCoef = grades.reduce((acc, g) => acc + g.coef, 0);
  if (!totalCoef) return 0;
  const weighted = grades.reduce((acc, g) => acc + (g.score / g.maxScore) * 20 * g.coef, 0);
  return weighted / totalCoef;
}

export function computeSubjectAverages(grades: StudentGrade[]) {
  const by = new Map<string, StudentGrade[]>();
  for (const g of grades) {
    by.set(g.subject, [...(by.get(g.subject) ?? []), g]);
  }
  return Array.from(by.entries()).map(([subject, rows]) => ({
    subject,
    average: computeWeightedAverage(rows),
  }));
}
