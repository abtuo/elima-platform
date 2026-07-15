import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpenCheck, LogOut, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/common/AppHeader";
import { ElimaCard } from "@/components/common/ElimaCard";
import { EmptyState } from "@/components/common/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { SubjectIcon } from "@/components/revision/SubjectIcon";
import { useAuth } from "@/features/auth/AuthProvider";
import { getRevisionSubject } from "@/lib/revisionSubjects";
import { getRecentGrades } from "@/services/mainDataService";
import { getQuizAttempts, getRevisionProgress } from "@/services/revisionDataService";
import type { QuizAttemptSummary, RevisionProgress } from "@/types/revision";
import type { GradeSummary } from "@/types/school";

type Tab = "grades" | "quiz" | "averages";

const barStyles = {
  grades: "from-emerald-300 via-emerald-500 to-emerald-700",
  quiz: "from-violet-300 via-violet-500 to-violet-700",
  averages: "from-sky-300 via-blue-500 to-indigo-700",
} as const;

export function StudentProfilePage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("grades");
  const [grades, setGrades] = useState<GradeSummary[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [progress, setProgress] = useState<RevisionProgress | null>(null);

  useEffect(() => {
    Promise.all([getRecentGrades(profile.id), getQuizAttempts(profile.id), getRevisionProgress(profile.id)]).then(([nextGrades, nextAttempts, nextProgress]) => {
      setGrades(nextGrades);
      setAttempts(nextAttempts);
      setProgress(nextProgress);
    });
  }, [profile.id]);

  const averages = useMemo(() => Object.entries(
    grades.reduce<Record<string, number[]>>((result, grade) => {
      (result[grade.subject] ??= []).push((grade.score / grade.maxScore) * 20);
      return result;
    }, {}),
  ).map(([subject, values]) => ({
    subject,
    value: values.reduce((sum, value) => sum + value, 0) / values.length,
    count: values.length,
  })).sort((a, b) => b.value - a.value), [grades]);

  return (
    <PageContainer>
      <AppHeader title="Mon profil" subtitle="Résultats scolaires et révisions" accent="#7C3AED" />

      <ElimaCard>
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-revision/10 text-xl font-bold text-revision">{profile.fullName.charAt(0)}</span>
          <div className="min-w-0"><p className="truncate font-title text-lg font-semibold text-accent">{profile.fullName}</p><p className="truncate text-sm text-gray-500">{profile.schoolName}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ProfileMetric value={progress?.completedQuizCount ?? 0} label="Quiz" />
          <ProfileMetric value={`${progress?.averageScore ?? 0}%`} label="Performance" />
          <ProfileMetric value={progress?.xp ?? 0} label="XP" />
        </div>
      </ElimaCard>

      <div className="my-5 grid grid-cols-3 rounded-2xl bg-gray-100 p-1">
        {([{ id: "grades", label: "Notes" }, { id: "quiz", label: "Quiz" }, { id: "averages", label: "Moyennes" }] as const).map((item) => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`rounded-xl px-2 py-2.5 text-xs font-semibold ${tab === item.id ? "bg-white text-revision shadow-sm" : "text-gray-500"}`}>{item.label}</button>
        ))}
      </div>

      {tab === "grades" ? (
        <section className="space-y-3">
          {grades.length ? grades.map((grade) => (
            <PerformanceCard
              key={grade.id}
              title={formatEvaluationType(grade.title, grade.subject)}
              subject={grade.subject}
              meta={formatDate(grade.date)}
              value={`${grade.score}/${grade.maxScore}`}
              percent={(grade.score / grade.maxScore) * 100}
              gradient={barStyles.grades}
            />
          )) : <EmptyState icon={BookOpenCheck} title="Aucune note publiée" />}
        </section>
      ) : null}

      {tab === "quiz" ? (
        <section className="space-y-3">
          {attempts.length ? attempts.map((attempt) => (
            <PerformanceCard
              key={attempt.id}
              title="Quiz"
              subject={attempt.subject}
              meta={formatDate(attempt.completedAt)}
              value={`${attempt.score}%`}
              percent={attempt.score}
              gradient={barStyles.quiz}
            />
          )) : <EmptyState icon={Trophy} title="Aucun quiz terminé" description="Tes prochaines performances apparaîtront ici." />}
        </section>
      ) : null}

      {tab === "averages" ? (
        <section className="space-y-3">
          {averages.length ? averages.map((average) => (
            <PerformanceCard
              key={average.subject}
              title="Moyenne"
              subject={average.subject}
              meta={`${average.count} évaluation${average.count > 1 ? "s" : ""}`}
              value={`${average.value.toFixed(1)}/20`}
              percent={average.value * 5}
              gradient={barStyles.averages}
            />
          )) : <EmptyState icon={BarChart3} title="Pas encore de moyenne" />}
        </section>
      ) : null}

      <button type="button" onClick={async () => { await signOut(); navigate("/auth/login", { replace: true }); }} className="tap mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600"><LogOut className="h-4 w-4" /> Se déconnecter</button>
    </PageContainer>
  );
}

