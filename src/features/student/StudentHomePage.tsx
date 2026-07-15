import { useEffect, useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { GradeSummaryCard } from "@/components/cards/GradeSummaryCard";
import { AssignmentCard } from "@/components/cards/AssignmentCard";
import { WebLinkButton } from "@/components/common/WebLinkButton";
import { useAuth } from "@/features/auth/AuthProvider";
import { getRecentGrades, getAssignments, getTimetable } from "@/services/mainDataService";
import type { GradeSummary, Assignment, TimetableEvent } from "@/types/school";
import { TimetableCard } from "@/components/cards/TimetableCard";
import { Link } from "react-router-dom";
import { ArrowRight, Brain, Flame, ScanLine, Sparkles, UserRound } from "lucide-react";
import { getRevisionProgress } from "@/services/revisionDataService";
import type { RevisionProgress } from "@/types/revision";

export function StudentHomePage() {
  const { profile } = useAuth();
  const [grades, setGrades] = useState<GradeSummary[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [progress, setProgress] = useState<RevisionProgress | null>(null);
  const [timetable, setTimetable] = useState<TimetableEvent[]>([]);

  useEffect(() => {
    getRecentGrades(profile.id).then(setGrades);
    getAssignments().then(setAssignments);
    getRevisionProgress(profile.id).then(setProgress);
    getTimetable().then(setTimetable);
  }, [profile.id]);

  return (
    <PageContainer>
      <AppHeader title={`Bonjour, ${profile.fullName.split(" ")[0]}`} subtitle="Tableau de bord scolaire" accent="#7C3AED" action={<Link to="/student/profil" aria-label="Mon profil" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-revision shadow-sm"><UserRound className="h-5 w-5" /></Link>} />
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#5b2da8] to-[#7c3aed] p-6 text-white shadow-[0_24px_60px_rgba(124,58,237,.22)]">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
          <div className="relative"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5 text-secondary" /> Programme du jour</span><h2 className="mt-4 font-title text-2xl font-semibold">Garde ton rythme, {profile.fullName.split(" ")[0]}</h2><p className="mt-2 max-w-md text-sm leading-6 text-white/70">Un quiz de 10 minutes suffit pour consolider tes acquis.</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/student/reviser/quiz" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#5b2da8]">Commencer le quiz <ArrowRight className="h-4 w-4" /></Link><Link to="/student/documents" className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold"><ScanLine className="h-4 w-4" /> Ajouter un document</Link></div></div>
        </section>
        <div className="grid grid-cols-3 gap-3"><div className="rounded-3xl bg-white p-4 shadow-sm"><Flame className="h-5 w-5 text-orange-500" /><p className="mt-2 text-xl font-bold text-accent">{progress?.streakDays ?? 0} j</p><p className="text-[11px] text-gray-500">Série</p></div><div className="rounded-3xl bg-white p-4 shadow-sm"><Brain className="h-5 w-5 text-revision" /><p className="mt-2 text-xl font-bold text-accent">Niv. {progress?.level ?? 1}</p><p className="text-[11px] text-gray-500">Progression</p></div><div className="rounded-3xl bg-white p-4 shadow-sm"><Sparkles className="h-5 w-5 text-amber-500" /><p className="mt-2 text-xl font-bold text-accent">{progress?.xp ?? 0}</p><p className="text-[11px] text-gray-500">XP</p></div></div>
        <TimetableCard events={timetable} />
        <section className="space-y-3">
          <h2 className="font-title text-lg font-semibold text-accent">Notes récentes</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {grades.slice(0, 3).map((g) => <GradeSummaryCard key={g.id} grade={g} />)}
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="font-title text-lg font-semibold text-accent">Devoirs à faire</h2>
          {assignments.filter((a) => a.status === "pending").slice(0, 2).map((a) => (
            <AssignmentCard key={a.id} assignment={a} />
          ))}
        </section>
        <WebLinkButton path="/student/reports" label="Consulter mes bulletins" />
      </div>
    </PageContainer>
  );
}
