import type {
  CourseSheet, LearningAttemptSummary, QuizAttemptSummary, RevisionProgress,
} from "@/types/revision";

export type HomeActivity = {
  id: string;
  kind: "quiz" | "learning" | "sheet";
  subject: string;
  title: string;
  detail: string;
  date: string;
  href?: string;
};

export type ContinueActivity = {
  subject: string;
  title: string;
  detail: string;
  href: string;
};

export function learningHref(attempt: LearningAttemptSummary) {
  return attempt.contentType === "exam"
    ? `/student/reviser/devoirs/examen/${encodeURIComponent(attempt.contentId)}`
    : `/student/reviser/parcours/session/${encodeURIComponent(attempt.contentId)}`;
}

export function quizHref(attempt: QuizAttemptSummary) {
  if (!attempt.quizRef || attempt.quizRef.startsWith("generated:")) return undefined;
  const params = new URLSearchParams({ id: attempt.quizRef, subject: attempt.subject });
  if (attempt.topic) params.set("topic", attempt.topic);
  return `/student/reviser/quiz?${params.toString()}`;
}

export function buildHomeActivities(
  attempts: QuizAttemptSummary[],
  learningAttempts: LearningAttemptSummary[],
  sheets: CourseSheet[],
): HomeActivity[] {
  const quizActivities = attempts.map((attempt): HomeActivity => ({
    id: `quiz:${attempt.id}`,
    kind: "quiz",
    subject: attempt.subject,
    title: attempt.topic || "QCM",
    detail: `Score ${attempt.score}%`,
    date: attempt.completedAt,
    href: quizHref(attempt),
  }));
  const learningActivities = learningAttempts.map((attempt): HomeActivity => ({
    id: `learning:${attempt.id}`,
    kind: "learning",
    subject: attempt.subject || (attempt.contentType === "exam" ? "Examen" : "Parcours"),
    title: attempt.title,
    detail: attempt.status === "in_progress" ? "En cours" : attempt.score === undefined ? "Terminé" : `Score ${attempt.score}%`,
    date: attempt.completedAt || attempt.startedAt,
    href: learningHref(attempt),
  }));
  const sheetActivities = sheets.map((sheet): HomeActivity => ({
    id: `sheet:${sheet.id}`,
    kind: "sheet",
    subject: sheet.subject,
    title: sheet.title,
    detail: "Fiche créée",
    date: sheet.createdAt,
    href: `/student/reviser/fiches/${encodeURIComponent(sheet.id)}`,
  }));
  return [...quizActivities, ...learningActivities, ...sheetActivities]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function selectContinueActivity(
  attempts: QuizAttemptSummary[],
  learningAttempts: LearningAttemptSummary[],
  sheets: CourseSheet[],
): ContinueActivity | null {
  const inProgress = learningAttempts.find((attempt) => attempt.status === "in_progress");
  if (inProgress) return {
    subject: inProgress.subject || "Parcours",
    title: inProgress.title,
    detail: inProgress.chapter || "Session en cours",
    href: learningHref(inProgress),
  };

  const replayableQuiz = attempts.find((attempt) => quizHref(attempt));
  if (replayableQuiz) return {
    subject: replayableQuiz.subject,
    title: replayableQuiz.topic || "Dernier QCM",
    detail: `Dernier score : ${replayableQuiz.score}%`,
    href: quizHref(replayableQuiz)!,
  };

  const latestSheet = sheets[0];
  return latestSheet ? {
    subject: latestSheet.subject,
    title: latestSheet.title,
    detail: "Dernière fiche créée",
    href: `/student/reviser/fiches/${encodeURIComponent(latestSheet.id)}`,
  } : null;
}

export function isNewRevisionAccount(
  progress: RevisionProgress,
  attempts: QuizAttemptSummary[],
  learningAttempts: LearningAttemptSummary[],
  sheets: CourseSheet[],
) {
  return progress.xp === 0 && progress.completedQuizCount === 0
    && attempts.length === 0 && learningAttempts.length === 0 && sheets.length === 0;
}
