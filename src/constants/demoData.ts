import type { UserRole } from "../types/roles";
import type {
  Assignment,
  ChildSummary,
  ClassInfo,
  GradeSummary,
  MessagePreview,
  PaymentSummary,
  ResourceItem,
  StudentDirectoryItem,
  TimetableEvent,
} from "../types/school";
export { demoRevisionProgress, demoQuizzes, demoQuizAttempts, demoCourseSheets, demoQuizQuestions, REVISION_SUBJECTS } from "./revisionDemoData";

export const demoAccounts = [
  { label: "Admin Abidjan", email: "admin.abidjan@seed-elima.invalid", password: "ElimaSeed!2026", fullName: "Kouakou Léon Kobenan", role: "SCHOOL_ADMIN" as UserRole },
  { label: "Parent Mariam", email: "parent.mariam@elima.school", password: "ElimaSeed!2026", fullName: "Mme Mariam Koné", role: "PARENT" as UserRole },
  { label: "Parent Aboubacar", email: "parent.aboubacar@elima.school", password: "ElimaSeed!2026", fullName: "M. Aboubacar Tuo", role: "PARENT" as UserRole },
  { label: "Enseignant Serge", email: "enseignant.serge@elima.school", password: "ElimaSeed!2026", fullName: "M. Serge N'Guessan", role: "TEACHER" as UserRole },
  { label: "Élève Awa", email: "eleve.awa@elima.school", password: "ElimaSeed!2026", fullName: "Awa Koné", role: "STUDENT" as UserRole, className: "6ème B" },
  { label: "Élève Yao", email: "eleve.yao@elima.school", password: "ElimaSeed!2026", fullName: "Yao Kouamé", role: "STUDENT" as UserRole, className: "6ème B" },
  { label: "Élève Lina", email: "eleve.lina@elima.school", password: "ElimaSeed!2026", fullName: "Lina Traoré", role: "STUDENT" as UserRole, className: "3ème A" },
  { label: "Élève Eli", email: "eleve.eli@elima.school", password: "ElimaSeed!2026", fullName: "Eli Tuo", role: "STUDENT" as UserRole, className: "6ème B" },
  { label: "Élève Kader · Tle C", email: "eleve.kader@elima.school", password: "ElimaSeed!2026", fullName: "Kader Koné", role: "STUDENT" as UserRole, className: "Terminale C" },
] as const;

export const demoProfile = {
  id: "demo-user",
  email: "parent@elima.ci",
  fullName: "Aminata Koné",
  role: "PARENT" as UserRole,
  schoolId: "demo-school",
  schoolName: "Lycée Sainte Marie de Cocody",
  schoolLogoUrl: null,
  avatarUrl: null,
  currency: "FCFA",
  plan: "premium" as const,
  schoolMembershipStatus: "linked" as const,
  declaredSchoolName: null,
  declaredSchoolCity: null,
  schoolLevelId: null,
  className: null,
};

export const demoChildren: ChildSummary[] = [
  { id: "c1", name: "Kofi Koné", className: "3ème A", recentGrade: "14/20", absences: 1, pendingAssignments: 2 },
  { id: "c2", name: "Awa Koné", className: "6ème B", recentGrade: "16/20", absences: 0, pendingAssignments: 1 },
];

export const demoAssignments: Assignment[] = [
  { id: "a1", title: "Exercices chapitre 4", subject: "Mathématiques", className: "3ème A", dueDate: "2026-06-25", status: "pending" },
  { id: "a2", title: "Rédaction : mon héros", subject: "Français", className: "3ème A", dueDate: "2026-06-26", status: "pending" },
  { id: "a3", title: "Carte de l'Afrique", subject: "Géographie", className: "6ème B", dueDate: "2026-06-24", status: "done" },
];

export const demoGrades: GradeSummary[] = [
  { id: "g1", subject: "Mathématiques", title: "Contrôle n°3", score: 14, maxScore: 20, date: "2026-07-08" },
  { id: "g2", subject: "Français", title: "Dictée", score: 12, maxScore: 20, date: "2026-07-05" },
  { id: "g3", subject: "SVT", title: "TP digestion", score: 16, maxScore: 20, date: "2026-07-03" },
];

