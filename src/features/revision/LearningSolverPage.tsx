import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Bookmark, BookmarkCheck, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, FileText, Lightbulb, List, Menu, Plus, Send, Trash2, X } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { MarkdownContent } from "@/components/revision/MarkdownContent";
import { ProgressBar } from "@/components/revision/RevisionUI";
import { GuidedSessionExperience } from "@/features/revision/GuidedSessionExperience";
import { autosaveLearningAnswer, createLearningSession, getLearningContent, getLearningHint, getLearningSolution, getSignedExamPdf, saveLearningSession, submitLearningSession, validateLearningAnswer } from "@/services/learningService";
import type { ExamSubject, LearningExercise, LearningQuestion, LearningSession, ValidationResult } from "@/types/learning";

function formatTime(seconds: number) { const value = Math.max(0, seconds); return `${String(Math.floor(value / 3600)).padStart(2, "0")}:${String(Math.floor(value % 3600 / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }

export function LearningSolverPage({ contentType }: { contentType: "guided_exercise" | "exam" }) {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<LearningExercise[]>([]);
  const [exam, setExam] = useState<ExamSubject | null>(null);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [solution, setSolution] = useState<string[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const mode = contentType === "exam" && params.get("session") === "exam" ? "exam" : "guided";
  const questions = useMemo(() => exercises.flatMap((exercise) => {
    if (exercise.sourceType !== "guided_session_v3") return exercise.questions.map((question) => ({ ...question, exercise }));
    const correction = exercise.questions.find((question) => question.questionType === "guided_solution");
    const flow = exercise.questions.filter((question) => !["guided_solution", "orientation"].includes(question.questionType));
    return [...flow, ...(correction ? [correction] : [])].map((question) => ({ ...question, exercise }));
  }), [exercises]);
  const activeIndex = Math.min(session?.currentQuestion ?? 0, Math.max(0, questions.length - 1));
  const active = questions[activeIndex];
  const answer = active && session?.answers[active.id] ? session.answers[active.id] : { value: "", steps: [""], confidence: "medium" as const, hints: [], attempts: 0 };

  useEffect(() => {
    getLearningContent(contentType === "exam" ? "exam" : "guided_exercise", decodeURIComponent(id)).then(async (content) => {
      const decoded = decodeURIComponent(id);
      if (contentType === "guided_exercise") {
        const exercise = content.exercise;
        if (!exercise) throw new Error("Exercice introuvable.");
        setExercises([exercise]);
      } else {
        const nextExam = content.exam;
        if (!nextExam) throw new Error("Sujet d’examen introuvable.");
        setExam(nextExam);
        setExercises(content.exercises);
      }
      setSession(await createLearningSession(contentType, decoded, mode));
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Impossible d’ouvrir ce devoir."));
  }, [contentType, id, mode]);

  useEffect(() => {
    if (!session || session.status !== "in_progress") return;
    const timer = window.setInterval(() => setSession((current) => current ? { ...current, elapsedSeconds: Math.round((Date.now() - new Date(current.startedAt).getTime()) / 1000) } : current), 1000);
    return () => window.clearInterval(timer);
  }, [session?.id, session?.status]);

  useEffect(() => { if (session) saveLearningSession(session); }, [session]);

  function patchAnswer(patch: Partial<typeof answer>) {
    if (!session || !active) return;
    const next = { ...session, answers: { ...session.answers, [active.id]: { ...answer, ...patch } } };
    setSession(next);
    window.clearTimeout((window as unknown as { __elimaLearningSave?: number }).__elimaLearningSave);
    (window as unknown as { __elimaLearningSave?: number }).__elimaLearningSave = window.setTimeout(() => void autosaveLearningAnswer(next, active.id), 500);
  }

  async function validate() {
    if (!session || !active || !answer.value.trim()) return;
    setBusy(true); setSolution([]);
    try {
      const result = await validateLearningAnswer({ session, questionId: active.id, answer: answer.value, confidence: answer.confidence, attemptsCount: answer.attempts + 1 });
      patchAnswer({ result, attempts: answer.attempts + 1 });
      if (result.correctionAllowed || answer.attempts + 1 >= 3) await revealSolution(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Validation impossible."); } finally { setBusy(false); }
  }

  async function requestHint() {
    const maxHints = Number(active?.publicMetadata.hintCount ?? 2);
    if (!session || !active || answer.hints.length >= maxHints) return;
    setBusy(true);
    try { const hint = await getLearningHint(session, active.id, answer.hints.length + 1); patchAnswer({ hints: [...answer.hints, hint.content] }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Indice indisponible."); } finally { setBusy(false); }
  }

  async function revealSolution(allowed = false) {
    if (!session || !active) return;
    try { const result = await getLearningSolution(session, active.id, allowed || answer.attempts >= 2 || answer.result?.status === "correct" || session.status === "submitted"); setSolution(result.steps.map((step) => typeof step === "string" ? step : step.content)); } catch (reason) { if (!allowed) setError(reason instanceof Error ? reason.message : "Correction indisponible."); }
  }

  function goTo(index: number) { if (!session) return; setSession({ ...session, currentQuestion: Math.max(0, Math.min(questions.length - 1, index)) }); setSolution([]); setNavOpen(false); }

  function completeGuidedStep(value: string) {
    if (!session || !active) return;
    const next = {
      ...session,
      currentQuestion: Math.min(questions.length - 1, activeIndex + 1),
      answers: { ...session.answers, [active.id]: { ...answer, value } },
    };
    setSession(next);
    setSolution([]);
    void autosaveLearningAnswer(next, active.id);
  }

  async function submit() {
    const guidedV3 = contentType === "guided_exercise" && exercises[0]?.sourceType === "guided_session_v3";
    if (!session || (!guidedV3 && !window.confirm("Remettre définitivement ce devoir ? Tu pourras ensuite consulter le bilan et les corrections."))) return;
    setBusy(true);
    try {
      if (guidedV3 && active?.questionType === "guided_solution") await autosaveLearningAnswer(session, active.id);
      let next = await submitLearningSession(session);
      if (mode === "exam" || guidedV3) {
        const questionsToValidate = guidedV3 ? questions.filter((question) => ["single_choice", "multiple_choice", "ordering"].includes(question.questionType)) : questions;
        for (const question of questionsToValidate) {
          const saved = next.answers[question.id];
          if (!saved?.value) continue;
          const result = await validateLearningAnswer({ session: next, questionId: question.id, answer: saved.value, confidence: saved.confidence, attemptsCount: saved.attempts + 1 });
          next = { ...next, answers: { ...next.answers, [question.id]: { ...saved, result, attempts: saved.attempts + 1 } } };
        }
        saveLearningSession(next);
      }
      navigate(`/student/reviser/devoirs/resultats/${contentType}/${encodeURIComponent(next.contentId)}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "La remise a échoué."); } finally { setBusy(false); }
  }

  async function openPdf() { if (!exam?.sourcePdfPath) return; try { const result = await getSignedExamPdf(exam.sourcePdfPath); setPdfUrl(result.url); } catch (reason) { setError(reason instanceof Error ? reason.message : "Sujet original indisponible."); } }

  if (error && !session) return <PageContainer><AppHeader title="Devoir" backTo="/student/reviser?mode=devoirs" /><EmptyState title="Impossible d’ouvrir le devoir" description={error} /></PageContainer>;
  if (!session || !active) return <PageContainer><div className="card animate-pulse p-8 text-sm text-gray-500">Chargement du moteur pédagogique…</div></PageContainer>;
  if (contentType === "guided_exercise" && exercises[0]?.sourceType === "guided_session_v3") return <GuidedSessionExperience
    exercise={exercises[0]}
    active={active}
    activeIndex={activeIndex}
    answer={answer}
    busy={busy}
    error={error}
    solution={solution}
    onPatchAnswer={patchAnswer}
    onHint={requestHint}
    onRevealSolution={() => void revealSolution(true)}
    onGo={goTo}
    onCompleteStep={completeGuidedStep}
    onSubmit={submit}
  />;
  const answered = questions.filter((question) => session.answers[question.id]?.value).length;
  const remaining = exam && mode === "exam" ? exam.durationMinutes * 60 - session.elapsedSeconds : session.elapsedSeconds;

  return <PageContainer className="max-w-[1440px]">
    <AppHeader title={exam?.title || exercises[0]?.title || "Exercice guidé"} subtitle={`${active.exercise.subject} · ${active.exercise.level} · ${mode === "exam" ? "Conditions d’examen" : "Entraînement accompagné"}`} backTo="/student/reviser?mode=devoirs" action={exam?.sourcePdfPath ? <button type="button" onClick={openPdf} className="hidden rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-accent sm:inline-flex"><FileText className="mr-1.5 h-4 w-4" />Voir le sujet original</button> : null} />
    {error ? <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}
    <div className="mb-4 flex items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-white"><button type="button" onClick={() => setNavOpen(true)} className="lg:hidden"><Menu className="h-5 w-5" /></button><div className="min-w-0 flex-1"><div className="mb-1 flex justify-between text-xs"><span>Question {activeIndex + 1} sur {questions.length}</span><span>{answered} réponse{answered > 1 ? "s" : ""}</span></div><ProgressBar value={activeIndex + 1} max={questions.length} /></div><span className="inline-flex items-center gap-1 font-mono text-sm font-semibold"><Clock3 className="h-4 w-4" />{formatTime(remaining)}</span></div>
    <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)_300px]">
      <QuestionNavigation className="hidden lg:block" questions={questions} session={session} activeIndex={activeIndex} onGo={goTo} />
      <main className="min-w-0 space-y-4"><details open className="group card overflow-hidden"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-revision/[.06] px-5 py-4"><span><span className="block text-xs font-bold uppercase tracking-wide text-revision">Énoncé de l’exercice</span><span className="mt-1 block font-title text-lg font-semibold text-accent">{active.exercise.title}</span></span><ChevronDown className="h-5 w-5 text-revision transition group-open:rotate-180" /></summary><div className="border-t border-revision/10 p-5 text-sm leading-7 text-accent sm:p-6"><MarkdownContent content={active.exercise.description || "Lis les données de la question et justifie chaque étape de ton raisonnement."} /></div></details>
      <section className="card min-w-0 p-5 sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-revision">{active.partTitle || "Exercice"} · Question {activeIndex + 1}</p><h2 className="mt-2 font-title text-xl font-semibold text-accent">{active.title}</h2></div><button type="button" onClick={() => setSession({ ...session, marked: session.marked.includes(active.id) ? session.marked.filter((item) => item !== active.id) : [...session.marked, active.id] })} aria-label="Marquer la question" className="rounded-xl bg-gray-50 p-2 text-revision">{session.marked.includes(active.id) ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}</button></div>
        <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm leading-7 text-accent sm:p-5"><MarkdownContent content={active.prompt} /></div>
        {!['boolean','choice','numeric','integer','rational'].includes(active.questionType) ? <StepEditor steps={answer.steps ?? [""]} disabled={session.status !== "in_progress"} onChange={(steps) => patchAnswer({ steps })} /> : null}
        <label className="mt-5 block text-sm font-semibold text-accent">Réponse finale<textarea value={answer.value} onChange={(event) => patchAnswer({ value: event.target.value })} disabled={session.status !== "in_progress"} rows={active.questionType === "boolean" || active.questionType === "choice" ? 2 : 3} placeholder="Écris ici ton résultat final…" className="mt-2 w-full resize-y rounded-2xl border border-gray-200 bg-white p-4 text-sm font-normal leading-6" /></label>
        <fieldset className="mt-4"><legend className="text-xs font-semibold text-gray-500">Ton niveau de confiance</legend><div className="mt-2 flex flex-wrap gap-2">{([['low','Peu sûr'],['medium','Assez sûr'],['high','Très sûr']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => patchAnswer({ confidence: value })} className={`rounded-full px-3 py-2 text-xs font-semibold ${answer.confidence === value ? "bg-revision text-white" : "bg-gray-100 text-gray-500"}`}>{label}</button>)}</div></fieldset>
        {answer.result ? <Feedback result={answer.result} confidence={answer.confidence} /> : null}
        {solution.length ? <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4"><h3 className="font-semibold text-primary">Correction étape par étape</h3><ol className="mt-3 space-y-2 text-sm leading-6 text-accent">{solution.map((step, index) => <li key={`${index}-${step}`}><span className="mr-2 font-bold text-primary">{index + 1}.</span><MarkdownContent content={step} /></li>)}</ol></div> : null}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2"><button type="button" disabled={activeIndex === 0} onClick={() => goTo(activeIndex - 1)} className="inline-flex items-center rounded-xl px-3 py-2 text-sm font-semibold text-gray-500 disabled:opacity-30"><ChevronLeft className="h-4 w-4" />Précédente</button><div className="flex gap-2">{mode === "guided" && session.status === "in_progress" ? <button type="button" disabled={busy || !answer.value.trim()} onClick={validate} className="rounded-xl bg-revision px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Analyse…" : "Valider"}</button> : null}{activeIndex < questions.length - 1 ? <button type="button" onClick={() => goTo(activeIndex + 1)} className="inline-flex items-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white">Suivante<ChevronRight className="h-4 w-4" /></button> : <button type="button" disabled={busy} onClick={submit} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"><Send className="h-4 w-4" />Remettre</button>}</div></div>
      </section></main>
      <aside className="space-y-4"><section className="card p-5"><h3 className="flex items-center gap-2 font-title font-semibold text-accent"><Lightbulb className="h-5 w-5 text-secondary" />Indices progressifs</h3>{mode === "exam" && session.status === "in_progress" ? <p className="mt-3 text-sm leading-6 text-gray-500">Les aides sont désactivées en conditions d’examen. Elles seront disponibles après la remise.</p> : <><div className="mt-3 space-y-2">{answer.hints.map((hint, index) => <div key={hint} className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900"><strong>Indice {index + 1}.</strong> {hint}</div>)}</div>{answer.hints.length < 2 ? <button type="button" disabled={busy} onClick={requestHint} className="mt-3 w-full rounded-xl border border-secondary/30 bg-secondary/10 px-3 py-2.5 text-sm font-semibold text-amber-800">Demander l’indice {answer.hints.length + 1}</button> : null}</>}</section><section className="card p-5"><h3 className="font-title font-semibold text-accent">Barème et suivi</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-gray-500">Question</dt><dd className="font-semibold">{active.points} point{active.points > 1 ? "s" : ""}</dd></div><div className="flex justify-between"><dt className="text-gray-500">Tentatives</dt><dd className="font-semibold">{answer.attempts}</dd></div><div className="flex justify-between"><dt className="text-gray-500">Indices</dt><dd className="font-semibold">{answer.hints.length}/2</dd></div></dl>{mode === "guided" && (answer.attempts >= 3 || answer.result?.status === "correct") ? <button type="button" onClick={() => revealSolution(true)} className="mt-4 w-full rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary">Voir la correction</button> : null}</section></aside>
    </div>
    {navOpen ? <div className="fixed inset-0 z-50 bg-black/40 lg:hidden"><div className="h-full w-[88%] max-w-sm overflow-y-auto bg-gray-50 p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-title text-lg font-semibold">Questions</h2><button type="button" onClick={() => setNavOpen(false)}><X /></button></div><QuestionNavigation questions={questions} session={session} activeIndex={activeIndex} onGo={goTo} /></div></div> : null}
    {pdfUrl ? <div className="fixed inset-0 z-50 flex bg-black/70 p-3 sm:p-8"><div className="relative m-auto h-full w-full max-w-5xl overflow-hidden rounded-2xl bg-white"><button type="button" onClick={() => setPdfUrl("")} className="absolute right-3 top-3 z-10 rounded-full bg-white p-2 shadow"><X /></button><iframe title="Sujet original" src={pdfUrl} className="h-full w-full" /></div></div> : null}
  </PageContainer>;
}

function StepEditor({ steps, disabled, onChange }: { steps: string[]; disabled: boolean; onChange: (steps: string[]) => void }) {
  const values = steps.length ? steps : [""];
  return <fieldset className="mt-5 rounded-2xl border border-revision/10 bg-revision/[.025] p-4"><div className="flex items-center justify-between gap-3"><div><legend className="text-sm font-semibold text-accent">Ta démarche</legend><p className="mt-1 text-xs text-gray-500">Découpe ton raisonnement : GPT analysera chaque étape sans exiger une formulation unique.</p></div><button type="button" disabled={disabled || values.length >= 8} onClick={() => onChange([...values, ""])} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-revision/10 px-3 py-2 text-xs font-bold text-revision disabled:opacity-30"><Plus className="h-3.5 w-3.5" />Étape</button></div><div className="mt-4 space-y-3">{values.map((step, index) => <div key={index} className="flex items-start gap-2"><span className="mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-revision text-xs font-bold text-white">{index + 1}</span><textarea value={step} disabled={disabled} onChange={(event) => onChange(values.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} rows={2} placeholder={index === 0 ? "Première idée, propriété ou calcul…" : "Étape suivante…"} className="min-w-0 flex-1 resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm leading-6" />{values.length > 1 ? <button type="button" disabled={disabled} onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Supprimer l’étape ${index + 1}`} className="mt-2 rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button> : null}</div>)}</div></fieldset>;
}

