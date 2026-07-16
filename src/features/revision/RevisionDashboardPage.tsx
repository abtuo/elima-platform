import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Brain, Flame, Search, Star } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { GeneratedActionIcon } from "@/components/common/GeneratedActionIcon";
import { GeneratedFeatureIcon } from "@/components/common/GeneratedFeatureIcon";
import { QuizCard } from "@/components/cards/QuizCard";
import { RevisionProgressCard } from "@/components/cards/RevisionProgressCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { SubjectIcon } from "@/components/revision/SubjectIcon";
import { ActionCard, StatCard } from "@/components/revision/RevisionUI";
import { useAuth } from "@/features/auth/AuthProvider";
import { REVISION_SUBJECT_OPTIONS } from "@/lib/revisionSubjects";
import {
  generateRealtimeQuiz,
  generateRealtimeSheet,
  getAvailableQuizzes,
  getCourseSheets,
  getRevisionProgress,
  getStudentRevisionLevel,
  isDailyQuizCompleted,
  pickQuiz,
} from "@/services/revisionDataService";
import type { CourseSheet, QuizItem, RevisionProgress } from "@/types/revision";

export function RevisionDashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<RevisionProgress | null>(null);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [sheets, setSheets] = useState<CourseSheet[]>([]);
  const [level, setLevel] = useState("Collège / lycée");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const [launching, setLaunching] = useState<"random" | "quiz" | "sheet" | null>(null);
  const dailyDone = isDailyQuizCompleted(profile.id);

  useEffect(() => {
    Promise.all([
      getRevisionProgress(profile.id),
      getAvailableQuizzes(),
      getCourseSheets(profile.id),
      getStudentRevisionLevel(profile.id),
    ]).then(([nextProgress, nextQuizzes, nextSheets, nextLevel]) => {
      setProgress(nextProgress);
      setQuizzes(nextQuizzes);
      setSheets(nextSheets);
      setLevel(nextLevel);
    });
  }, [profile.id]);

  const subjectLabels = useMemo(() => {
    const known = REVISION_SUBJECT_OPTIONS.map((item) => item.label);
    const fromDatabase = quizzes.map((quiz) => quiz.subject).filter((item) => !known.some((knownItem) => knownItem.toLocaleLowerCase("fr") === item.toLocaleLowerCase("fr")));
    return [...known, ...new Set(fromDatabase)].sort((a, b) => a.localeCompare(b, "fr"));
  }, [quizzes]);

  const suggestions = useMemo(() => quizzes.filter((quiz) => !subject || quiz.subject === subject).slice(0, 4), [quizzes, subject]);

  async function launchRandomQuiz() {
    setLaunching("random");
    setError("");
    try {
      const quiz = await pickQuiz({ subject, random: true });
      if (!quiz) throw new Error(subject ? "Aucun quiz disponible pour cette matière." : "Aucun quiz aléatoire n’est disponible.");
      navigate(`/student/reviser/quiz?id=${encodeURIComponent(quiz.id)}&subject=${encodeURIComponent(quiz.subject)}`);
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

  if (!progress) return null;

  return (
    <PageContainer>
      <AppHeader title="Réviser" subtitle="Quiz, fiches et progression" accent="#7C3AED" />
      <div className="space-y-5">
        <RevisionProgressCard progress={progress} />

        <section className="rounded-[2rem] bg-gradient-to-br from-[#5b2da8] to-[#7c3aed] p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Génération en temps réel</p>
              <h2 className="mt-2 font-title text-xl font-semibold">Crée ta révision</h2>
              <p className="mt-1 text-xs text-white/70">Niveau détecté : {level}</p>
            </div>
            <GeneratedFeatureIcon name="revision" className="h-20 w-20 shrink-0 drop-shadow-lg sm:h-24 sm:w-24" />
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-semibold text-white/80">Matière obligatoire pour une génération ciblée</span>
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3 text-gray-700">
              {subject ? <SubjectIcon subject={subject} className="h-8 w-8 rounded-lg" /> : <BookOpen className="h-4 w-4 text-gray-400" />}
              <select value={subject} onChange={(event) => { setSubject(event.target.value); setError(""); }} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none">
                <option value="">Choisir une matière…</option>
                {subjectLabels.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </label>

          <label className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-3 text-gray-600">
            <Search className="h-4 w-4 shrink-0" />
            <input value={topic} onChange={(event) => { setTopic(event.target.value); setError(""); }} placeholder="Sujet : équations, photosynthèse…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />
          </label>

          {error ? <p className="mt-3 rounded-2xl bg-red-500/20 px-3 py-2 text-xs text-white">{error}</p> : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button type="button" disabled={Boolean(launching)} onClick={launchRandomQuiz} className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold disabled:opacity-50"><GeneratedActionIcon name="randomQuiz" className="h-8 w-8" />{launching === "random" ? "Chargement…" : "Quiz aléatoire"}</button>
            <button type="button" disabled={Boolean(launching) || !subject || !topic.trim()} onClick={launchSpecificQuiz} className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-revision disabled:opacity-40"><GeneratedActionIcon name="generateQuiz" className="h-8 w-8" />{launching === "quiz" ? "Génération…" : "Générer le quiz"}</button>
            <button type="button" disabled={Boolean(launching) || !subject || !topic.trim()} onClick={createSheet} className="flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold disabled:opacity-40"><GeneratedActionIcon name="generateSheet" className="h-8 w-8" />{launching === "sheet" ? "Génération…" : "Créer une fiche"}</button>
          </div>
          {launching === "quiz" || launching === "sheet" ? <p className="mt-3 text-center text-xs text-white/70">L’IA prépare le contenu. Cela peut prendre quelques secondes.</p> : null}
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={Star} label="Niveau" value={progress.level} />
          <StatCard icon={Flame} label="Série" value={`${progress.streakDays}j`} />
          <StatCard icon={Brain} label="Quiz" value={progress.completedQuizCount} />
          <StatCard icon={BookOpen} label="Fiches" value={sheets.length} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ActionCard title="Quiz du jour" subtitle={dailyDone ? "Terminé pour aujourd’hui" : "10 questions rapides"} icon={Brain} colorClass="bg-gradient-to-br from-purple-500 to-purple-700" onClick={launchRandomQuiz} />
          <ActionCard title="Mes fiches" subtitle={`${sheets.length} fiche${sheets.length > 1 ? "s" : ""} disponible${sheets.length > 1 ? "s" : ""}`} icon={BookOpen} colorClass="bg-gradient-to-br from-blue-500 to-blue-700" onClick={() => navigate("/student/reviser/fiches")} />
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-title text-lg font-semibold text-accent">{subject ? `Quiz · ${subject}` : "Quiz populaires"}</h2></div>
          {suggestions.map((quiz) => <button type="button" key={quiz.id} onClick={() => navigate(`/student/reviser/quiz?id=${encodeURIComponent(quiz.id)}&subject=${encodeURIComponent(quiz.subject)}`)} className="block w-full text-left"><QuizCard quiz={quiz} /></button>)}
        </section>
      </div>
    </PageContainer>
  );
}