export const demoMessages: MessagePreview[] = [
  { id: "m1", conversationId: "c1", subject: "Réunion parents-professeurs", preview: "La réunion est prévue le 18 juillet à 15h.", sender: "Direction", date: "2026-07-10", read: false, conversationType: "parent_teacher", kind: "message", canReply: true },
  { id: "m2", conversationId: "c2", subject: "Devoir de maths", preview: "Le chapitre 4 est à rendre pour lundi.", sender: "M. Diallo", date: "2026-07-09", read: true, conversationType: "teacher_student", kind: "message", canReply: true },
  { id: "m3", conversationId: "c3", subject: "Absence signalée", preview: "Retard enregistré ce matin.", sender: "Vie scolaire", date: "2026-07-08", read: true, conversationType: "absence_notification", kind: "alert", canReply: false },
];

export const demoPayments: PaymentSummary[] = [
  { id: "p1", label: "Frais de scolarité T2", amount: 85000, status: "paid", date: "2026-06-15" },
  { id: "p2", label: "Cantine juillet", amount: 12000, status: "pending", date: "2026-07-01" },
];

export const demoResources: ResourceItem[] = [
  { id: "r1", title: "Cours — Équations", subject: "Mathématiques", className: "3ème A", type: "cours", publishedAt: "2026-07-09", description: "Résumé du chapitre 4" },
  { id: "r2", title: "Correction exercice 3", subject: "Mathématiques", className: "3ème A", type: "correction", publishedAt: "2026-07-08" },
];

const demoRosterNames = {
  "demo-6b": ["Awa Koné", "Yao Kouamé", "Eli Tuo", "Adama Diarra", "Aïcha Coulibaly", "Amadou Koffi", "Aya N'Dri", "Bintou Traoré", "Cheick Fofana", "Clarisse Yao", "Djeneba Konan", "Emmanuel Assi", "Fatoumata Bamba", "Franck Gnahoré", "Grâce Brou", "Ibrahim Dosso", "Inès Akissi", "Jean-Philippe Zadi", "Kader Ouattara", "Kouadio Kassi", "Mariama Touré", "Mohamed Bakayoko", "Nadia Yapi", "Ruth N'Guessan", "Souleymane Diallo"],
  "demo-3a": ["Lina Traoré", "Abel Kacou", "Aminata Koné", "Armand Kouassi", "Carine Aka", "Cédric Dago", "Christelle Niamké", "David Koffi", "Esther Yoboué", "Fabrice Amani", "Gisèle N'Cho", "Hamed Cissé", "Ismaël Doumbia", "Joëlle Goli", "Kevin Beugré", "Mariam Sangaré", "Merveille Kobenan", "Nathanaël Ahoua", "Prisca Djedje", "Raïssa Zamble", "Wilfried Kanga"],
} as const;

export const demoClassStudents: Record<string, StudentDirectoryItem[]> = Object.fromEntries(
  Object.entries(demoRosterNames).map(([classId, names]) => {
    const className = classId === "demo-6b" ? "6ème B" : "3ème A";
    return [classId, names.map((name, index) => ({ id: `${classId}-${index + 1}`, name, className, classId, level: className.split(" ")[0] }))];
  }),
);

export const demoClasses: ClassInfo[] = [
  { id: "demo-6b", name: "6ème B", subject: "Mathématiques", studentCount: demoClassStudents["demo-6b"].length },
  { id: "demo-3a", name: "3ème A", subject: "Mathématiques", studentCount: demoClassStudents["demo-3a"].length },
];

const DEMO_REFERENCE_DATE = "2026-06-25";
const demoCourse = (id: string, date: string, start: string, end: string, subject: string, className: string, room: string): TimetableEvent => ({
  id, subject, className, room, referenceDate: DEMO_REFERENCE_DATE,
  startsAt: `${date}T${start}:00.000Z`, endsAt: `${date}T${end}:00.000Z`,
});

