export type {
  CourseSheet, QuizAttemptSummary, QuizItem, QuizQuestion, RevisionProgress, ScanRecord,
} from "@elima/revision-core";

export type LearningAttemptSummary = {
  id: string;
  contentType: "guided_exercise" | "exam";
  contentId: string;
  title: string;
  subject?: string;
  chapter?: string;
  status: "in_progress" | "submitted" | "completed" | "abandoned";
  startedAt: string;
  completedAt?: string;
  elapsedSeconds: number;
  score?: number;
};
