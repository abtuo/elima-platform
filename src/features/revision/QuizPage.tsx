import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageContainer } from "@/components/layout/PageContainer";
import { MarkdownMathText } from "@/components/revision/MarkdownContent";
import { getQuizQuestions, markDailyQuizCompleted, recordQuizCompletion } from "@/services/revisionDataService";
import { useAuth } from "@/features/auth/AuthProvider";
import type { QuizQuestion } from "@/types/revision";

export function QuizPage() {
  const { profile } = useAuth(); const navigate = useNavigate(); const [params] = useSearchParams();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]); const [loading, setLoading] = useState(true); const [index, setIndex] = useState(0); const [selected, setSelected] = useState<number | null>(null); const [score, setScore] = useState(0); const [done, setDone] = useState(false); const [showResult, setShowResult] = useState(false);
  useEffect(() => { getQuizQuestions(params.get("id") ?? undefined).then(setQuestions).finally(() => setLoading(false)); }, [params]);
  if (loading) return <PageContainer><LoadingState label="Préparation du quiz…" /></PageContainer>;
  if (!questions.length) return <PageContainer><AppHeader title="Quiz" backTo="/student/reviser" accent="#7C3AED" /><EmptyState title="Aucun quiz disponible" description="Les quiz publiés dans la base Révision apparaîtront ici." /></PageContainer>;
  const question = questions[index];
  function answer(option: number) { if (showResult) return; setSelected(option); setShowResult(true); if (option === question.correctIndex) setScore((value) => value + 1); }
  async function next() { if (index < questions.length - 1) { setIndex((value) => value + 1); setSelected(null); setShowResult(false); return; } const finalScore = score + (selected === question.correctIndex ? 0 : 0); await recordQuizCompletion(Math.round((finalScore / questions.length) * 100), params.get("subject") ?? "Quiz"); markDailyQuizCompleted(profile.id); setDone(true); }
  if (done) { const percentage = Math.round((score / questions.length) * 100); return <PageContainer><div className="card flex flex-col items-center py-12 text-center"><CheckCircle2 className="h-16 w-16 text-primary" /><h2 className="font-title mt-4 text-2xl font-bold text-accent">Quiz terminé !</h2><p className="mt-2 text-4xl font-bold text-primary">{percentage}%</p><p className="mt-1 text-sm text-gray-500">{score}/{questions.length} bonnes réponses</p><button onClick={() => navigate("/student/reviser")} className="tap mt-6 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white">Retour à Réviser</button></div></PageContainer>; }
  return <PageContainer><AppHeader title="Quiz" subtitle={`Question ${index + 1}/${questions.length}`} backTo="/student/reviser" accent="#7C3AED" /><div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-revision" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div><div className="card p-6"><MarkdownMathText content={question.question} /><div className="mt-5 space-y-2">{question.options.map((option, optionIndex) => { const correct = optionIndex === question.correctIndex; const chosen = optionIndex === selected; const style = showResult && correct ? "border-green-400 bg-green-50" : showResult && chosen ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"; return <button key={optionIndex} onClick={() => answer(optionIndex)} className={`tap flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm ${style}`}>{showResult && correct ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : showResult && chosen ? <XCircle className="h-4 w-4 text-red-600" /> : null}<MarkdownMathText content={option} /></button>; })}</div>{showResult && question.explanation ? <div className="mt-4 rounded-2xl bg-primary/5 p-4 text-sm"><MarkdownMathText content={question.explanation} /></div> : null}{showResult ? <button onClick={next} className="tap mt-4 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white">{index < questions.length - 1 ? "Question suivante" : "Terminer"}</button> : null}</div></PageContainer>;
}
