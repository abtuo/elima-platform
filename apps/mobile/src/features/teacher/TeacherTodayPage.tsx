import { useEffect, useMemo, useState } from "react";
import { School, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/common/AppHeader";
import { GeneratedFeatureIcon } from "@/components/common/GeneratedFeatureIcon";
import { GeneratedActionIcon } from "@/components/common/GeneratedActionIcon";
import { AssignmentCard } from "@/components/cards/AssignmentCard";
import { TimetableCard } from "@/components/cards/TimetableCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/revision/RevisionUI";
import { useAuth } from "@/features/auth/AuthProvider";
import { schoolDateKey } from "@/lib/schoolDateTime";
import { getAssignments, getTeacherClasses, getTimetable } from "@/services/mainDataService";
import type { Assignment, ClassInfo, TimetableEvent } from "@/types/school";

export function TeacherTodayPage() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [timetable, setTimetable] = useState<TimetableEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    Promise.all([getTeacherClasses(), getTimetable(14), getAssignments()]).then(([nextClasses, nextTimetable, nextAssignments]) => {
      setClasses(nextClasses);
      setTimetable(nextTimetable);
      setAssignments(nextAssignments);
    });
  }, []);

  const referenceDate = timetable.find((event) => event.referenceDate)?.referenceDate ?? schoolDateKey(new Date());
  const todayEvents = useMemo(() => timetable.filter((event) => schoolDateKey(event.startsAt) === referenceDate), [timetable, referenceDate]);
  const todayAssignments = useMemo(() => assignments.filter((assignment) => assignment.dueDate === referenceDate), [assignments, referenceDate]);
  const studentCount = classes.reduce((sum, klass) => sum + klass.studentCount, 0);

  return (
    <PageContainer>
      <AppHeader title="Aujourd’hui" subtitle={profile.schoolName ?? "Espace professeur"} />
      <section className="mb-5 rounded-[2rem] bg-[#173f31] p-6 text-white shadow-[0_22px_55px_rgba(23,63,49,.18)]">
        <p className="text-sm text-white/60">Bonjour {profile.fullName.split(" ")[0]}</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-title text-2xl font-semibold">Votre journée est prête.</h2><p className="mt-2 text-sm text-white/65">{classes.length} classe{classes.length > 1 ? "s" : ""} · {studentCount} élèves</p></div><Link to="/teacher/classes" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#173f31]"><GeneratedActionIcon name="attendance" className="h-9 w-9" />Commencer l’appel</Link></div>
      </section>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Link to="/teacher/ressources" className="rounded-3xl bg-white p-4 text-sm font-semibold text-accent shadow-sm"><GeneratedFeatureIcon name="publish" className="mb-2 h-11 w-11" />Publier</Link><Link to="/teacher/messages" className="rounded-3xl bg-white p-4 text-sm font-semibold text-accent shadow-sm"><GeneratedFeatureIcon name="messages" className="mb-2 h-11 w-11" />Messages</Link><Link to="/teacher/fournitures" className="rounded-3xl bg-white p-4 text-sm font-semibold text-accent shadow-sm"><GeneratedFeatureIcon name="supplies" className="mb-2 h-11 w-11" />Fournitures</Link><Link to="/teacher/sync" className="rounded-3xl bg-white p-4 text-sm font-semibold text-accent shadow-sm"><GeneratedFeatureIcon name="sync" className="mb-2 h-11 w-11" />Synchroniser</Link></div>
      <div className="grid grid-cols-2 gap-3"><StatCard icon={School} label="Classes" value={classes.length} /><StatCard icon={Users} label="Élèves" value={studentCount} /></div>

      <div className="mt-5"><TimetableCard events={todayEvents} title="Cours du jour" maxItems={12} emptyMessage="Aucun cours planifié pour cette journée." /></div>

      {todayAssignments.length ? <section className="mt-5 space-y-3"><div className="flex items-center justify-between"><h2 className="font-title text-lg font-semibold text-accent">Devoirs du jour</h2><Link to="/teacher/devoirs" className="text-sm font-semibold text-primary">Tout voir</Link></div>{todayAssignments.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}</section> : null}
    </PageContainer>
  );
}
