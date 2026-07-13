import type { UserRole } from "../types/roles";
import type {
  Assignment,
  ChildSummary,
  ClassInfo,
  GradeSummary,
  MessagePreview,
  PaymentSummary,
  ResourceItem,
} from "../types/school";
import type { RevisionProgress, CourseSheet, QuizItem } from "../types/revision";

export const demoAccounts = [
  { label: "Admin Abidjan", email: "admin.abidjan@seed-elima.invalid", password: "ElimaSeed!2026", fullName: "Direction Abidjan", role: "SCHOOL_ADMIN" as UserRole },
  { label: "Parent Mariam", email: "parent.mariam@elima.school", password: "ElimaSeed!2026", fullName: "Mariam Koné", role: "PARENT" as UserRole },
  { label: "Parent Aboubacar", email: "parent.aboubacar@elima.school", password: "ElimaSeed!2026", fullName: "Aboubacar Diallo", role: "PARENT" as UserRole },
  { label: "Enseignant Serge", email: "enseignant.serge@elima.school", password: "ElimaSeed!2026", fullName: "Serge Kouassi", role: "TEACHER" as UserRole },
  { label: "Élève Awa", email: "eleve.awa@elima.school", password: "ElimaSeed!2026", fullName: "Awa Koné", role: "STUDENT" as UserRole },
  { label: "Élève Yao", email: "eleve.yao@elima.school", password: "ElimaSeed!2026", fullName: "Yao Kouassi", role: "STUDENT" as UserRole },
  { label: "Élève Lina", email: "eleve.lina@elima.school", password: "ElimaSeed!2026", fullName: "Lina Bamba", role: "STUDENT" as UserRole },
  { label: "Élève Eli", email: "eleve.eli@elima.school", password: "ElimaSeed!2026", fullName: "Eli Traoré", role: "STUDENT" as UserRole },
] as const;

export const demoProfile = {
  id: "demo-user",
  email: "parent@elima.ci",
  fullName: "Aminata Koné",
  role: "PARENT" as UserRole,
  schoolId: "demo-school",
  schoolName: "Lycée Sainte Marie de Cocody",
  schoolLogoUrl: null,
  currency: "FCFA",
  plan: "premium" as const,
};

export const demoChildren: ChildSummary[] = [
  { id: "c1", name: "Kofi Koné", className: "3ème A", recentGrade: "14/20", absences: 1, pendingAssignments: 2 },
  { id: "c2", name: "Awa Koné", className: "6ème B", recentGrade: "16/20", absences: 0, pendingAssignments: 1 },
];

export const demoAssignments: Assignment[] = [
  { id: "a1", title: "Exercices chapitre 4", subject: "Mathématiques", className: "3ème A", dueDate: "2026-07-14", status: "pending" },
  { id: "a2", title: "Rédaction : mon héros", subject: "Français", className: "3ème A", dueDate: "2026-07-16", status: "pending" },
  { id: "a3", title: "Carte de l'Afrique", subject: "Géographie", className: "6ème B", dueDate: "2026-07-12", status: "done" },
];

export const demoGrades: GradeSummary[] = [
  { id: "g1", subject: "Mathématiques", title: "Contrôle n°3", score: 14, maxScore: 20, date: "2026-07-08" },
  { id: "g2", subject: "Français", title: "Dictée", score: 12, maxScore: 20, date: "2026-07-05" },
  { id: "g3", subject: "SVT", title: "TP digestion", score: 16, maxScore: 20, date: "2026-07-03" },
];

export const demoMessages: MessagePreview[] = [
  { id: "m1", subject: "Réunion parents-professeurs", preview: "La réunion est prévue le 18 juillet à 15h.", sender: "Direction", date: "2026-07-10", read: false },
  { id: "m2", subject: "Devoir de maths", preview: "Le chapitre 4 est à rendre pour lundi.", sender: "M. Diallo", date: "2026-07-09", read: true },
  { id: "m3", subject: "Absence signalée", preview: "Retard enregistré ce matin.", sender: "Vie scolaire", date: "2026-07-08", read: true },
];

