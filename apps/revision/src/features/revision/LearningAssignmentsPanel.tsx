import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpenCheck, CheckCircle2, ChevronRight, Clock3, GraduationCap, Lock, Play, RotateCcw, Sparkles, Target, Trophy } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ProgressBar } from "@/components/revision/RevisionUI";
import { getLearningDiscovery, getLearningPath, learningSessionScore, readLearningSession } from "@/services/learningService";
import type { UserProfile } from "@/types/roles";
import type { LearningDiscovery, LearningExerciseCard, LearningPath } from "@/types/learning";

type SessionState = "new" | "in_progress" | "completed";

function sessionState(id: string): SessionState {
  const session = readLearningSession("guided_exercise", id);
  if (session?.status === "submitted" || session?.status === "completed") return "completed";
  return session?.status === "in_progress" ? "in_progress" : "new";
}

export function LearningAssignmentsPanel({ profile: _profile }: { profile: UserProfile }) {
  const navigate = useNavigate();
  const [discovery, setDiscovery] = useState<LearningDiscovery | null>(null);
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getLearningDiscovery().then((next) => {
      setDiscovery(next);
      if (next.subjects.length === 1) {
        const onlySubject = next.subjects[0];
        setSubject(onlySubject.label);
        if (onlySubject.chapters.length === 1) setChapter(onlySubject.chapters[0].label);
      }
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Impossible de préparer ton parcours.")).finally(() => setLoading(false));
  }, []);

  const activeSubject = useMemo(() => discovery?.subjects.find((item) => item.label === subject), [discovery, subject]);
  const chapters = activeSubject?.chapters.filter((item) => item.guidedCount > 0) ?? [];

  useEffect(() => {
    if (!subject || !chapter) { setPath(null); return; }
    setLoading(true); setError("");
    getLearningPath(subject, chapter).then(setPath)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Impossible de charger ce parcours."))
      .finally(() => setLoading(false));
  }, [subject, chapter]);

  if (loading && !discovery) return <div className="card animate-pulse p-7 text-sm text-gray-500">Préparation de ton parcours…</div>;
  if (!discovery) return <EmptyState icon={BookOpenCheck} title="Parcours indisponibles" description={error} />;

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-[24px] bg-gradient-to-br from-[#3f236f] via-revision to-[#8b5cf6] p-5 text-white shadow-soft sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-white/60">Apprendre pas à pas</p><h2 className="mt-2 font-title text-2xl font-semibold">Mon parcours</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/75">Cours courts, exercices guidés et évaluation : ta progression est sauvegardée après chaque étape.</p></div>
        <span className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-white/10 sm:flex"><Target className="h-7 w-7 text-secondary" /></span>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <SelectField label="Matière" value={subject} onChange={(value) => { setSubject(value); setChapter(""); }} placeholder="Choisir une matière" options={discovery.subjects.map((item) => item.label)} />
        <SelectField label="Chapitre" value={chapter} onChange={setChapter} placeholder={subject ? "Choisir un chapitre" : "Choisis d’abord une matière"} options={chapters.map((item) => item.label)} disabled={!subject} />
      </div>
    </section>

    <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-gray-500">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm"><GraduationCap className="h-3.5 w-3.5 text-revision" />{discovery.profile.level || "Niveau détecté"}</span>
      {discovery.profile.country ? <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">Programme {discovery.profile.country}</span> : null}
    </div>

    {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{error}</div> : null}
    {loading && discovery ? <div className="card animate-pulse p-7 text-sm text-gray-500">Chargement du chapitre…</div> : null}
    {!loading && path ? <ChapterPath path={path} onOpen={(exercise) => openExercise(navigate, exercise)} /> : null}
    {!loading && !path && !error ? <section className="card border-dashed p-7 text-center"><Sparkles className="mx-auto h-7 w-7 text-revision" /><h3 className="mt-3 font-title text-lg font-semibold text-accent">Choisis ton prochain chapitre</h3><p className="mt-2 text-sm text-gray-500">Tu verras tout le parcours avant de commencer.</p></section> : null}
  </div>;
}

function ChapterPath({ path, onOpen }: { path: LearningPath; onOpen: (exercise: LearningExerciseCard) => void }) {
  const completed = path.sessions.filter((item) => (learningSessionScore(item.id, item.totalPoints) ?? 0) >= path.unlockScore).length;
  const progress = path.sessions.length ? Math.round(completed * 100 / path.sessions.length) : 0;
  const allSessionsComplete = completed === path.sessions.length && path.sessions.length > 0;

  return <div className="space-y-5">
    <section className="card overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 via-white to-revision/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-wide text-revision">{path.subject} · {path.profile.level}</p><h2 className="mt-2 font-title text-2xl font-semibold text-accent">{path.chapter}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">{path.promise || "Progresse à ton rythme grâce à des sessions courtes et guidées."}</p></div>
          <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm"><p className="font-title text-2xl font-bold text-revision">{progress}%</p><p className="text-[11px] text-gray-500">{completed}/{path.sessions.length} sessions</p></div>
        </div>
        <div className="mt-5"><ProgressBar value={progress} /></div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500"><span><Clock3 className="mr-1 inline h-3.5 w-3.5" />Environ {formatDuration(path.durationMinutes)}</span><span>{path.sessions.length} sessions</span><span>Seuil de passage : {path.unlockScore}%</span></div>
      </div>
      {path.diagnostic ? <button type="button" onClick={() => onOpen(path.diagnostic!)} className="flex w-full items-center gap-3 border-t border-gray-100 p-4 text-left hover:bg-gray-50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20 text-amber-700"><Target className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-accent">Test de départ</span><span className="block text-xs text-gray-500">Facultatif · situe tes acquis en quelques minutes</span></span><StateAction state={sessionState(path.diagnostic.id)} /></button> : null}
    </section>

    <section>
      <div className="mb-3 flex items-end justify-between"><div><h3 className="font-title text-lg font-semibold text-accent">Les sessions</h3><p className="text-xs text-gray-500">Obtiens {path.unlockScore}% pour débloquer la suivante.</p></div></div>
      <div className="space-y-3">{path.sessions.map((exercise, index) => {
        const previous = index === 0 ? 100 : learningSessionScore(path.sessions[index - 1].id, path.sessions[index - 1].totalPoints);
        const locked = index > 0 && (previous == null || previous < path.unlockScore);
        return <SessionCard key={exercise.id} exercise={exercise} index={index} locked={locked} onOpen={() => onOpen(exercise)} />;
      })}</div>
    </section>

    {path.evaluation ? <section className={`card overflow-hidden ${allSessionsComplete ? "border-primary/30" : "opacity-75"}`}>
      <div className="flex items-center gap-4 p-5">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${allSessionsComplete ? "bg-primary text-white" : "bg-gray-100 text-gray-400"}`}>{allSessionsComplete ? <Trophy className="h-6 w-6" /> : <Lock className="h-5 w-5" />}</span>
        <span className="min-w-0 flex-1"><span className="block text-xs font-bold uppercase tracking-wide text-primary">Étape finale</span><span className="mt-1 block font-title text-lg font-semibold text-accent">{path.evaluation.title}</span><span className="block text-xs text-gray-500">{path.evaluation.questionCount} questions · {path.evaluation.estimatedMinutes} min</span></span>
        <button type="button" disabled={!allSessionsComplete} onClick={() => onOpen(path.evaluation!)} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:bg-gray-200 disabled:text-gray-400">Commencer</button>
      </div>
    </section> : null}
  </div>;
}

function SessionCard({ exercise, index, locked, onOpen }: { exercise: LearningExerciseCard; index: number; locked: boolean; onOpen: () => void }) {
  const state = sessionState(exercise.id);
  const score = learningSessionScore(exercise.id, exercise.totalPoints);
  const objectives = exercise.metadata.sessionObjectives ?? [];
  return <article className={`card flex items-center gap-3 p-4 sm:p-5 ${locked ? "opacity-60" : ""}`}>
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${state === "completed" ? "bg-primary text-white" : locked ? "bg-gray-100 text-gray-400" : "bg-revision/10 text-revision"}`}>{state === "completed" ? <CheckCircle2 className="h-5 w-5" /> : locked ? <Lock className="h-4 w-4" /> : index + 1}</span>
    <div className="min-w-0 flex-1"><p className="font-semibold text-accent">{exercise.title}</p><p className="mt-1 truncate text-xs text-gray-500">{objectives[0] || exercise.description}</p><div className="mt-2 flex gap-3 text-[11px] text-gray-400"><span>{exercise.estimatedMinutes} min</span><span>{exercise.questionCount} étapes</span>{score != null ? <span className={score >= 60 ? "font-bold text-primary" : "font-bold text-amber-600"}>{score}%</span> : null}</div></div>
    <button type="button" disabled={locked} onClick={onOpen} aria-label={`Ouvrir ${exercise.title}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-revision text-white disabled:bg-gray-100 disabled:text-gray-400">{state === "in_progress" ? <RotateCcw className="h-4 w-4" /> : state === "completed" ? <ChevronRight className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
  </article>;
}

function StateAction({ state }: { state: SessionState }) {
  if (state === "completed") return <span className="text-xs font-bold text-primary">Voir le bilan</span>;
  if (state === "in_progress") return <span className="text-xs font-bold text-revision">Continuer</span>;
  return <ChevronRight className="h-5 w-5 text-gray-300" />;
}

function openExercise(navigate: ReturnType<typeof useNavigate>, exercise: LearningExerciseCard) {
  const state = sessionState(exercise.id);
  navigate(state === "completed" ? `/student/reviser/parcours/resultats/guided_exercise/${encodeURIComponent(exercise.id)}` : `/student/reviser/parcours/session/${encodeURIComponent(exercise.id)}`);
}

function SelectField({ label, value, options, placeholder, disabled, onChange }: { label: string; value: string; options: string[]; placeholder: string; disabled?: boolean; onChange: (value: string) => void }) {
  return <label className="block text-xs font-semibold text-white/75">{label}<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-medium text-accent outline-none disabled:bg-white/60"><option value="">{placeholder}</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} h${rest ? ` ${rest} min` : ""}` : `${rest} min`;
}
