export type RevisionProgress = {
  xp: number;
  level: number;
  streakDays: number;
  completedQuizCount: number;
  averageScore: number;
};

export type QuizItem = {
  id: string;
  subject: string;
  topic: string;
  questionCount: number;
  difficulty: string;
};

export type CourseSheet = {
  id: string;
  title: string;
  subject: string;
  topic: string;
  content: string;
  createdAt: string;
};

export type ScanRecord = {
  id: string;
  fileName: string;
  subject: string;
  topic: string;
  documentType: string;
  status: "received" | "analyzing" | "ready" | "error";
  createdAt: string;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  hint?: string;
  explanation?: string;
};

export type QuizAttemptSummary = {
  id: string;
  quizRef?: string;
  subject: string;
  topic?: string;
  score: number;
  totalQuestions?: number;
  correctAnswers?: number;
  completedAt: string;
};
