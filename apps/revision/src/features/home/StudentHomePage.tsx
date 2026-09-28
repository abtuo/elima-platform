import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BookOpen, Brain, CheckCircle2, Clock3, Flame, GraduationCap,
  History, RotateCcw, Sparkles, Star, Target, Trophy,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "@/components/common/LoadingState";
import { PageContainer } from "@/components/layout/PageContainer";
import { SubjectIcon } from "@/components/revision/SubjectIcon";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  buildHomeActivities, isNewRevisionAccount, learningHref, quizHref, selectContinueActivity,
  type HomeActivity,
} from "@/features/home/homeModel";
import {
  getAvailableQuizzes,
  getCourseSheets,
  getLearningAttempts,
  getQuizAttempts,
  getRevisionProgress,
} from "@/services/revisionDataService";
import { getSubjectPreferences } from "@/services/subjectPreferencesService";
import { REVISION_SUBJECT_OPTIONS, subjectIdFromLabel } from "@/lib/revisionSubjects";
import type {
  CourseSheet, LearningAttemptSummary, QuizAttemptSummary, QuizItem, RevisionProgress,
} from "@/types/revision";

type HomeData = {
  progress: RevisionProgress;
  attempts: QuizAttemptSummary[];
  learningAttempts: LearningAttemptSummary[];
  sheets: CourseSheet[];
  quizzes: QuizItem[];
  preferredSubjects: string[];
};

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "élève";
}

function relativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Récemment";
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return "Aujourd’hui";
  if (days === -1) return "Hier";
  if (days > -7) return `Il y a ${Math.abs(days)} jours`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date);
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