export const demoPayments: PaymentSummary[] = [
  { id: "p1", label: "Frais de scolarité T2", amount: 85000, status: "paid", date: "2026-06-15" },
  { id: "p2", label: "Cantine juillet", amount: 12000, status: "pending", date: "2026-07-01" },
];

export const demoResources: ResourceItem[] = [
  { id: "r1", title: "Cours — Équations", subject: "Mathématiques", className: "3ème A", type: "cours", publishedAt: "2026-07-09", description: "Résumé du chapitre 4" },
  { id: "r2", title: "Correction exercice 3", subject: "Mathématiques", className: "3ème A", type: "correction", publishedAt: "2026-07-08" },
];

export const demoClasses: ClassInfo[] = [
  { id: "cl1", name: "3ème A", subject: "Mathématiques", studentCount: 32, time: "08:00" },
  { id: "cl2", name: "4ème B", subject: "Mathématiques", studentCount: 28, time: "10:30" },
  { id: "cl3", name: "5ème C", subject: "Mathématiques", studentCount: 30, time: "14:00" },
];

export const demoRevisionProgress: RevisionProgress = {
  xp: 340,
  level: 4,
  streakDays: 5,
  completedQuizCount: 18,
  averageScore: 72,
};

export const demoQuizzes: QuizItem[] = [
  { id: "q1", subject: "Mathématiques", topic: "Équations du 1er degré", questionCount: 10, difficulty: "Moyen" },
  { id: "q2", subject: "Français", topic: "Les figures de style", questionCount: 10, difficulty: "Facile" },
  { id: "q3", subject: "SVT", topic: "La digestion", questionCount: 10, difficulty: "Moyen" },
];

export const demoCourseSheets: CourseSheet[] = [
  {
    id: "s1",
    title: "Équations du 1er degré",
    subject: "Mathématiques",
    topic: "Algèbre",
    createdAt: "2026-07-08",
    content: `## À retenir\n\nUne équation du 1er degré s'écrit $ax + b = 0$.\n\n## Formules clés\n\n$$x = -\\frac{b}{a}$$\n\n## Pièges fréquents\n\n- Oublier de changer le signe en passant de l'autre côté\n- Diviser par zéro`,
  },
  {
    id: "s2",
    title: "Les figures de style",
    subject: "Français",
    topic: "Expression",
    createdAt: "2026-07-06",
    content: `## À retenir\n\nLa métaphore et la comparaison enrichissent le texte.\n\n## Exemples\n\n- **Métaphore** : "Cette fille est un soleil."\n- **Comparaison** : "Il court comme le vent."`,
  },
];

export const demoQuizQuestions = [
  {
    id: "qq1",
    question: "Quelle est la solution de $2x + 4 = 10$ ?",
    options: ["$x = 2$", "$x = 3$", "$x = 4$", "$x = 7$"],
    correctIndex: 1,
    hint: "Isolez $x$ en soustrayant 4 des deux côtés.",
    explanation: "$2x = 6$, donc $x = 3$.",
  },
  {
    id: "qq2",
    question: "Quelle figure de style compare deux éléments avec « comme » ?",
    options: ["Métaphore", "Comparaison", "Hyperbole", "Litote"],
    correctIndex: 1,
    hint: "Le mot « comme » est un indice.",
    explanation: "La comparaison utilise un outil de comparaison explicite.",
  },
];

export const REVISION_SUBJECTS = [
  "Mathématiques", "Français", "Anglais", "SVT", "Physique-Chimie",
  "Histoire-Géographie", "Philosophie", "EPS", "Arts", "Informatique",
];

export const DOCUMENT_TYPES = [
  { value: "cours", label: "Cours" },
  { value: "devoir", label: "Devoir" },
  { value: "correction", label: "Correction" },
  { value: "exercice", label: "Exercice" },
  { value: "sujet", label: "Sujet d'examen" },
  { value: "fiche", label: "Fiche papier" },
];
