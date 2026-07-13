import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Brain, Dices, Flame, Search, Star } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { QuizCard } from "@/components/cards/QuizCard";
import { RevisionProgressCard } from "@/components/cards/RevisionProgressCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActionCard, StatCard } from "@/components/revision/RevisionUI";
import { useAuth } from "@/features/auth/AuthProvider";
import { getAvailableQuizzes, getCourseSheets, getRevisionProgress, isDailyQuizCompleted, pickQuiz } from "@/services/revisionDataService";
import type { CourseSheet, QuizItem, RevisionProgress } from "@/types/revision";

export function RevisionDashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<RevisionProgress | null>(null);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [sheets, setSheets] = useState<CourseSheet[]>([]);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const [launching, setLaunching] = useState(false);
  const dailyDone = isDailyQuizCompleted(profile.id);

  useEffect(() => { Promise.all([getRevisionProgress(profile.id), getAvailableQuizzes(), getCourseSheets(profile.id)]).then(([nextProgress, nextQuizzes, nextSheets]) => { setProgress(nextProgress); setQuizzes(nextQuizzes); setSheets(nextSheets); }); }, [profile.id]);
  const subjects = useMemo(() => [...new Set(quizzes.map((quiz) => quiz.subject))].sort((a, b) => a.localeCompare(b, "fr")), [quizzes]);
  const suggestions = useMemo(() => quizzes.filter((quiz) => !subject || quiz.subject === subject).slice(0, 4), [quizzes, subject]);

  async function launch(random: boolean) {
    setLaunching(true); setError("");
    const quiz = await pickQuiz({ subject, topic: random ? "" : topic, random });
    setLaunching(false);
    if (!quiz) { setError(topic.trim() ? "Aucun quiz ne correspond encore à ce sujet. Essaie un terme plus court ou lance un quiz aléatoire dans cette matière." : "Aucun quiz disponible pour cette matière."); return; }
    navigate(`/student/reviser/quiz?id=${quiz.id}&subject=${encodeURIComponent(quiz.subject)}`);
  }

  if (!progress) return null;
  return <PageContainer><AppHeader title="Réviser" subtitle="Quiz, fiches et progression" accent="#7C3AED" /><div className="space-y-5"><RevisionProgressCard progress={progress} /><section className="rounded-[2rem] bg-gradient-to-br from-[#5b2da8] to-[#7c3aed] p-5 text-white"><p className="text-xs font-semibold uppercase tracking-wide text-white/60">Nouveau quiz</p><h2 className="mt-2 font-title text-xl font-semibold">Choisis une matière</h2><div className="mt-4 flex gap-2 overflow-x-auto pb-1">{subjects.map((item) => <button key={item} type="button" onClick={() => { setSubject(item === subject ? "" : item); setError(""); }} className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-semibold ${subject === item ? "bg-white text-revision" : "bg-white/10 text-white"}`}>{item}</button>)}</div><div className="mt-4 flex items-center gap-2 rounded-2xl bg-white px-3 text-gray-600"><Search className="h-4 w-4" /><input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Sujet : équations, photosynthèse…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /></div>{error ? <p className="mt-3 rounded-2xl bg-red-500/15 px-3 py-2 text-xs text-white">{error}</p> : null}<div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled={launching} onClick={() => launch(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-3 text-sm font-semibold"><Dices className="h-4 w-4" />Quiz aléatoire</button><button type="button" disabled={launching || !topic.trim()} onClick={() => launch(false)} className="rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-revision disabled:opacity-40">{launching ? "Recherche…" : "Lancer ce sujet"}</button></div></section><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard icon={Star} label="Niveau" value={progress.level} /><StatCard icon={Flame} label="Streak" value={`${progress.streakDays}j`} /><StatCard icon={Brain} label="Quiz" value={progress.completedQuizCount} /><StatCard icon={BookOpen} label="Fiches" value={sheets.length} /></div><div className="grid gap-3 md:grid-cols-2"><ActionCard title="Quiz du jour" subtitle={dailyDone ? "Terminé pour aujourd’hui" : "10 questions rapides"} icon={Brain} colorClass="bg-gradient-to-br from-purple-500 to-purple-700" onClick={() => launch(true)} /><ActionCard title="Mes fiches" subtitle={`${sheets.length} fiche${sheets.length > 1 ? "s" : ""} disponible${sheets.length > 1 ? "s" : ""}`} icon={BookOpen} colorClass="bg-gradient-to-br from-blue-500 to-blue-700" onClick={() => navigate("/student/reviser/fiches")} /></div><section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-title text-lg font-semibold text-accent">{subject ? `Quiz · ${subject}` : "Quiz populaires"}</h2><span className="text-xs text-gray-400">{quizzes.length} disponibles</span></div>{suggestions.map((quiz) => <div key={quiz.id} onClick={() => navigate(`/student/reviser/quiz?id=${quiz.id}&subject=${encodeURIComponent(quiz.subject)}`)} className="cursor-pointer"><QuizCard quiz={quiz} /></div>)}</section></div></PageContainer>;
}