function QuestionNavigation({ questions, session, activeIndex, onGo, className = "" }: { questions: Array<LearningQuestion & { exercise: LearningExercise }>; session: LearningSession; activeIndex: number; onGo: (index: number) => void; className?: string }) {
  return <nav className={`card h-fit p-4 ${className}`} aria-label="Navigation des questions"><h2 className="flex items-center gap-2 font-title font-semibold text-accent"><List className="h-4 w-4" />Plan du devoir</h2><div className="mt-3 space-y-1">{questions.map((question, index) => { const saved = session.answers[question.id]; return <button key={question.id} type="button" onClick={() => onGo(index)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs ${activeIndex === index ? "bg-revision text-white" : "hover:bg-gray-50"}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${saved?.result?.status === "correct" ? "bg-primary text-white" : saved?.value ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{saved?.result?.status === "correct" ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className="min-w-0 flex-1 truncate">{question.title}</span>{session.marked.includes(question.id) ? <Bookmark className="h-3.5 w-3.5" /> : null}</button>; })}</div></nav>;
}

function Feedback({ result, confidence }: { result: ValidationResult; confidence: string }) {
  const correct = result.status === "correct";
  return <div className={`mt-4 rounded-2xl border p-4 ${correct ? "border-primary/20 bg-primary/5" : "border-amber-200 bg-amber-50"}`}><div className="flex items-start gap-3">{correct ? <Check className="mt-0.5 h-5 w-5 text-primary" /> : <Lightbulb className="mt-0.5 h-5 w-5 text-amber-700" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className={`font-semibold ${correct ? "text-primary" : "text-amber-900"}`}>{correct ? "Réponse validée" : result.status === "partially_correct" ? "Démarche partiellement correcte" : result.status === "needs_justification" ? "Justification à compléter" : result.status === "invalid_format" ? "Format à préciser" : "Poursuis ton raisonnement"}</p>{result.validator === "gpt_assisted" ? <span className="rounded-full bg-revision/10 px-2 py-0.5 text-[10px] font-bold text-revision">Analyse GPT</span> : null}</div><p className="mt-1 text-sm leading-6 text-gray-700">{result.message}</p>{result.strengths?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{result.strengths.map((strength) => <span key={strength} className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{strength}</span>)}</div> : null}{result.stepFeedback?.length ? <div className="mt-3 space-y-2">{result.stepFeedback.map((item) => <div key={`${item.step}-${item.feedback}`} className="rounded-xl bg-white/70 px-3 py-2 text-xs leading-5 text-gray-700"><strong className={item.status === "correct" ? "text-primary" : item.status === "incorrect" ? "text-red-600" : "text-amber-700"}>Étape {item.step}.</strong> {item.feedback}</div>)}</div> : null}{correct && confidence === "low" ? <p className="mt-2 text-xs font-semibold text-revision">Tu as réussi avec peu de confiance : une courte consolidation te sera proposée.</p> : null}{!correct && confidence === "high" ? <p className="mt-2 text-xs font-semibold text-red-600">Tu étais très sûr : cette notion devient prioritaire dans tes recommandations.</p> : null}</div></div></div>;
}