function PerformanceCard({ title, subject, meta, value, percent, gradient }: {
  title: string;
  subject: string;
  meta: string;
  value: string;
  percent: number;
  gradient: string;
}) {
  const subjectConfig = getRevisionSubject(subject);
  return (
    <article className="overflow-hidden rounded-3xl border border-white bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <SubjectIcon subject={subject} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-title text-sm font-semibold text-accent sm:text-base">{title}</h3>
          <p className={`truncate text-xs font-medium ${subjectConfig.color}`}>{subject}</p>
          <p className="mt-0.5 truncate text-[11px] text-gray-400">{meta}</p>
        </div>
        <span className="shrink-0 font-title text-lg font-bold text-accent">{value}</span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-100 shadow-inner">
        <div className={`relative h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}>
          <span className="absolute inset-x-1 top-px h-px rounded-full bg-white/45" />
        </div>
      </div>
    </article>
  );
}

function ProfileMetric({ value, label }: { value: string | number; label: string }) {
  return <div className="rounded-2xl bg-gray-50 p-3 text-center"><p className="font-bold text-accent">{value}</p><p className="text-[10px] text-gray-500">{label}</p></div>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatEvaluationType(title: string, subject: string) {
  let result = title
    .replace(/[\s·—–,:;()\-]*r[ée]f[ée]rence\s*N\s*[-–—]?\s*1[\s·—–,:;()\-]*/gi, " ")
    .replace(/["“”]/g, " ");

  const subjectId = getRevisionSubject(subject).id;
  const subjectPatterns: Record<string, RegExp> = {
    maths: /math[ée]matique?s?/gi,
    francais: /fran[çc]ais/gi,
    anglais: /anglais/gi,
    espagnol: /espagnol/gi,
    svt: /\bSVT\b/gi,
    "physique-chimie": /physique(?:\s*[-–—]\s*chimie)?|chimie/gi,
    "histoire-geographie": /histoire(?:\s*[-–—]\s*g[ée]ographie)?|g[ée]ographie/gi,
    philosophie: /philosophie/gi,
    ses: /\bSES\b|sciences?\s+[ée]conomiques?(?:\s+et\s+sociales?)?/gi,
    informatique: /informatique|\bNSI\b/gi,
    eps: /\bEPS\b/gi,
    arts: /arts?\s*(?:plastiques?)?/gi,
  };
  result = result.replace(subjectPatterns[subjectId] ?? new RegExp(escapeRegExp(subject), "gi"), " ");
  result = result.replace(/^[\s·—–,:;()\-]+|[\s·—–,:;()\-]+$/g, "").replace(/\s{2,}/g, " ").trim();
  return result || "Évaluation";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
