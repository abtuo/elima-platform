"use client";

import Link from "next/link";
import {
  Bell,
  BookMarked,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  MessageSquare,
  NotebookPen,
  PenLine,
  Users,
} from "lucide-react";
import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { ActionCard } from "@/components/ui/ActionCard";
import { Timeline } from "@/components/ui/Timeline";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useTeacherContext } from "./TeacherContext";

const courseSlots = ["08:00", "10:00", "14:00", "16:00"];

export default function TeacherOverviewPage() {
  const { classes, subjects, students, assignments, loading } = useTeacherContext();

  const todayCourses = assignments.slice(0, 4).map((a, idx) => ({
    time: courseSlots[idx] ?? "08:00",
    title: `${a.subjectName} - ${a.className}`,
    description: idx === 0 ? "Cours du jour - appel a faire" : "Cours du jour",
    right:
      idx === 0 ? (
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            href="/teacher/attendance"
          >
            Appel
          </Link>
          <Link
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            href="/teacher/grades"
          >
            Notes
          </Link>
        </div>
      ) : undefined,
  }));

  const homeworkToFollow = assignments.slice(0, 3).map((a, idx) => ({
    id: `${a.classId}-${a.subjectId}-${idx}`,
    title: idx === 0 ? "Copies a corriger" : idx === 1 ? "Devoir a suivre" : "Controle a preparer",
    detail: `${a.subjectName} - ${a.className}`,
    tone: idx === 0 ? "rose" : idx === 1 ? "amber" : "slate",
  }));

  const recentGrades = assignments.slice(0, 3).map((a, idx) => ({
    id: `${a.classId}-${a.subjectId}-grade-${idx}`,
    label: `${a.subjectName} - ${a.className}`,
    detail: idx === 0 ? "12 notes ajoutees aujourd'hui" : idx === 1 ? "Evaluation en cours de saisie" : "Moyennes a verifier",
  }));

  const watchStudents = students.slice(0, 4).map((student, idx) => ({
    ...student,
    reason: idx % 2 === 0 ? "Moyenne en baisse" : "Absences recentes",
  }));

  const attendanceClasses = classes.slice(0, 3);
  const announcements = [
    {
      id: "planning",
      title: "Conseil pedagogique",
      detail: "Verifier les notes avant la cloture du trimestre.",
    },
    {
      id: "parents",
      title: "Messages parents",
      detail: "Repondre aux demandes prioritaires de la semaine.",
    },
  ];

  return (
    <div className="space-y-4">
      <ProgressHeader
        title="Vue d'ensemble"
        subtitle="Vos classes, cours du jour et actions importantes au meme endroit."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Mes classes"
          value={loading ? "..." : classes.length}
          trend="neutral"
          trendLabel={classes.length ? "Classes assignees" : "En attente"}
          icon={<Users size={20} />}
        />
        <StatCard
          title="Mes matieres"
          value={loading ? "..." : subjects.length}
          trend="neutral"
          trendLabel={subjects.length ? "Matieres actives" : "Aucune matiere"}
          icon={<BookOpen size={20} />}
        />
        <StatCard
          title="Cours du jour"
          value={todayCourses.length}
          trend={todayCourses.length ? "up" : "neutral"}
          trendLabel={todayCourses.length ? "Planning pret" : "Aucun cours"}
          icon={<CalendarDays size={20} />}
          status="success"
        />
        <StatCard
          title="Eleves suivis"
          value={students.length}
          trend="neutral"
          trendLabel="Dans vos classes"
          icon={<GraduationCap size={20} />}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ActionCard href="/teacher/attendance" title="Faire l'appel" description="Presence par classe" icon={<ClipboardCheck size={18} />} />
        <ActionCard href="/teacher/grades" title="Saisir des notes" description="Evaluations et moyennes" icon={<FileText size={18} />} />
        <ActionCard href="/teacher/homework" title="Ajouter un devoir" description="Travail a rendre" icon={<BookMarked size={18} />} />
        <ActionCard href="/teacher/lessons" title="Cahier de textes" description="Resume du cours" icon={<NotebookPen size={18} />} />
        <ActionCard href="/teacher/memo" title="Message classe" description="Memo et suivi" icon={<MessageSquare size={18} />} />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <DashboardSection title="Cours du jour" subtitle="Prochaines heures et actions directes">
            {todayCourses.length ? (
              <Timeline items={todayCourses} />
            ) : (
              <EmptyState title="Aucun cours aujourd'hui" description="Les cours apparaissent des qu'une assignation est disponible." />
            )}
          </DashboardSection>

          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardSection title="Mes classes" subtitle="Classes rattachees a votre profil">
              {classes.length ? (
                <div className="space-y-2">
                  {classes.map((c) => {
                    const count = students.filter((s) => s.classId === c.id).length;
                    return (
                      <div key={c.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-800">{c.name}</p>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                            {count} eleve(s)
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{c.level} - {c.academicYear}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="Aucune classe assignee" description="Les classes apparaitront apres affectation par l'administration." />
              )}
            </DashboardSection>

            <DashboardSection title="Mes matieres" subtitle="Matieres enseignees">
              {subjects.length ? (
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <span key={s.id} className="rounded-full bg-[var(--secondary)]/25 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                      {s.name}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyState title="Aucune matiere" description="Les matieres apparaitront apres configuration." />
              )}
            </DashboardSection>
          </div>

          <DashboardSection title="Notes recemment ajoutees" subtitle="Suivi rapide des saisies">
            {recentGrades.length ? (
              <ul className="space-y-2">
                {recentGrades.map((grade) => (
                  <li key={grade.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{grade.label}</p>
                      <p className="text-xs text-slate-500">{grade.detail}</p>
                    </div>
                    <PenLine size={16} className="shrink-0 text-[var(--primary)]" />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Aucune note recente" description="Les dernieres saisies seront listees ici." />
            )}
          </DashboardSection>
        </div>

        <div className="space-y-4">
          <DashboardSection title="Appel / absences" subtitle="Classes a verifier aujourd'hui">
            {attendanceClasses.length ? (
              <div className="space-y-2">
                {attendanceClasses.map((c, idx) => (
                  <Link
                    key={c.id}
                    href="/teacher/attendance"
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-sm hover:bg-slate-100"
                  >
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    <span className={idx === 0 ? "font-semibold text-rose-600" : "font-semibold text-emerald-700"}>
                      {idx === 0 ? "A saisir" : "A verifier"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="Aucune classe" description="L'appel sera disponible apres affectation." />
            )}
          </DashboardSection>

          <DashboardSection title="Devoirs a suivre" subtitle="Corrections et travaux">
            {homeworkToFollow.length ? (
              <div className="space-y-2">
                {homeworkToFollow.map((homework) => (
                  <div key={homework.id} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                    <p className="text-sm font-semibold text-slate-800">{homework.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{homework.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Aucun devoir a suivre" description="Les devoirs crees apparaitront ici." />
            )}
          </DashboardSection>

          <DashboardSection title="Eleves a surveiller" subtitle="Signaux scolaires simples">
            {watchStudents.length ? (
              <div className="space-y-2">
                {watchStudents.map((student) => (
                  <div key={student.id} className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2.5">
                    <p className="text-sm font-semibold text-slate-800">{student.fullName}</p>
                    <p className="text-xs text-slate-600">{student.className} - {student.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Aucun signal" description="Les eleves a surveiller apparaitront selon les donnees." />
            )}
          </DashboardSection>

          <DashboardSection title="Messages importants" subtitle="Annonces et rappels">
            <div className="space-y-2">
              {announcements.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-[var(--primary)]" />
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </DashboardSection>
        </div>
      </div>
    </div>
  );
}