export const demoTimetableEvents: TimetableEvent[] = [
  demoCourse("tt-01", "2026-06-22", "08:00", "09:30", "Mathématiques", "6ème B", "Bâtiment A · Salle 3"),
  demoCourse("tt-02", "2026-06-22", "09:45", "10:45", "Français", "6ème B", "Bâtiment A · Salle 3"),
  demoCourse("tt-03", "2026-06-22", "11:00", "12:30", "Histoire-Géographie", "6ème B", "Bâtiment A · Salle 3"),
  demoCourse("tt-04", "2026-06-22", "08:00", "09:00", "Français", "3ème A", "Bâtiment B · Salle 6"),
  demoCourse("tt-05", "2026-06-22", "09:45", "11:15", "Mathématiques", "3ème A", "Bâtiment B · Salle 6"),
  demoCourse("tt-06", "2026-06-22", "11:30", "13:00", "Physique-Chimie", "3ème A", "Laboratoire Physique-Chimie"),
  demoCourse("tt-07", "2026-06-23", "08:00", "09:00", "Anglais", "6ème B", "Bâtiment A · Salle 3"),
  demoCourse("tt-08", "2026-06-23", "09:15", "10:45", "SVT", "6ème B", "Laboratoire SVT"),
  demoCourse("tt-09", "2026-06-23", "14:00", "15:30", "EPS", "6ème B", "Terrain multisports"),
  demoCourse("tt-10", "2026-06-23", "08:00", "09:30", "Mathématiques", "3ème A", "Bâtiment B · Salle 6"),
  demoCourse("tt-11", "2026-06-23", "09:45", "10:45", "Histoire-Géographie", "3ème A", "Bâtiment B · Salle 6"),
  demoCourse("tt-12", "2026-06-23", "11:00", "12:00", "Anglais", "3ème A", "Bâtiment B · Salle 6"),
  demoCourse("tt-13", "2026-06-24", "08:00", "09:30", "Français", "6ème B", "Bâtiment A · Salle 3"),
  demoCourse("tt-14", "2026-06-24", "10:00", "11:00", "Mathématiques", "6ème B", "Bâtiment A · Salle 3"),
  demoCourse("tt-15", "2026-06-24", "08:00", "09:30", "Physique-Chimie", "3ème A", "Laboratoire Physique-Chimie"),
  demoCourse("tt-16", "2026-06-24", "10:00", "11:30", "Français", "3ème A", "Bâtiment B · Salle 6"),
  demoCourse("tt-17", "2026-06-25", "08:00", "09:30", "Mathématiques", "6ème B", "Bâtiment A · Salle 3"),
  demoCourse("tt-18", "2026-06-25", "10:00", "11:00", "Français", "6ème B", "Bâtiment A · Salle 3"),
  demoCourse("tt-19", "2026-06-25", "14:00", "15:30", "SVT", "6ème B", "Laboratoire SVT"),
  demoCourse("tt-20", "2026-06-25", "08:00", "09:00", "Histoire-Géographie", "3ème A", "Bâtiment B · Salle 6"),
  demoCourse("tt-21", "2026-06-25", "09:45", "11:15", "Mathématiques", "3ème A", "Bâtiment B · Salle 6"),
  demoCourse("tt-22", "2026-06-25", "11:30", "12:30", "Anglais", "3ème A", "Bâtiment B · Salle 6"),
  demoCourse("tt-23", "2026-06-26", "08:00", "09:00", "Anglais", "6ème B", "Bâtiment A · Salle 3"),
  demoCourse("tt-24", "2026-06-26", "10:00", "11:30", "EPS", "6ème B", "Terrain multisports"),
  demoCourse("tt-25", "2026-06-26", "08:00", "09:30", "Français", "3ème A", "Bâtiment B · Salle 6"),
  demoCourse("tt-26", "2026-06-26", "10:00", "11:30", "SVT", "3ème A", "Laboratoire SVT"),
  demoCourse("tt-27", "2026-06-26", "14:00", "15:00", "EPS", "3ème A", "Terrain multisports"),
];


export const DOCUMENT_TYPES = [
  { value: "cours", label: "Cours" },
  { value: "devoir", label: "Devoir" },
  { value: "correction", label: "Correction" },
  { value: "exercice", label: "Exercice" },
  { value: "sujet", label: "Sujet d'examen" },
  { value: "fiche", label: "Fiche papier" },
];
