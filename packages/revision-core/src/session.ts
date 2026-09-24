import type { AuthStorage } from "@elima/auth";
import type { LearningSession, RevisionProgress } from "./types.ts";

const SESSION_PREFIX = "elima_learning_session:";

export function learningSessionKey(contentType: LearningSession["contentType"], contentId: string) {
  return `${SESSION_PREFIX}${contentType}:${contentId}`;
}

export function readLearningSession(storage: AuthStorage, contentType: LearningSession["contentType"], contentId: string) {
  try {
    const value = storage.getItem(learningSessionKey(contentType, contentId));
    return value ? JSON.parse(value) as LearningSession : null;
  } catch {
    return null;
  }
}

export function saveLearningSession(storage: AuthStorage, session: LearningSession) {
  storage.setItem(learningSessionKey(session.contentType, session.contentId), JSON.stringify(session));
}

export function learningSessionScore(storage: AuthStorage, contentId: string, totalPoints?: number) {
  const session = readLearningSession(storage, "guided_exercise", contentId);
  if (!session || (session.status !== "submitted" && session.status !== "completed")) return null;
  const assessed = Object.values(session.answers).filter((answer) => answer.result);
  if (!assessed.length) return 0;
  const earned = assessed.reduce((sum, answer) => sum + Number(answer.result?.score || 0), 0);
  const maximum = Math.max(Number(totalPoints || assessed.length), 1);
  return Math.round(earned * 100 / maximum);
}

export function createLocalLearningSession(
  contentType: LearningSession["contentType"],
  contentId: string,
  mode: LearningSession["mode"],
  id: string,
  now = new Date(),
): LearningSession {
  return { id, contentType, contentId, mode, status: "in_progress", startedAt: now.toISOString(), elapsedSeconds: 0, currentQuestion: 0, answers: {}, marked: [] };
}

export function submitLocalLearningSession(session: LearningSession, now = new Date()): LearningSession {
  return {
    ...session,
    status: "submitted",
    elapsedSeconds: Math.max(session.elapsedSeconds, Math.round((now.getTime() - new Date(session.startedAt).getTime()) / 1000)),
  };
}

export function applyQuizScore(progress: RevisionProgress, score: number): RevisionProgress {
  const xpGain = Math.max(10, Math.round(score * 0.5));
  const xp = progress.xp + xpGain;
  return {
    ...progress,
    xp,
    level: Math.floor(xp / 100) + 1,
    completedQuizCount: progress.completedQuizCount + 1,
    averageScore: Math.round((progress.averageScore + score) / 2),
  };
}
