import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Award, BookOpenCheck, ChevronRight, Clock3, GraduationCap, RefreshCw, Sparkles, Target } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ProgressBar } from "@/components/revision/RevisionUI";
import { getLearningDiscovery, readLearningSession, suggestLearningContent } from "@/services/learningService";
import type { UserProfile } from "@/types/roles";
import type { ExamSubject, LearningDiscovery, LearningExerciseCard, LearningSession, LearningSuggestion } from "@/types/learning";

type ContentKind = "guided_exercise" | "exam";

function sessionStatus(type: LearningSession["contentType"], id: string) {
  const session = readLearningSession(type, id);
  if (session?.status === "submitted" || session?.status === "completed") return "completed";
  return session?.status === "in_progress" ? "in_progress" : "new";
}

export function LearningAssignmentsPanel({ profile: _profile }: { profile: UserProfile }) {
  const navigate = useNavigate();
  const [discovery, setDiscovery] = useState<LearningDiscovery | null>(null);
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [kind, setKind] = useState<ContentKind>("guided_exercise");
  const [suggestion, setSuggestion] = useState<LearningSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getLearningDiscovery().then((next) => {
      setDiscovery(next);
      if (next.subjects.length === 1) setSubject(next.subjects[0].label);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Impossible de préparer les devoirs."));
  }, []);

  const activeSubject = useMemo(() => discovery?.subjects.find((item) => item.label === subject), [discovery, subject]);
  const examEnabled = Boolean(discovery?.profile.isExamLevel && activeSubject?.examCount);
  const availableChapters = useMemo(() => (activeSubject?.chapters ?? []).filter((item) => kind === "exam" ? item.examCount > 0 : item.guidedCount > 0), [activeSubject, kind]);

  useEffect(() => { setChapter(""); setSuggestion(null); setError(""); }, [subject]);
  useEffect(() => { setChapter(""); setSuggestion(null); setError(""); }, [kind]);
  useEffect(() => { setSuggestion(null); setError(""); }, [chapter]);
  useEffect(() => { if (kind === "exam" && !examEnabled) setKind("guided_exercise"); }, [examEnabled, kind]);

  async function findContent() {
    if (!subject || !chapter) return;
    setLoading(true); setError(""); setSuggestion(null);
    try { setSuggestion(await suggestLearningContent({ kind, subject, chapter })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Aucun contenu disponible pour cette sélection."); }
    finally { setLoading(false); }
  }

  if (!discovery && !error) return <div className="card animate-pulse p-7 text-sm text-gray-500">Préparation de ton parcours…</div>;
  if (!discovery) return <EmptyState icon={BookOpenCheck} title="Devoirs indisponibles" description={error} />;

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-[24px] bg-gradient-to-br from-[#3f236f] via-revision to-[#8b5cf6] p-5 text-white shadow-soft sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-white/60">Parcours ciblé</p><h2 className="mt-2 font-title text-2xl font-semibold">Que veux-tu travailler ?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/75">Choisis une matière et un chapitre. Elima charge ensuite un seul exercice ou sujet adapté à ton niveau.</p></div><span className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-white/10 sm:flex"><Target className="h-7 w-7 text-secondary" /></span></div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <SelectField label="Matière" value={subject} onChange={setSubject} placeholder="Choisir une matière" options={discovery.subjects.map((item) => item.label)} />
        <SelectField label="Chapitre" value={chapter} onChange={setChapter} placeholder={subject ? "Choisir un chapitre" : "Choisis d’abord une matière"} options={availableChapters.map((item) => item.label)} disabled={!subject} />
      </div>
      <div className={`mt-4 grid ${examEnabled ? "grid-cols-2" : "grid-cols-1"} gap-2 rounded-2xl bg-black/10 p-1.5`} role="tablist" aria-label="Type de devoir">
        <KindButton active={kind === "guided_exercise"} onClick={() => setKind("guided_exercise")} icon={BookOpenCheck} title="Exercice guidé" subtitle="Feedback et indices" />
        {examEnabled ? <KindButton active={kind === "exam"} onClick={() => setKind("exam")} icon={Award} title="Sujet d’examen" subtitle="Mode examen ou accompagné" /> : null}
      </div>
      <button type="button" onClick={findContent} disabled={!subject || !chapter || loading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-revision shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40">{loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? "Recherche dans ton programme…" : kind === "exam" ? "Trouver un sujet d’examen" : "Me proposer un exercice"}</button>
    </section>

    <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-gray-500"><span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm"><GraduationCap className="h-3.5 w-3.5 text-revision" />{discovery.profile.level || "Niveau détecté"}</span>{discovery.profile.country ? <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">Programme {discovery.profile.country}</span> : null}{discovery.profile.isExamLevel ? <span className="rounded-full bg-primary/10 px-3 py-1.5 font-semibold text-primary">Classe d’examen</span> : null}</div>
    {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{error}</div> : null}
    {suggestion?.exercise ? <ExerciseSuggestion exercise={suggestion.exercise} onOpen={() => openExercise(navigate, suggestion.exercise!)} onRefresh={findContent} /> : null}
    {suggestion?.exam ? <ExamSuggestion exam={suggestion.exam} onOpen={(mode) => navigate(`/student/reviser/devoirs/examen/${encodeURIComponent(suggestion.exam!.id)}?session=${mode}`)} onRefresh={findContent} /> : null}
    {!suggestion && !error ? <section className="card border-dashed p-7 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-revision/10"><Sparkles className="h-6 w-6 text-revision" /></div><h3 className="mt-4 font-title text-lg font-semibold text-accent">Une proposition, au bon moment</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">Aucune liste interminable : le contenu complet n’est récupéré qu’après ta sélection.</p></section> : null}
  </div>;
}

function openExercise(navigate: ReturnType<typeof useNavigate>, exercise: LearningExerciseCard) {
  const status = sessionStatus("guided_exercise", exercise.id);
  navigate(status === "completed" ? `/student/reviser/devoirs/resultats/guided_exercise/${encodeURIComponent(exercise.id)}` : `/student/reviser/devoirs/exercice/${encodeURIComponent(exercise.id)}`);
}

function SelectField({ label, value, options, placeholder, disabled, onChange }: { label: string; value: string; options: string[]; placeholder: string; disabled?: boolean; onChange: (value: string) => void }) {
  return <label className="block text-xs font-semibold text-white/75">{label}<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-medium text-accent outline-none disabled:bg-white/60"><option value="">{placeholder}</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function KindButton({ active, onClick, icon: Icon, title, subtitle }: { active: boolean; onClick: () => void; icon: typeof Award; title: string; subtitle: string }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active ? "bg-white text-revision shadow-sm" : "text-white/75 hover:bg-white/10"}`}><Icon className="h-5 w-5 shrink-0" /><span><span className="block text-sm font-bold">{title}</span><span className={`block text-[11px] ${active ? "text-gray-400" : "text-white/50"}`}>{subtitle}</span></span></button>;
}

function ExerciseSuggestion({ exercise, onOpen, onRefresh }: { exercise: LearningExerciseCard; onOpen: () => void; onRefresh: () => void }) {
  const status = sessionStatus("guided_exercise", exercise.id);
  return <article className="card overflow-hidden"><div className="grid md:grid-cols-[1fr_auto]"><div className="p-5 sm:p-6"><div className="flex flex-wrap gap-2"><Badge>{exercise.subject}</Badge><Badge>{exercise.chapter}</Badge><Badge>{exercise.difficulty}</Badge></div><h3 className="mt-4 font-title text-xl font-semibold text-accent">{exercise.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{exercise.description}</p><div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500"><span><Clock3 className="mr-1 inline h-3.5 w-3.5" />{exercise.estimatedMinutes} min</span><span>{exercise.questionCount} questions</span><span>{exercise.totalPoints} points</span></div>{status !== "new" ? <div className="mt-4 max-w-sm"><ProgressBar value={status === "completed" ? 100 : 35} /></div> : null}</div><div className="flex min-w-56 flex-col justify-center gap-2 border-t bg-gray-50 p-5 md:border-l md:border-t-0"><button type="button" onClick={onOpen} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-revision px-4 py-3 text-sm font-bold text-white">{status === "in_progress" ? "Continuer" : status === "completed" ? "Voir le bilan" : "Commencer"}<ChevronRight className="h-4 w-4" /></button><button type="button" onClick={onRefresh} className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold text-gray-500"><RefreshCw className="h-3.5 w-3.5" />Une autre proposition</button></div></div></article>;
}

function ExamSuggestion({ exam, onOpen, onRefresh }: { exam: ExamSubject; onOpen: (mode: "exam" | "guided") => void; onRefresh: () => void }) {
  return <article className="card overflow-hidden"><div className="bg-gradient-to-r from-accent to-revision p-5 text-white sm:p-6"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Sujet officiel · {exam.year}</span><Award className="h-6 w-6 text-secondary" /></div><h3 className="mt-4 font-title text-xl font-semibold">{exam.title}</h3><p className="mt-2 text-sm text-white/70">{exam.level} · {exam.subject} · {Math.floor(exam.durationMinutes / 60)} h</p></div><div className="grid gap-2 p-5 sm:grid-cols-[1fr_1fr_auto]"><button type="button" onClick={() => onOpen("exam")} className="rounded-2xl bg-revision px-4 py-3 text-sm font-bold text-white">Conditions d’examen</button><button type="button" onClick={() => onOpen("guided")} className="rounded-2xl border border-revision/20 bg-revision/5 px-4 py-3 text-sm font-bold text-revision">Entraînement accompagné</button><button type="button" onClick={onRefresh} aria-label="Autre sujet" className="flex items-center justify-center rounded-2xl px-4 py-3 text-gray-400"><RefreshCw className="h-4 w-4" /></button></div></article>;
}

function Badge({ children }: { children: ReactNode }) { return <span className="rounded-full bg-revision/10 px-2.5 py-1 text-[11px] font-bold text-revision">{children}</span>; }
