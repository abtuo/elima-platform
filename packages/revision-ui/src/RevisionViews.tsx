import { CheckCircle2, ChevronRight } from "lucide-react";
import type { CourseSheet, QuizQuestion } from "@elima/revision-core";
import { MarkdownContent, MarkdownMathText } from "./MarkdownContent";
import { ProgressBar } from "./RevisionCards";
import { SubjectIcon } from "./subjects";

export function CourseSheetCard({ sheet, onOpen }: { sheet: CourseSheet; onOpen: (sheet: CourseSheet) => void }) {
  return <button type="button" onClick={() => onOpen(sheet)} className="card tap flex w-full items-center gap-3 p-4 text-left"><SubjectIcon subject={sheet.subject} /><span className="min-w-0 flex-1"><span className="block truncate text-xs text-gray-500">{sheet.subject}</span><span className="block font-title text-base font-semibold text-accent">{sheet.title}</span><span className="mt-1 block text-xs text-gray-400">{sheet.createdAt}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-gray-300" /></button>;
}

export function CourseSheetContent({ sheet }: { sheet: CourseSheet }) {
  return <div className="card overflow-hidden p-5 sm:p-6"><MarkdownContent content={sheet.content} variant="sheet" /></div>;
}

export function QuizProgress({ current, total }: { current: number; total: number }) {
  return <ProgressBar value={current} max={total} />;
}

export function QuizQuestionContent({ question }: { question: QuizQuestion }) {
  return <div className="font-title text-lg font-semibold leading-relaxed text-accent sm:text-xl"><MarkdownMathText content={question.question} /></div>;
}

export function RevisionResultSummary({ score, total, onComplete }: { score: number; total: number; onComplete: () => void }) {
  const percentage = Math.round((score / Math.max(total, 1)) * 100);
  return <div className="card flex flex-col items-center px-5 py-10 text-center"><CheckCircle2 className="h-16 w-16 text-primary" /><h2 className="mt-4 font-title text-2xl font-bold text-accent">Session terminée !</h2><p className="mt-2 text-4xl font-bold text-primary">{percentage}%</p><p className="mt-1 text-sm text-gray-500">{score}/{total} bonnes réponses</p><button type="button" onClick={onComplete} className="tap mt-5 rounded-2xl bg-primary px-8 py-3 text-sm font-semibold text-white">Retour</button></div>;
}

export function GuidedSessionProgress({ step, total, estimatedMinutes }: { step: number; total: number; estimatedMinutes?: number }) {
  return <div className="mb-4 rounded-2xl bg-accent px-4 py-3 text-white sm:px-5"><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span>Étape {step} sur {total}</span>{estimatedMinutes ? <span>{estimatedMinutes} min</span> : null}</div><ProgressBar value={step} max={total} /></div>;
}
