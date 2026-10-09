import type { QuizQuestion } from './types.ts';

export function quizResult(questions: QuizQuestion[], answers: number[]) {
  const correctAnswers = questions.filter((question, index) => answers[index] === question.correctIndex).length;
  return { correctAnswers, totalQuestions: questions.length, score: Math.round(correctAnswers * 100 / Math.max(questions.length, 1)) };
}
