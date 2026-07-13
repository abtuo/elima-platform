import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpenCheck, Brain, LogOut, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/common/AppHeader";
import { ElimaCard } from "@/components/common/ElimaCard";
import { EmptyState } from "@/components/common/EmptyState";
import { GradeSummaryCard } from "@/components/cards/GradeSummaryCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/features/auth/AuthProvider";
import { getRecentGrades } from "@/services/mainDataService";
import { getQuizAttempts, getRevisionProgress } from "@/services/revisionDataService";
import type { QuizAttemptSummary, RevisionProgress } from "@/types/revision";
import type { GradeSummary } from "@/types/school";

type Tab = "grades" | "quiz" | "averages";

export function StudentProfilePage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("grades");
  const [grades, setGrades] = useState<GradeSummary[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [progress, setProgress] = useState<RevisionProgress | null>(null);
  useEffect(() => { Promise.all([getRecentGrades(profile.id), getQuizAttempts(profile.id), getRevisionProgress(profile.id)]).then(([nextGrades, nextAttempts, nextProgress]) => { setGrades(nextGrades); setAttempts(nextAttempts); setProgress(nextProgress); }); }, [profile.id]);
  const averages = useMemo(() => Object.entries(grades.reduce<Record<string, number[]>>((result, grade) => { (result[grade.subject] ??= []).push((grade.score / grade.maxScore) * 20); return result; }, {})).map(([subject, values]) => ({ subject, value: values.reduce((sum, value) => sum + value, 0) / values.length })).sort((a, b) => b.value - a.value), [grades]);

  return <PageContainer><AppHeader title="Mon parcours" subtitle="Scolaire et révisions" accent="#7C3AED" /><ElimaCard><div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-revision/10 text-xl font-bold text-revision">{profile.fullName.charAt(0)}</span><div><p className="font-title text-lg font-semibold text-accent">{profile.fullName}</p><p className="text-sm text-gray-500">{profile.schoolName}</p></div></div><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-2xl bg-gray-50 p-3 text-center"><p className="font-bold text-accent">{progress?.completedQuizCount ?? 0}</p><p className="text-[10px] text-gray-500">Quiz</p></div><div className="rounded-2xl bg-gray-50 p-3 text-center"><p className="font-bold text-accent">{progress?.averageScore ?? 0}%</p><p className="text-[10px] text-gray-500">Performance</p></div><div className="rounded-2xl bg-gray-50 p-3 text-center"><p className="font-bold text-accent">{progress?.xp ?? 0}</p><p className="text-[10px] text-gray-500">XP</p></div></div></ElimaCard><div className="my-5 grid grid-cols-3 rounded-2xl bg-gray-100 p-1">{([{ id: "grades", label: "Notes" }, { id: "quiz", label: "Quiz" }, { id: "averages", label: "Moyennes" }] as const).map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-xl px-2 py-2.5 text-xs font-semibold ${tab === item.id ? "bg-white text-revision shadow-sm" : "text-gray-500"}`}>{item.label}</button>)}</div>{tab === "grades" ? <section className="space-y-3">{grades.length ? grades.map((grade) => <GradeSummaryCard key={grade.id} grade={grade} />) : <EmptyState icon={BookOpenCheck} title="Aucune note publiée" />}</section> : null}{tab === "quiz" ? <section className="space-y-3">{attempts.length ? attempts.map((attempt) => <article key={attempt.id} className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-revision/10"><Brain className="h-5 w-5 text-revision" /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold text-accent">{attempt.subject}</p><p className="text-xs text-gray-500">{new Date(attempt.completedAt).toLocaleDateString("fr-FR")}</p></div><span className="font-bold text-revision">{attempt.score}%</span></article>) : <EmptyState icon={Trophy} title="Aucun quiz terminé" description="Tes prochaines performances apparaîtront ici." />}</section> : null}{tab === "averages" ? <section className="space-y-3">{averages.length ? averages.map((average) => <article key={average.subject} className="rounded-3xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="font-semibold text-accent">{average.subject}</span><span className="font-bold text-primary">{average.value.toFixed(1)}/20</span></div><div className="mt-3 h-2 rounded-full bg-gray-100"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, average.value * 5)}%` }} /></div></article>) : <EmptyState icon={BarChart3} title="Pas encore de moyenne" />}</section> : null}<button type="button" onClick={async () => { await signOut(); navigate("/auth/login", { replace: true }); }} className="tap mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600"><LogOut className="h-4 w-4" /> Se déconnecter</button></PageContainer>;
}
