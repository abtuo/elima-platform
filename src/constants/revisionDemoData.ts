import type { RevisionProgress, CourseSheet, QuizAttemptSummary, QuizItem } from "../types/revision";

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

export const demoQuizAttempts: QuizAttemptSummary[] = [
  { id: "qa-demo-1", quizRef: "q1", subject: "Mathématiques", topic: "Équations du 1er degré", score: 80, totalQuestions: 10, correctAnswers: 8, completedAt: "2026-07-14T17:20:00.000Z" },
  { id: "qa-demo-2", quizRef: "q2", subject: "Français", topic: "Les figures de style", score: 70, totalQuestions: 10, correctAnswers: 7, completedAt: "2026-07-12T18:05:00.000Z" },
  { id: "qa-demo-3", quizRef: "q3", subject: "SVT", topic: "La digestion", score: 90, totalQuestions: 10, correctAnswers: 9, completedAt: "2026-07-10T16:40:00.000Z" },
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
