export type LearningQuestion = {
  id: string;
  externalId: string;
  title: string;
  prompt: string;
  questionType: string;
  points: number;
  skills: string[];
  partTitle?: string;
  publicMetadata: Record<string, unknown>;
};

export type GuidedOption = { id: string; label: string };

export type GuidedSessionMetadata = {
  engine?: "guided_session_v3";
  version?: string;
  objective?: string;
  situation?: string;
  materials?: string[];
  skills?: string[];
  paperRequired?: boolean;
  statement?: {
    introduction?: string;
    context?: string;
    main_questions?: string[];
    paper_instructions?: string[];
    display?: Record<string, unknown>;
  };
  statementBeforeGuidance?: boolean;
  remediation?: string[];
};

export type LearningExercise = {
  id: string;
  title: string;
  description: string;
  country: string;
  educationSystem: string;
  level: string;
  subject: string;
  chapter: string;
  difficulty: string;
  estimatedMinutes: number;
  totalPoints: number;
  sourceType: string;
  metadata: GuidedSessionMetadata & Record<string, unknown>;
  recommended?: boolean;
  questions: LearningQuestion[];
};

export type LearningExerciseCard = Omit<LearningExercise, "questions"> & {
  questionCount: number;
};

export type ExamSubject = {
  id: string;
  slug: string;
  title: string;
  country: string;
  educationSystem: string;
  level: string;
  subject: string;
  year?: number;
  session?: string;
  examType: string;
  durationMinutes: number;
  totalPoints: number;
  coefficient?: number;
  exerciseIds: string[];
  questionCount: number;
  sourcePdfPath?: string;
  instructions: string[];
};

export type LearningCatalog = {
  profile: { level: string; country?: string; educationSystem?: string; isExamLevel: boolean; subjects: string[] };
  exercises: LearningExercise[];
  exams: ExamSubject[];
};

export type LearningDiscovery = {
  profile: { level: string; country?: string; educationSystem?: string; isExamLevel: boolean };
  subjects: Array<{
    id: string;
    label: string;
    guidedCount: number;
    examCount: number;
    chapters: Array<{ id: string; label: string; guidedCount: number; examCount: number }>;
  }>;
};

export type LearningSuggestion = {
  kind: "guided_exercise" | "exam";
  exercise?: LearningExerciseCard;
  exam?: ExamSubject;
};

export type LearningContent = {
  kind: "guided_exercise" | "exam";
  exercise?: LearningExercise;
  exam?: ExamSubject;
  exercises: LearningExercise[];
};

export type ValidationResult = {
  status: "correct" | "partially_correct" | "incorrect" | "needs_justification" | "invalid_format";
  score: number;
  reachedStep: number;
  errorType: string | null;
  message: string;
  nextAction: string;
  hintAvailable: boolean;
  correctionAllowed: boolean;
  validator: "deterministic" | "normalized_approximation" | "gpt_assisted";
  strengths?: string[];
  stepFeedback?: Array<{ step: number; status: "correct" | "partial" | "incorrect"; feedback: string }>;
  aiModel?: string;
};

export type LearningSession = {
  id: string;
  contentType: "guided_exercise" | "exam";
  contentId: string;
  mode: "guided" | "exam";
  status: "in_progress" | "submitted" | "completed";
  startedAt: string;
  elapsedSeconds: number;
  currentQuestion: number;
  answers: Record<string, { value: string; steps?: string[]; confidence: "low" | "medium" | "high"; result?: ValidationResult; hints: string[]; attempts: number }>;
  marked: string[];
};
