import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Award, CheckCircle2, Clock3, Lightbulb, RotateCcw, Sparkles, Target } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProgressBar, StatCard } from "@/components/revision/RevisionUI";
import { getLearningContent, readLearningSession } from "@/services/learningService";
import type { LearningContent } from "@/types/learning";

function duration(seconds: number) { const minutes = Math.round(seconds / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`; }

export function LearningResultsPage() {
  const { contentType = "guided_exercise", id = "" } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<LearningContent | null>(null);
  const type = contentType === "exam" ? "exam" : "guided_exercise";
  const decoded = decodeURIComponent(id);
  const session = readLearningSession(type, decoded);
  useEffect(() => { getLearningContent(type, decoded).then(setContent).catch(() => setContent(null)); }, [type, decoded]);
  const details = useMemo(() => {
    if (!content || !session) return null;
    const exerciseList = content.exercises;
    const questions = exerciseList.flatMap((exercise) => exercise!.questions.map((question) => ({ ...question, exercise: exercise! })));
    const entries = questions.map((question) => ({ question, answer: session.answers[question.id] }));
    const score = entries.reduce((sum, item) => sum + (item.answer?.result?.score ?? 0), 0);
    const max = questions.reduce((sum, item) => sum + item.points, 0);
    const correct = entries.filter((item) => item.answer?.result?.status === "correct");
    const assisted = correct.filter((item) => item.answer!.hints.length > 0);
    const skills = new Map<string, { success: number; total: number }>();
    for (const item of entries) for (const skill of item.question.skills) { const state = skills.get(skill) ?? { success: 0, total: 0 }; state.total++; if (item.answer?.result?.status === "correct") state.success++; skills.set(skill, state); }
    return { exerciseList, entries, score, max, correct: correct.length, assisted: assisted.length, unanswered: entries.filter((item) => !item.answer?.value).length, skills };
  }, [content, session]);

  if (!session) return <PageContainer><AppHeader title="Bilan" backTo="/student/reviser?mode=devoirs" /><EmptyState title="Bilan introuvable" description="Termine ou reprends ce devoir avant de consulter son bilan." /></PageContainer>;
  if (!details) return <PageContainer><div className="card animate-pulse p-8 text-sm text-gray-500">Calcul du bilan pédagogique…</div></PageContainer>;
  const percentage = details.max ? Math.round(details.score / details.max * 100) : 0;
  const score20 = details.max ? (details.score / details.max * 20).toFixed(1).replace(".0", "") : "0";
  const strong = [...details.skills].filter(([, state]) => state.total && state.success / state.total >= .75).map(([skill]) => skill);
  const fragile = [...details.skills].filter(([, state]) => !state.total || state.success / state.total < .75).map(([skill]) => skill);

  return <PageContainer>
    <AppHeader title="Ton bilan" subtitle={type === "exam" ? `Sujet d’examen · ${score20}/20` : "Exercice guidé · analyse personnalisée"} backTo="/student/reviser?mode=devoirs" />
    <section className="overflow-hidden rounded-[24px] bg-gradient-to-br from-[#3c226b] to-revision p-6 text-white shadow-soft sm:p-8"><div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold text-white/70">Score obtenu</p><p className="mt-2 font-title text-5xl font-bold">{details.score.toFixed(1).replace(".0", "")}<span className="text-2xl text-white/60">/{details.max}</span></p>{type === "exam" ? <p className="mt-2 text-lg font-semibold text-secondary">Soit {score20}/20</p> : null}<div className="mt-5 max-w-lg"><ProgressBar value={percentage} /></div><p className="mt-2 text-sm text-white/70">{percentage >= 75 ? "Une base solide. Consolide les notions fragiles pour gagner en autonomie." : "Ce bilan identifie précisément les prochaines étapes utiles."}</p></div><div className="flex h-24 w-24 items-center justify-center rounded-full border-8 border-white/15 bg-white/10 font-title text-2xl font-bold">{percentage}%</div></div></section>
    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard icon={CheckCircle2} label="Réussies" value={details.correct} subtitle={`${details.assisted} avec aide`} /><StatCard icon={Target} label="Sans aide" value={details.correct - details.assisted} /><StatCard icon={AlertTriangle} label="Non traitées" value={details.unanswered} /><StatCard icon={Clock3} label="Temps" value={duration(session.elapsedSeconds)} /></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="card p-5"><h2 className="font-title text-lg font-semibold text-accent">Compétences</h2><div className="mt-4 space-y-4"><SkillGroup title="Maîtrisées" items={strong} positive /><SkillGroup title="À consolider" items={fragile} /></div></section><section className="card p-5"><h2 className="flex items-center gap-2 font-title text-lg font-semibold text-accent"><Sparkles className="h-5 w-5 text-secondary" />Tes prochaines actions</h2><div className="mt-4 space-y-2"><Recommendation icon={Lightbulb} title="Revoir la méthode" description={fragile[0] || "La notion la moins assurée"} onClick={() => navigate(`/student/reviser/devoirs/${type === "exam" ? "examen" : "exercice"}/${encodeURIComponent(decoded)}?session=guided`)} /><Recommendation icon={RotateCcw} title="Reprendre mes erreurs" description="Reviens sur les réponses non validées" onClick={() => navigate(`/student/reviser/devoirs/${type === "exam" ? "examen" : "exercice"}/${encodeURIComponent(decoded)}?session=guided`)} /><Recommendation icon={Target} title="Faire un exercice similaire" description="Même niveau, même matière" onClick={() => navigate("/student/reviser?mode=devoirs")} /></div></section></div>
    <section className="mt-5 space-y-3"><h2 className="font-title text-lg font-semibold text-accent">Correction question par question</h2>{details.entries.map(({ question, answer }, index) => <article key={question.id} className="card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-revision">Question {index + 1} · {question.exercise.title}</p><h3 className="mt-1 font-semibold text-accent">{question.title}</h3></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${answer?.result?.status === "correct" ? "bg-primary/10 text-primary" : !answer?.value ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-800"}`}>{answer?.result?.status === "correct" ? "Réussie" : !answer?.value ? "Non traitée" : "À reprendre"}</span></div><p className="mt-3 text-sm text-gray-500">Ta réponse : <span className="font-medium text-accent">{answer?.value || "—"}</span></p>{answer?.result?.message ? <p className="mt-2 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">{answer.result.message}</p> : null}</article>)}</section>
    <div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => navigate(`/student/reviser/devoirs/${type === "exam" ? "examen" : "exercice"}/${encodeURIComponent(decoded)}?session=guided`)} className="rounded-2xl bg-revision px-4 py-3 text-sm font-semibold text-white">Refaire sans aide</button><button type="button" onClick={() => navigate("/student/reviser?mode=devoirs")} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-accent">Retour aux devoirs</button></div>
  </PageContainer>;
}

function SkillGroup({ title, items, positive = false }: { title: string; items: string[]; positive?: boolean }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p><div className="mt-2 flex flex-wrap gap-2">{items.length ? items.slice(0, 8).map((item) => <span key={item} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${positive ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-800"}`}>{item}</span>) : <span className="text-sm text-gray-400">Pas encore assez de réponses</span>}</div></div>; }
function Recommendation({ icon: Icon, title, description, onClick }: { icon: typeof Target; title: string; description: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 p-3 text-left hover:bg-gray-100"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-revision/10"><Icon className="h-5 w-5 text-revision" /></span><span><span className="block text-sm font-semibold text-accent">{title}</span><span className="block text-xs text-gray-500">{description}</span></span></button>; }
