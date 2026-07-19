import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpenCheck, Building2, CheckCircle2, GraduationCap, KeyRound, Lock, LogOut, Save, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/common/AppHeader";
import { GeneratedFeatureIcon } from "@/components/common/GeneratedFeatureIcon";
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
import { isStandaloneStudent } from "@/types/roles";
import { activateStudentSchoolCode, updateStandaloneStudentProfile } from "@/services/studentAccountService";
import { STUDENT_CLASS_OPTIONS } from "@/constants/studentClasses";

type Tab = "grades" | "quiz" | "averages";

const barStyles = {
  grades: "from-emerald-300 via-emerald-500 to-emerald-700",
  quiz: "from-violet-300 via-violet-500 to-violet-700",
  averages: "from-sky-300 via-blue-500 to-indigo-700",
} as const;

export function StudentProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const standalone = isStandaloneStudent(profile);
  const [tab, setTab] = useState<Tab>(standalone ? "quiz" : "grades");
  const [grades, setGrades] = useState<GradeSummary[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [progress, setProgress] = useState<RevisionProgress | null>(null);
  const [schoolName, setSchoolName] = useState(profile.declaredSchoolName ?? "");
  const [schoolCity, setSchoolCity] = useState(profile.declaredSchoolCity ?? "");
  const [level, setLevel] = useState(profile.schoolLevelId ?? "");
  const [activationCode, setActivationCode] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const displayedClass = standalone ? level || "Non renseignée" : profile.className || profile.schoolLevelId || "Non renseignée";

  useEffect(() => {
    Promise.all([standalone ? Promise.resolve([]) : getRecentGrades(profile.id), getQuizAttempts(profile.id), getRevisionProgress(profile.id)]).then(([nextGrades, nextAttempts, nextProgress]) => {
      setGrades(nextGrades);
      setAttempts(nextAttempts);
      setProgress(nextProgress);
    });
  }, [profile.id, standalone]);

  async function saveDeclaredSchool() {
    setAccountLoading(true); setAccountError(""); setAccountMessage("");
    try {
      await updateStandaloneStudentProfile({ schoolLevelId: level, declaredSchoolName: schoolName, declaredSchoolCity: schoolCity });
      await refreshProfile();
      setAccountMessage("Profil enregistré.");
    } catch (error) { setAccountError(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setAccountLoading(false); }
  }

  async function activateSchool() {
    setAccountLoading(true); setAccountError(""); setAccountMessage("");
    try {
      const result = await activateStudentSchoolCode(activationCode);
      await refreshProfile();
      setAccountMessage(`Compte rattaché à ${result.school_name}. Les services scolaires sont maintenant disponibles.`);
      setActivationCode("");
    } catch (error) { setAccountError(error instanceof Error ? error.message : "Activation impossible."); }
    finally { setAccountLoading(false); }
  }

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
      <AppHeader title="Mon profil" subtitle="Résultats scolaires et révisions" accent="#7C3AED" action={<GeneratedFeatureIcon name="profile" className="h-14 w-14" />} />

      <ElimaCard>
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt={`Photo de ${profile.fullName}`} className="h-14 w-14 rounded-2xl bg-gray-100 object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-revision/10 text-xl font-bold text-revision">{profile.fullName.charAt(0)}</span>}
          <div className="min-w-0"><p className="truncate font-title text-lg font-semibold text-accent">{profile.fullName}</p><p className="truncate text-sm text-gray-500">{profile.schoolName || "Compte Révision indépendant"}</p><p className="mt-1 flex items-center gap-1 text-xs font-semibold text-revision"><GraduationCap className="h-3.5 w-3.5" />{displayedClass}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ProfileMetric value={progress?.completedQuizCount ?? 0} label="Quiz" />
          <ProfileMetric value={`${progress?.averageScore ?? 0}%`} label="Performance" />
          <ProfileMetric value={progress?.xp ?? 0} label="XP" />
        </div>
      </ElimaCard>

      <ElimaCard className="mt-5">
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${standalone ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{standalone ? <Building2 className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</span>
          <div><h2 className="font-title text-lg font-semibold text-accent">{standalone ? "Compte Révision" : "Compte rattaché"}</h2><p className="mt-1 text-xs leading-5 text-gray-500">{standalone ? "Tu utilises Elima indépendamment. Le nom renseigné ci-dessous ne donne aucun accès aux données d’une école." : `Ton compte est associé à ${profile.schoolName}.`}</p></div>
        </div>
        {standalone ? <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><ProfileInput label="Nom de mon école (facultatif)" value={schoolName} onChange={setSchoolName} /><ProfileInput label="Ville" value={schoolCity} onChange={setSchoolCity} /><ProfileClassSelect value={level} onChange={setLevel} /></div>
          <button type="button" disabled={accountLoading} onClick={saveDeclaredSchool} className="flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-accent disabled:opacity-50"><Save className="h-4 w-4" /> Enregistrer mon profil</button>
          <div className="border-t border-gray-100 pt-4"><div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold text-accent">Mon école utilise Elima</h3></div><p className="mt-1 text-xs leading-5 text-gray-500">Saisis le code individuel remis par ton établissement pour obtenir ton planning, tes notes, tes devoirs et tes messages.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={activationCode} onChange={(event) => setActivationCode(event.target.value.toUpperCase())} placeholder="EX. A1B2-C3D4" className="min-w-0 flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold uppercase tracking-wider outline-none focus:border-primary" /><button type="button" disabled={accountLoading || activationCode.replace(/[^A-Z0-9]/g, "").length < 6} onClick={activateSchool} className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Activer</button></div></div>
          {accountMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{accountMessage}</p> : null}{accountError ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{accountError}</p> : null}
        </div> : <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-gray-500">Classe</p><p className="mt-1 font-title text-base font-semibold text-accent">{displayedClass}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm"><Lock className="h-4 w-4" /></span></div><p className="mt-2 text-xs leading-5 text-gray-400">Cette classe est renseignée et gérée par ton établissement.</p></div>}
      </ElimaCard>

      <div className={`my-5 grid ${standalone ? "grid-cols-1" : "grid-cols-3"} rounded-2xl bg-gray-100 p-1`}>
        {([{ id: "grades", label: "Notes" }, { id: "quiz", label: "Quiz" }, { id: "averages", label: "Moyennes" }] as const).filter((item) => !standalone || item.id === "quiz").map((item) => (
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

function ProfileInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary" /></label>;
}

function ProfileClassSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options: readonly string[] = value && !STUDENT_CLASS_OPTIONS.includes(value as (typeof STUDENT_CLASS_OPTIONS)[number]) ? [value, ...STUDENT_CLASS_OPTIONS] : STUDENT_CLASS_OPTIONS;
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-gray-600">Classe / niveau</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"><option value="">Choisir ma classe</option>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>;
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
