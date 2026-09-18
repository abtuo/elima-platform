export type DemoClassName = "6e A" | "6e B" | "5e B";

export type DemoStudent = {
  id: string;
  fullName: string;
  className: DemoClassName;
};

export type DemoEvaluation = {
  id: string;
  className: DemoClassName;
  subject: string;
  term: "Trimestre 1" | "Trimestre 2" | "Trimestre 3";
  label: string;
  maxScore: number; // 20
  dateISO: string;
};

export type DemoAttendanceRecord = {
  id: string;
  className: DemoClassName;
  dateISO: string;
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE";
};

export const demoClasses: DemoClassName[] = ["6e A", "6e B", "5e B"];
export const demoSubjects = ["Mathématiques", "Français", "SVT"];
export const demoTerms = ["Trimestre 1", "Trimestre 2", "Trimestre 3"] as const;

export const demoStudents: DemoStudent[] = [
  { id: "s1", fullName: "Aïcha Koné", className: "6e A" },
  { id: "s2", fullName: "Moussa Traoré", className: "6e A" },
  { id: "s3", fullName: "Yao Kouassi", className: "6e A" },
  { id: "s4", fullName: "Aminata Diallo", className: "6e B" },
  { id: "s5", fullName: "Ibrahim Camara", className: "6e B" },
  { id: "s6", fullName: "Fatou Diallo", className: "5e B" },
  { id: "s7", fullName: "Kader Ouattara", className: "5e B" },
];

export const demoEvaluations: DemoEvaluation[] = [
  {
    id: "ev-001",
    className: "6e A",
    subject: "Mathématiques",
    term: "Trimestre 1",
    label: "Contrôle 1",
    maxScore: 20,
    dateISO: "2026-02-10",
  },
  {
    id: "ev-002",
    className: "6e A",
    subject: "Mathématiques",
    term: "Trimestre 1",
    label: "Interro",
    maxScore: 20,
    dateISO: "2026-02-24",
  },
];