export function StudentHomePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError("");
    Promise.all([
      getRevisionProgress(profile.id),
      getQuizAttempts(profile.id),
      getLearningAttempts(profile.id),
      getCourseSheets(profile.id),
      getAvailableQuizzes(),
      getSubjectPreferences(profile.id),
    ]).then(([progress, attempts, learningAttempts, sheets, quizzes, preferredSubjects]) => {
      if (active) setData({ progress, attempts, learningAttempts, sheets, quizzes, preferredSubjects });
    }).catch(() => {
      if (active) setError("Impossible de charger ton accueil pour le moment.");
    });
    return () => { active = false; };
  }, [profile.id, reloadKey]);

  const activities = useMemo<HomeActivity[]>(() => {
    if (!data) return [];
    const preferred = (subject?: string) => !data.preferredSubjects.length || !subject || data.preferredSubjects.includes(subjectIdFromLabel(subject));
    return buildHomeActivities(data.attempts.filter(item => preferred(item.subject)), data.learningAttempts.filter(item => preferred(item.subject)), data.sheets.filter(item => preferred(item.subject)));
  }, [data]);

  const subjectSummaries = useMemo(() => {
    if (!data) return [];
    const subjects = new Map<string, { activities: number; scores: number[] }>();
    data.preferredSubjects.forEach((subjectId) => {
      const subject = REVISION_SUBJECT_OPTIONS.find((item) => item.id === subjectId);
      if (subject) subjects.set(subject.label, { activities: 0, scores: [] });
    });
    const add = (subject: string | undefined, score?: number) => {
      if (!subject) return;
      const current = subjects.get(subject) ?? { activities: 0, scores: [] };
      current.activities += 1;
      if (score !== undefined) current.scores.push(score);
      subjects.set(subject, current);
    };
    data.attempts.filter(attempt => !data.preferredSubjects.length || data.preferredSubjects.includes(subjectIdFromLabel(attempt.subject))).forEach((attempt) => add(attempt.subject, attempt.score));
    data.learningAttempts.filter(attempt => !data.preferredSubjects.length || !attempt.subject || data.preferredSubjects.includes(subjectIdFromLabel(attempt.subject))).forEach((attempt) => add(attempt.subject, attempt.score));
    return [...subjects.entries()]
      .map(([subject, summary]) => ({
        subject,
        activities: summary.activities,
        averageScore: summary.scores.length
          ? Math.round(summary.scores.reduce((total, score) => total + score, 0) / summary.scores.length)
          : undefined,
      }))
      .sort((a, b) => b.activities - a.activities)
      .slice(0, 4);
  }, [data]);

  if (!data && !error) return <PageContainer><LoadingState label="Préparation de ton accueil…" /></PageContainer>;

  if (!data) {
    return <PageContainer><section className="card p-6 text-center"><h1 className="font-title text-xl font-semibold text-accent">Accueil indisponible</h1><p className="mt-2 text-sm text-gray-500">{error}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-5 rounded-2xl bg-revision px-5 py-3 text-sm font-semibold text-white">Réessayer</button></section></PageContainer>;
  }

  const { progress, attempts, learningAttempts, sheets, quizzes, preferredSubjects } = data;
  const preferred = (subject?: string) => !preferredSubjects.length || !subject || preferredSubjects.includes(subjectIdFromLabel(subject));
  const preferredAttempts = attempts.filter(attempt => preferred(attempt.subject));
  const preferredLearningAttempts = learningAttempts.filter(attempt => preferred(attempt.subject));
  const preferredSheets = sheets.filter(sheet => preferred(sheet.subject));
  const newAccount = isNewRevisionAccount(progress, attempts, learningAttempts, sheets);
  const weekStart = Date.now() - 7 * 86_400_000;
  const weeklyActivities = activities.filter((activity) => new Date(activity.date).getTime() >= weekStart);
  const weeklySeconds = learningAttempts
    .filter((attempt) => attempt.completedAt && new Date(attempt.completedAt).getTime() >= weekStart)
    .reduce((total, attempt) => total + attempt.elapsedSeconds, 0);
  const inProgress = preferredLearningAttempts.find((attempt) => attempt.status === "in_progress");
  const continueActivity = selectContinueActivity(preferredAttempts, preferredLearningAttempts, preferredSheets);
  const lowScoreQuiz = preferredAttempts.find((attempt) => attempt.score < 70 && quizHref(attempt));
  const discoveryQuiz = quizzes.find(quiz => preferred(quiz.subject));

  return (
    <PageContainer className="max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-semibold text-primary">Ton espace Révision</p><h1 className="mt-1 font-title text-2xl font-bold text-accent sm:text-3xl">Bonjour {firstName(profile.fullName)} 👋</h1><p className="mt-1 text-sm text-gray-500">Continue ta progression.</p></div>
        <button type="button" onClick={() => navigate("/student/reviser")} className="tap hidden items-center gap-2 rounded-2xl bg-revision px-4 py-2.5 text-sm font-semibold text-white sm:flex">Réviser <ArrowRight className="h-4 w-4" /></button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicateurs principaux">
        <MetricCard icon={GraduationCap} label="Niveau" value={progress.level} />
        <MetricCard icon={Star} label="XP" value={progress.xp} />
        <MetricCard icon={Flame} label="Série" value={`${progress.streakDays} j`} />
        <MetricCard icon={CheckCircle2} label="Quiz terminés" value={progress.completedQuizCount} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-5">
          <section className="card border border-revision/10 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-revision"><Target className="h-5 w-5" /><p className="text-xs font-bold uppercase tracking-[.12em]">Continuer ma révision</p></div>
            {continueActivity ? <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center"><SubjectIcon subject={continueActivity.subject} className="h-12 w-12 shrink-0" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-gray-500">{continueActivity.subject}</p><h2 className="mt-1 truncate font-title text-xl font-semibold text-accent">{continueActivity.title}</h2><p className="mt-1 text-sm text-gray-500">{continueActivity.detail}</p></div><button type="button" onClick={() => navigate(continueActivity.href)} className="tap flex items-center justify-center gap-2 rounded-2xl bg-revision px-5 py-3 text-sm font-semibold text-white">Continuer <ArrowRight className="h-4 w-4" /></button></div>
              : <div className="mt-4"><h2 className="font-title text-xl font-semibold text-accent">Commence ta première révision</h2><p className="mt-1 text-sm text-gray-500">Choisis un QCM, un parcours ou une fiche pour démarrer.</p><button type="button" onClick={() => navigate("/student/reviser")} className="tap mt-4 rounded-2xl bg-revision px-5 py-3 text-sm font-semibold text-white">Réviser maintenant</button></div>}
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-title text-lg font-semibold text-accent">Progression cette semaine</h2><p className="mt-1 text-xs text-gray-500">Tes 7 derniers jours</p></div><Trophy className="h-5 w-5 text-primary" /></div>
            <div className="mt-5 flex flex-wrap gap-6"><div><p className="font-title text-3xl font-bold text-accent">{weeklyActivities.length}</p><p className="text-xs text-gray-500">activité{weeklyActivities.length > 1 ? "s" : ""}</p></div>{weeklySeconds > 0 ? <div><p className="font-title text-3xl font-bold text-primary">{formatDuration(weeklySeconds)}</p><p className="text-xs text-gray-500">sur les parcours terminés</p></div> : null}</div>
            {weeklyActivities.length === 0 ? <p className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">Ta prochaine activité lancera ta progression de la semaine.</p> : null}
          </section>

          {!newAccount ? <section>
            <div className="mb-3 flex items-center justify-between"><h2 className="font-title text-lg font-semibold text-accent">Activité récente</h2><History className="h-5 w-5 text-revision" /></div>
            <div className="space-y-3">{activities.slice(0, 5).map((activity) => <ActivityRow key={activity.id} activity={activity} onOpen={activity.href ? () => navigate(activity.href!) : undefined} />)}</div>
          </section> : null}
        </div>

        <div className="space-y-5">
          {subjectSummaries.length ? <section className="card p-5"><h2 className="font-title text-lg font-semibold text-accent">Mes matières</h2><div className="mt-4 space-y-4">{subjectSummaries.map((summary) => <div key={summary.subject} className="flex items-center gap-3"><SubjectIcon subject={summary.subject} className="h-10 w-10 shrink-0" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-accent">{summary.subject}</p><p className="text-xs text-gray-500">{summary.activities} activité{summary.activities > 1 ? "s" : ""}</p></div>{summary.averageScore !== undefined ? <p className={`text-sm font-bold ${summary.averageScore >= 70 ? "text-primary" : "text-amber-600"}`}>{summary.averageScore}%</p> : null}</div>)}</div></section> : null}

          <section className="card p-5">
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-secondary" /><h2 className="font-title text-lg font-semibold text-accent">Pour toi</h2></div>
            <div className="mt-4 space-y-3">
              {inProgress ? <Recommendation icon={Clock3} title="Continuer ton parcours" description={inProgress.title} onClick={() => navigate(learningHref(inProgress))} /> : null}
              {lowScoreQuiz ? <Recommendation icon={RotateCcw} title="Refaire un QCM" description={`${lowScoreQuiz.topic || lowScoreQuiz.subject} · ${lowScoreQuiz.score}%`} onClick={() => navigate(quizHref(lowScoreQuiz)!)} /> : null}
              {!inProgress && !lowScoreQuiz && discoveryQuiz ? <Recommendation icon={Brain} title="Découvrir un QCM" description={`${discoveryQuiz.subject} · ${discoveryQuiz.topic}`} onClick={() => navigate(`/student/reviser/quiz?id=${encodeURIComponent(discoveryQuiz.id)}&subject=${encodeURIComponent(discoveryQuiz.subject)}&topic=${encodeURIComponent(discoveryQuiz.topic)}`)} /> : null}
              {!inProgress && !lowScoreQuiz && !discoveryQuiz ? <Recommendation icon={BookOpen} title="Choisir une activité" description="Explore les QCM, parcours et fiches disponibles." onClick={() => navigate("/student/reviser")} /> : null}
            </div>
          </section>
          <section className="rounded-xl3 border border-revision/10 bg-white p-5"><p className="text-sm font-semibold text-accent">Besoin d’aide sur un devoir ?</p><p className="mt-1 text-xs text-gray-500">Photographie ou importe ton document pour obtenir des explications.</p><button type="button" onClick={() => navigate("/student/reviser?mode=scanner")} className="mt-3 text-sm font-semibold text-revision">Scanner un document →</button></section>
        </div>
      </div>
    </PageContainer>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return <article className="card flex items-center gap-3 p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-revision/10"><Icon className="h-5 w-5 text-revision" /></div><div className="min-w-0"><p className="truncate text-xs text-gray-500">{label}</p><p className="font-title text-xl font-bold text-accent">{value}</p></div></article>;
}

function ActivityRow({ activity, onOpen }: { activity: HomeActivity; onOpen?: () => void }) {
  const content = <><SubjectIcon subject={activity.subject} className="h-10 w-10 shrink-0" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-accent">{activity.title}</span><span className="block truncate text-xs text-gray-500">{activity.subject} · {activity.detail}</span></span><span className="shrink-0 text-[11px] text-gray-400">{relativeDate(activity.date)}</span>{onOpen ? <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" /> : null}</>;
  return onOpen ? <button type="button" onClick={onOpen} className="card tap flex w-full items-center gap-3 p-4 text-left">{content}</button> : <article className="card flex items-center gap-3 p-4">{content}</article>;
}

function Recommendation({ icon: Icon, title, description, onClick }: { icon: LucideIcon; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="tap flex w-full items-center gap-3 rounded-2xl bg-gray-50 p-3 text-left hover:bg-revision/5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-revision shadow-sm"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-accent">{title}</span><span className="block truncate text-xs text-gray-500">{description}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-gray-300" /></button>;
}
