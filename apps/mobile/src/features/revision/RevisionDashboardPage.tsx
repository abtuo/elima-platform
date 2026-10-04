import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, Brain, CalendarClock, ChevronRight, Flame, History, Search, Sparkles, Star } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { GeneratedActionIcon } from "@/components/common/GeneratedActionIcon";
import { GeneratedFeatureIcon } from "@/components/common/GeneratedFeatureIcon";
import { QuizCard } from "@/components/cards/QuizCard";
import { RevisionProgressCard } from "@/components/cards/RevisionProgressCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { SubjectIcon } from "@/components/revision/SubjectIcon";
import { ActionCard, StatCard } from "@/components/revision/RevisionUI";
import { useAuth } from "@/features/auth/AuthProvider";
import { LearningAssignmentsPanel } from "@/features/revision/LearningAssignmentsPanel";
import { REVISION_SUBJECT_OPTIONS, subjectIdFromLabel } from "@/lib/revisionSubjects";
import {getSubjectPreferences} from '@/services/subjectPreferencesService';
import {
  generateRealtimeQuiz,
  generateRealtimeSheet,
  getAvailableQuizzes,
  getCourseSheets,
  getQuizAttempts,
  getRevisionProgress,
  getStudentRevisionLevel,
  isDailyQuizCompleted,
  pickQuiz,
} from "@/services/revisionDataService";
import type { CourseSheet, QuizAttemptSummary, QuizItem, RevisionProgress } from "@/types/revision";

type RevisionMode = "qcm" | "parcours" | "fiches";

const MODES: Array<{ id: RevisionMode; label: string; icon: typeof Brain }> = [
  { id: "qcm", label: "QCM", icon: Brain },
  { id: "parcours", label: "Parcours", icon: CalendarClock },
  { id: "fiches", label: "Fiches", icon: BookOpen },
];

function revisionMode(value: string | null): RevisionMode {
  if (value === "devoirs" || value === "examens" || value === "examen") return "parcours";
  return value === "parcours" || value === "fiches" ? value : "qcm";
}

function formatHistoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function RevisionDashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = revisionMode(searchParams.get("mode"));
  const [progress, setProgress] = useState<RevisionProgress | null>(null);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [sheets, setSheets] = useState<CourseSheet[]>([]);
  const [level, setLevel] = useState("Collège / lycée");
  const [subject, setSubject] = useState("");
  const [preferredSubjects,setPreferredSubjects]=useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const [launching, setLaunching] = useState<"random" | "quiz" | "sheet" | null>(null);
  const dailyDone = isDailyQuizCompleted(profile.id);

  useEffect(() => {
    getSubjectPreferences(profile.id).then(setPreferredSubjects).catch(()=>undefined);
    Promise.all([
      getRevisionProgress(profile.id),
      getAvailableQuizzes(),
      getQuizAttempts(profile.id),
      getCourseSheets(profile.id),
      getStudentRevisionLevel(profile.id),
    ]).then(([nextProgress, nextQuizzes, nextAttempts, nextSheets, nextLevel]) => {
      setProgress(nextProgress);
      setQuizzes(nextQuizzes);
      setAttempts(nextAttempts);
      setSheets(nextSheets);
      setLevel(profile.schoolLevelId || profile.className || nextLevel);
    }).catch(()=>setError('Données Révision indisponibles. Réessaie.'));
  }, [profile.id]);

  const subjectLabels = useMemo(() => {
    const known = REVISION_SUBJECT_OPTIONS.map((item) => item.label);
    const fromDatabase = quizzes.map((quiz) => quiz.subject).filter((item) => !known.some((knownItem) => knownItem.toLocaleLowerCase("fr") === item.toLocaleLowerCase("fr")));
    return [...known, ...new Set(fromDatabase)].filter(label=>!preferredSubjects.length||preferredSubjects.includes(subjectIdFromLabel(label))).sort((a, b) => a.localeCompare(b, "fr"));
  }, [quizzes,preferredSubjects]);

  const suggestions = useMemo(() => quizzes.filter((quiz) => !subject || quiz.subject === subject).slice(0, 4), [quizzes, subject]);

  function selectMode(nextMode: RevisionMode) {
    setError("");
    setSearchParams(nextMode === "qcm" ? {} : { mode: nextMode });
  }

  async function launchRandomQuiz() {
    setLaunching("random");
    setError("");
    try {
      const quiz = await pickQuiz({ subject, random: true });
      if (!quiz) throw new Error(subject ? "Aucun quiz disponible pour cette matière." : "Aucun quiz aléatoire n’est disponible.");
      navigate(`/student/reviser/quiz?id=${encodeURIComponent(quiz.id)}&subject=${encodeURIComponent(quiz.subject)}&topic=${encodeURIComponent(quiz.topic)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de lancer le quiz.");
    } finally {
      setLaunching(null);
    }
  }

  async function launchSpecificQuiz() {
    if (!subject) { setError("Choisis obligatoirement une matière pour générer un quiz spécifique."); return; }
    if (!topic.trim()) { setError("Indique le sujet du quiz."); return; }
    setLaunching("quiz");
    setError("");
    try {
      const generated = await generateRealtimeQuiz({ subject, topic: topic.trim(), level }, `${profile.id}|${crypto.randomUUID()}`);
      navigate(`/student/reviser/quiz?id=${encodeURIComponent(generated.id)}&subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic.trim())}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La génération du quiz a échoué.");
    } finally {
      setLaunching(null);
    }
  }

  async function createSheet() {
    if (!subject) { setError("Choisis obligatoirement une matière pour générer une fiche."); return; }
    if (!topic.trim()) { setError("Indique le sujet de la fiche."); return; }
    setLaunching("sheet");
    setError("");
    try {
      const sheet = await generateRealtimeSheet({ subject, topic: topic.trim(), level }, profile.id);
      navigate(`/student/reviser/fiches/${encodeURIComponent(sheet.id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La génération de la fiche a échoué.");
    } finally {
      setLaunching(null);
    }
  }

  function replayAttempt(attempt: QuizAttemptSummary) {
    if (!attempt.quizRef || attempt.quizRef.startsWith("generated:")) return;
    const params = new URLSearchParams({ id: attempt.quizRef, subject: attempt.subject });
    if (attempt.topic) params.set("topic", attempt.topic);
    navigate(`/student/reviser/quiz?${params.toString()}`);
  }

  if (!progress) return null;

  return (
    <PageContainer><div className="mb-4 flex gap-4 text-sm font-semibold text-revision"><Link to="/student/documents">Scanner / documents</Link><Link to="/student/reviser/compte">Mes matières et abonnement</Link></div>
      <AppHeader title="Réviser" subtitle="QCM, parcours et fiches de révision" accent="#7C3AED" />

      <div className="mb-5 grid grid-cols-3 rounded-2xl bg-gray-100 p-1" role="tablist" aria-label="Modes de révision">
        {MODES.map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;
          return <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => selectMode(item.id)} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition sm:text-sm ${active ? "bg-white text-revision shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><Icon className="h-4 w-4" />{item.label}</button>;
        })}
      </div>

      {mode === "qcm" ? (
        <div className="space-y-5">
          <RevisionProgressCard progress={progress} />

          <GenerationPanel subject={subject} topic={topic} subjectLabels={subjectLabels} error={error} level={level} launching={launching} onSubjectChange={(value) => { setSubject(value); setError(""); }} onTopicChange={(value) => { setTopic(value); setError(""); }}>
            <button type="button" disabled={Boolean(launching)} onClick={launchRandomQuiz} className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 text-sm font-semibold disabled:opacity-50"><GeneratedActionIcon name="randomQuiz" className="h-8 w-8" />{launching === "random" ? "Chargement…" : "Quiz aléatoire"}</button>
            <button type="button" disabled={Boolean(launching) || !subject || !topic.trim()} onClick={launchSpecificQuiz} className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-sm font-semibold text-revision disabled:opacity-40"><GeneratedActionIcon name="generateQuiz" className="h-8 w-8" />{launching === "quiz" ? "Génération…" : "Générer le quiz"}</button>
          </GenerationPanel>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={Star} label="Niveau" value={progress.level} />
            <StatCard icon={Flame} label="Série" value={`${progress.streakDays}j`} />
            <StatCard icon={Brain} label="Quiz" value={progress.completedQuizCount} />
            <StatCard icon={BookOpen} label="Fiches" value={sheets.length} />
          </div>

          <ActionCard title="Quiz du jour" subtitle={dailyDone ? "Terminé pour aujourd’hui" : "10 questions rapides"} icon={Brain} colorClass="bg-gradient-to-br from-purple-500 to-purple-700" onClick={launchRandomQuiz} />

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-title text-lg font-semibold text-accent">Historique des QCM</h2><p className="text-xs text-gray-500">Tes derniers résultats</p></div><History className="h-5 w-5 text-revision" /></div>
            {attempts.length ? attempts.map((attempt) => {
              const replayable = Boolean(attempt.quizRef && !attempt.quizRef.startsWith("generated:"));
              return <article key={attempt.id} className="card flex items-center gap-3 p-4">
                <SubjectIcon subject={attempt.subject} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-accent">{attempt.topic || attempt.subject}</p><p className="truncate text-xs text-gray-500">{attempt.subject} · {formatHistoryDate(attempt.completedAt)}</p>{attempt.totalQuestions ? <p className="mt-1 text-[11px] text-gray-400">{attempt.correctAnswers ?? Math.round(attempt.totalQuestions * attempt.score / 100)}/{attempt.totalQuestions} bonnes réponses</p> : null}</div>
                <div className="text-right"><p className={`font-title text-lg font-bold ${attempt.score >= 70 ? "text-primary" : attempt.score >= 50 ? "text-amber-600" : "text-red-500"}`}>{attempt.score}%</p>{replayable ? <button type="button" onClick={() => replayAttempt(attempt)} className="mt-1 text-[11px] font-semibold text-revision">Rejouer</button> : null}</div>
              </article>;
            }) : <EmptyState icon={History} title="Aucun QCM terminé" description="Tes résultats apparaîtront ici après ton premier quiz." />}
          </section>

          <section className="space-y-3">
            <h2 className="font-title text-lg font-semibold text-accent">{subject ? `QCM · ${subject}` : "QCM populaires"}</h2>
            {suggestions.map((quiz) => <button type="button" key={quiz.id} onClick={() => navigate(`/student/reviser/quiz?id=${encodeURIComponent(quiz.id)}&subject=${encodeURIComponent(quiz.subject)}&topic=${encodeURIComponent(quiz.topic)}`)} className="block w-full text-left"><QuizCard quiz={quiz} /></button>)}
          </section>
        </div>
      ) : null}

      {mode === "fiches" ? (
        <div className="space-y-5">
          <GenerationPanel subject={subject} topic={topic} subjectLabels={subjectLabels} error={error} level={level} launching={launching} title="Crée ta fiche" description="Choisis une matière et indique précisément le chapitre à résumer." onSubjectChange={(value) => { setSubject(value); setError(""); }} onTopicChange={(value) => { setTopic(value); setError(""); }}>
            <button type="button" disabled={Boolean(launching) || !subject || !topic.trim()} onClick={createSheet} className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-revision disabled:opacity-40"><GeneratedActionIcon name="generateSheet" className="h-8 w-8" />{launching === "sheet" ? "Génération…" : "Générer la fiche"}</button>
          </GenerationPanel>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-title text-lg font-semibold text-accent">Mes fiches</h2><p className="text-xs text-gray-500">Historique de tes fiches générées</p></div><span className="rounded-full bg-revision/10 px-3 py-1 text-xs font-bold text-revision">{sheets.length}</span></div>
            {sheets.length ? sheets.map((sheet) => <button key={sheet.id} type="button" onClick={() => navigate(`/student/reviser/fiches/${encodeURIComponent(sheet.id)}`)} className="card tap flex w-full items-center gap-3 p-4 text-left"><SubjectIcon subject={sheet.subject} /><span className="min-w-0 flex-1"><span className="block truncate text-xs text-gray-500">{sheet.subject}</span><span className="block truncate font-title text-base font-semibold text-accent">{sheet.title}</span><span className="mt-1 block text-xs text-gray-400">Créée le {formatHistoryDate(sheet.createdAt)}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-gray-300" /></button>) : <EmptyState icon={BookOpen} title="Aucune fiche" description="Choisis une matière et un sujet pour générer ta première fiche." />}
          </section>
        </div>
      ) : null}

      {mode === "parcours" ? <LearningAssignmentsPanel profile={profile} /> : null}
    </PageContainer>
  );
}

type GenerationPanelProps = {
  subject: string;
  topic: string;
  subjectLabels: string[];
  error: string;
  level: string;
  launching: "random" | "quiz" | "sheet" | null;
  title?: string;
  description?: string;
  onSubjectChange: (value: string) => void;
  onTopicChange: (value: string) => void;
  children: React.ReactNode;
};

function GenerationPanel({ subject, topic, subjectLabels, error, level, launching, title = "Crée ton QCM", description = "Lance un quiz aléatoire ou génère un QCM sur un sujet précis.", onSubjectChange, onTopicChange, children }: GenerationPanelProps) {
  return <section className="rounded-[2rem] bg-gradient-to-br from-[#5b2da8] to-[#7c3aed] p-5 text-white">
    <div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/60"><Sparkles className="h-3.5 w-3.5" />Génération en temps réel</p><h2 className="mt-2 font-title text-xl font-semibold">{title}</h2><p className="mt-1 max-w-md text-xs leading-5 text-white/70">{description}</p><p className="mt-1 text-[11px] text-white/50">Niveau détecté : {level}</p></div><GeneratedFeatureIcon name="revision" className="h-20 w-20 shrink-0 drop-shadow-lg sm:h-24 sm:w-24" /></div>
    <label className="mt-5 block"><span className="mb-2 block text-xs font-semibold text-white/80">Matière</span><div className="flex items-center gap-2 rounded-2xl bg-white px-3 text-gray-700">{subject ? <SubjectIcon subject={subject} className="h-8 w-8 rounded-lg" /> : <BookOpen className="h-4 w-4 text-gray-400" />}<select value={subject} onChange={(event) => onSubjectChange(event.target.value)} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"><option value="">Choisir une matière…</option>{subjectLabels.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></label>
    <label className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-3 text-gray-600"><Search className="h-4 w-4 shrink-0" /><input value={topic} onChange={(event) => onTopicChange(event.target.value)} placeholder="Sujet : équations, photosynthèse…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /></label>
    {error ? <p className="mt-3 rounded-2xl bg-red-500/20 px-3 py-2 text-xs text-white">{error}</p> : null}
    <div className="mt-4 grid gap-2 sm:grid-cols-2">{children}</div>
    {launching === "quiz" || launching === "sheet" ? <p className="mt-3 text-center text-xs text-white/70">L’IA prépare le contenu. Cela peut prendre quelques secondes.</p> : null}
  </section>;
}
