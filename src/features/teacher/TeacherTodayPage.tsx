import { useEffect, useState } from "react";
import { Calendar, Users, ClipboardList } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/revision/RevisionUI";
import { ElimaCard } from "@/components/common/ElimaCard";
import { useAuth } from "@/features/auth/AuthProvider";
import { getTeacherClasses, getTimetable } from "@/services/mainDataService";
import type { ClassInfo, TimetableEvent } from "@/types/school";
import { TimetableCard } from "@/components/cards/TimetableCard";
import { Link } from "react-router-dom";
import { ArrowRight, FolderUp, MessageCircle, PackageOpen, Wifi } from "lucide-react";

export function TeacherTodayPage() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [timetable, setTimetable] = useState<TimetableEvent[]>([]);

  useEffect(() => { getTeacherClasses().then(setClasses); getTimetable().then(setTimetable); }, []);

  return (
    <PageContainer>
      <AppHeader title="Aujourd'hui" subtitle={profile.schoolName ?? "Espace professeur"} />
      <section className="mb-5 rounded-[2rem] bg-[#173f31] p-6 text-white shadow-[0_22px_55px_rgba(23,63,49,.18)]"><p className="text-sm text-white/60">Bonjour {profile.fullName.split(" ")[0]}</p><div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-title text-2xl font-semibold">Votre journée est prête.</h2><p className="mt-2 text-sm text-white/65">{classes.length} cours planifiés · listes disponibles hors ligne</p></div><Link to="/teacher/classes" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#173f31]">Commencer l’appel <ArrowRight className="h-4 w-4" /></Link></div></section>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Link to="/teacher/ressources" className="rounded-3xl bg-white p-4 text-sm font-semibold text-accent shadow-sm"><FolderUp className="mb-3 h-5 w-5 text-primary" />Publier</Link><Link to="/teacher/messages" className="rounded-3xl bg-white p-4 text-sm font-semibold text-accent shadow-sm"><MessageCircle className="mb-3 h-5 w-5 text-primary" />Messages</Link><Link to="/teacher/fournitures" className="rounded-3xl bg-white p-4 text-sm font-semibold text-accent shadow-sm"><PackageOpen className="mb-3 h-5 w-5 text-primary" />Fournitures</Link><Link to="/teacher/sync" className="rounded-3xl bg-white p-4 text-sm font-semibold text-accent shadow-sm"><Wifi className="mb-3 h-5 w-5 text-primary" />Synchroniser</Link></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard icon={Calendar} label="Cours" value={classes.length} />
        <StatCard icon={Users} label="Élèves" value={classes.reduce((s, c) => s + c.studentCount, 0)} />
        <StatCard icon={ClipboardList} label="Classes" value={classes.length} />
      </div>
      <div className="mt-5"><TimetableCard events={timetable} title="Mon emploi du temps" /></div>
      <section className="mt-5 space-y-3">
        <h2 className="font-title text-lg font-semibold text-accent">Cours du jour</h2>
        {classes.map((c) => (
          <ElimaCard key={c.id}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-title text-base font-semibold text-accent">{c.name}</h3>
                <p className="text-sm text-gray-500">{c.subject} · {c.studentCount} élèves</p>
              </div>
              {c.time ? <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{c.time}</span> : null}
            </div>
          </ElimaCard>
        ))}
      </section>
    </PageContainer>
  );
}
