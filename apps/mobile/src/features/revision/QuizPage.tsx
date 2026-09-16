import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Star, X, XCircle } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { GeneratedActionIcon } from "@/components/common/GeneratedActionIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageContainer } from "@/components/layout/PageContainer";
import { MarkdownMathText } from "@/components/revision/MarkdownContent";
import { SubjectIcon } from "@/components/revision/SubjectIcon";
import {
  consumeDailyHint,
  getDailyHintUsage,
  getQuizQuestions,
  markDailyQuizCompleted,
  recordQuizCompletion,
  submitQuizFeedback,
} from "@/services/revisionDataService";
import { useAuth } from "@/features/auth/AuthProvider";
import type { QuizQuestion } from "@/types/revision";

export function QuizPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [sessionAttemptId] = useState(() => crypto.randomUUID());
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintRemaining, setHintRemaining] = useState<number | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [difficultyFeedback, setDifficultyFeedback] = useState<"too_easy" | "balanced" | "too_hard" | "">("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const subject = params.get("subject") ?? "Quiz";
  const topic = params.get("topic");

  useEffect(() => {
    const quizId = params.get("id") ?? undefined;
    Promise.all([
      getQuizQuestions(quizId, `${profile.id}|${sessionAttemptId}`),
      getDailyHintUsage(profile.id),
    ]).then(([nextQuestions, usage]) => {
      setQuestions(nextQuestions);
      setHintRemaining(usage.remaining);
    }).finally(() => setLoading(false));
  }, [params, profile.id, sessionAttemptId]);

  if (loading) return <PageContainer><LoadingState label="Préparation du quiz…" /></PageContainer>;
  if (!questions.length) return <PageContainer><AppHeader title="Quiz" backTo="/student/reviser" accent="#7C3AED" /><EmptyState title="Quiz indisponible" description="Cette session n’est plus disponible. Relance le quiz depuis l’écran Réviser." /></PageContainer>;

  const question = questions[index];

  function answer(option: number) {
    if (showResult) return;
    setSelected(option);
    setShowResult(true);
    if (option === question.correctIndex) setScore((value) => value + 1);
  }

  async function revealHint() {
    if (hintOpen || hintBusy || showResult || !question.hint || hintRemaining === 0) return;
    setHintBusy(true);
    const usage = await consumeDailyHint(profile.id);
    setHintRemaining(usage.remaining);
    if (usage.ok) setHintOpen(true);
    setHintBusy(false);
  }

  async function next() {
    if (index < questions.length - 1) {
      setIndex((value) => value + 1);
      setSelected(null);
      setShowResult(false);
      setHintOpen(false);
      return;
    }
    try {
      await recordQuizCompletion({
        userId: profile.id,
        quizRef: params.get("id") ?? "daily",
        subject,
        topic: topic ?? undefined,
        score: Math.round((score / questions.length) * 100),
        totalQuestions: questions.length,
        correctAnswers: score,
      });
    } catch (error) {
      console.warn("Enregistrement du résultat du quiz :", error);
    }
    markDailyQuizCompleted(profile.id);
    setDone(true);
  }

  function abandon() {
    if (window.confirm("Abandonner ce quiz ? La progression de cette session ne sera pas enregistrée.")) navigate("/student/reviser", { replace: true });
  }

  async function sendFeedback() {
    if (!rating || !difficultyFeedback || feedbackBusy) return;
    setFeedbackBusy(true);
    await submitQuizFeedback({ quizRef: params.get("id") ?? "daily", subject, rating, difficulty: difficultyFeedback });
    setFeedbackSent(true);
    setFeedbackBusy(false);
  }

  if (done) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <PageContainer>
        <div className="card flex flex-col items-center px-5 py-10 text-center">
          <CheckCircle2 className="h-16 w-16 text-primary" />
          <h2 className="mt-4 font-title text-2xl font-bold text-accent">Quiz terminé !</h2>
          <p className="mt-2 text-4xl font-bold text-primary">{percentage}%</p>
          <p className="mt-1 text-sm text-gray-500">{score}/{questions.length} bonnes réponses</p>
          <div className="mt-7 w-full max-w-md rounded-3xl bg-gray-50 p-5">
            {feedbackSent ? (
              <div className="py-4"><CheckCircle2 className="mx-auto h-8 w-8 text-primary" /><p className="mt-2 font-semibold text-accent">Merci pour ton avis !</p></div>
            ) : (
              <>
                <h3 className="font-title font-semibold text-accent">Note ce quiz</h3>
                <p className="mt-1 text-xs text-gray-500">Ton avis nous aide à améliorer les prochaines questions.</p>
                <div className="mt-4 flex justify-center gap-2" aria-label="Note sur 5">
                  {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} className="rounded-lg p-1" aria-label={`${value} étoile${value > 1 ? "s" : ""}`}><Star className={`h-7 w-7 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} /></button>)}
                </div>
                <p className="mt-5 text-xs font-semibold text-gray-600">Le niveau était-il adapté ?</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([
                    { value: "too_easy", label: "Trop facile" },
                    { value: "balanced", label: "Bien dosé" },
                    { value: "too_hard", label: "Trop difficile" },
                  ] as const).map((choice) => <button key={choice.value} type="button" onClick={() => setDifficultyFeedback(choice.value)} className={`rounded-xl border px-2 py-2 text-[11px] font-semibold ${difficultyFeedback === choice.value ? "border-revision bg-revision/10 text-revision" : "border-gray-200 bg-white text-gray-500"}`}>{choice.label}</button>)}
                </div>
                <button type="button" onClick={sendFeedback} disabled={!rating || !difficultyFeedback || feedbackBusy} className="mt-4 w-full rounded-2xl bg-revision py-2.5 text-sm font-semibold text-white disabled:opacity-40">{feedbackBusy ? "Envoi…" : "Envoyer mon avis"}</button>
              </>
            )}
          </div>
          <button type="button" onClick={() => navigate("/student/reviser")} className="tap mt-5 rounded-2xl bg-primary px-8 py-3 text-sm font-semibold text-white">Retour</button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AppHeader title="Quiz" subtitle={`Question ${index + 1}/${questions.length}`} accent="#7C3AED" />
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <SubjectIcon subject={subject} />
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-accent">{subject}</p>{topic ? <p className="truncate text-xs text-gray-500">{topic}</p> : null}</div>
        </div>
        <button type="button" onClick={abandon} className="flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"><X className="h-4 w-4" />Abandonner</button>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-revision transition-all" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>

      <div className="card overflow-hidden p-5 sm:p-6">
        <div className="font-title text-lg font-semibold leading-relaxed text-accent sm:text-xl"><MarkdownMathText content={question.question} /></div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={revealHint}
            disabled={hintBusy || hintOpen || showResult || !question.hint || hintRemaining === 0}
            className="relative flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 py-2 pl-3 pr-10 text-xs font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <GeneratedActionIcon name="hint" className="h-7 w-7" />{hintBusy ? "Ouverture…" : "Indice"}
            <span className="absolute right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-700 px-1 text-[10px] font-bold text-white">{hintRemaining ?? "…"}</span>
          </button>
        </div>

        {hintOpen && question.hint ? <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-800">Indice</p><MarkdownMathText content={question.hint} /></div> : null}
        {!hintOpen && hintRemaining === 0 ? <p className="mt-2 text-right text-xs text-gray-400">Limite quotidienne d’indices atteinte.</p> : null}

        <div className="mt-5 space-y-3">
          {question.options.map((option, optionIndex) => {
            const correct = optionIndex === question.correctIndex;
            const chosen = optionIndex === selected;
            const style = showResult && correct ? "border-green-400 bg-green-50 text-green-900" : showResult && chosen ? "border-red-400 bg-red-50 text-red-900" : showResult ? "border-gray-200 bg-gray-50 text-gray-400" : "border-gray-200 bg-white hover:border-revision/50";
            return (
              <button key={`${question.id}-${optionIndex}`} type="button" disabled={showResult} onClick={() => answer(optionIndex)} className={`tap flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-2xl border-2 px-4 py-3 text-left text-sm transition ${style}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">{optionIndex + 1}</span>
                {showResult && correct ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> : showResult && chosen ? <XCircle className="h-4 w-4 shrink-0 text-red-600" /> : null}
                <MarkdownMathText content={option} inline className="min-w-0 flex-1" />
              </button>
            );
          })}
        </div>

        {showResult ? (
          <div className={`mt-4 rounded-2xl p-4 text-sm ${selected === question.correctIndex ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>
            <p className="mb-1 font-semibold">{selected === question.correctIndex ? "Bonne réponse" : "Presque !"}</p>
            {question.explanation ? <MarkdownMathText content={question.explanation} /> : null}
          </div>
        ) : null}

        {showResult ? <button type="button" onClick={next} className="tap mt-4 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white">{index < questions.length - 1 ? "Question suivante" : "Terminer le quiz"}</button> : null}
      </div>
    </PageContainer>
  );
}
