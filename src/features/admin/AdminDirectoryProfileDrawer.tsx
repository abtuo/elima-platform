import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Mail,
  Phone,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { LoadingState } from "@/components/common/LoadingState";
import { getStudentAdminProfile } from "@/services/mainDataService";
import type { StudentAdminProfile, StudentDirectoryItem, TeacherDirectoryItem } from "@/types/school";
import { formatEvaluationTitle } from "@/lib/evaluationLabels";

export type DirectorySelection =
  | { kind: "student"; person: StudentDirectoryItem }
  | { kind: "teacher"; person: TeacherDirectoryItem };

export function AdminDirectoryProfileDrawer({ selection, onClose }: { selection: DirectorySelection | null; onClose: () => void }) {
  const [studentProfile, setStudentProfile] = useState<StudentAdminProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selection || selection.kind !== "student") {
      setStudentProfile(null);
      return;
    }

    let active = true;
    setLoading(true);
    getStudentAdminProfile(selection.person.id)
      .then((profile) => {
        if (active) setStudentProfile(profile);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selection]);

  useEffect(() => {
    if (!selection) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selection]);

  useEffect(() => {
    if (!selection) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, selection]);

  if (!selection) return null;
  const person = selection.person;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button type="button" className="absolute inset-0 bg-accent/35 backdrop-blur-[2px]" onClick={onClose} aria-label="Fermer la fiche" />
      <aside
        className="relative z-10 h-[100dvh] max-h-[100dvh] w-full max-w-xl touch-pan-y overflow-y-auto overscroll-contain bg-background shadow-2xl"
        style={{ WebkitOverflowScrolling: "touch" }}
        aria-label={`Profil de ${person.name}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0 pr-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{selection.kind === "student" ? "Fiche élève" : "Fiche professeur"}</p>
            <h2 className="truncate font-title text-xl font-semibold text-accent">{person.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-500" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
          {selection.kind === "student" ? (
            loading ? <LoadingState label="Calcul du profil scolaire..." /> : studentProfile ? <StudentProfile profile={studentProfile} /> : <p className="rounded-3xl bg-white p-6 text-sm text-gray-500">Profil indisponible.</p>
          ) : (
            <TeacherProfile teacher={selection.person} />
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function StudentProfile({ profile }: { profile: StudentAdminProfile }) {
  const trend = {
    improving: { label: "En progression", icon: ArrowUpRight, color: "text-emerald-700 bg-emerald-50" },
    stable: { label: "Stable", icon: ArrowRight, color: "text-blue-700 bg-blue-50" },
    declining: { label: "En recul", icon: ArrowDownRight, color: "text-red-700 bg-red-50" },
    unknown: { label: "À déterminer", icon: TrendingUp, color: "text-gray-600 bg-gray-100" },
  }[profile.trend];
  const TrendIcon = trend.icon;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          {profile.photoUrl ? <img src={profile.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRound className="h-7 w-7" /></span>}
          <div className="min-w-0">
            <h3 className="truncate font-title text-lg font-semibold text-accent">{profile.name}</h3>
            <p className="text-sm text-gray-500">{profile.level} · {profile.className}</p>
            {profile.registrationNumber ? <p className="mt-1 text-xs text-gray-400">Matricule {profile.registrationNumber}</p> : null}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <Metric label="Moyenne" value={profile.overallAverage === null ? "—" : `${profile.overallAverage}/20`} />
        <Metric label="Assiduité" value={`${profile.attendance.rate}%`} />
        <div className={`min-w-0 rounded-3xl p-3 sm:p-4 ${trend.color}`}>
          <TrendIcon className="h-5 w-5" />
          <p className="mt-3 truncate text-lg font-bold">{profile.evolution === null ? "—" : `${profile.evolution > 0 ? "+" : ""}${profile.evolution}`}</p>
          <p className="text-[10px] font-medium sm:text-[11px]">{trend.label}</p>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <SectionTitle icon={CalendarCheck}>Assiduité</SectionTitle>
        <div className="grid grid-cols-4 gap-2 text-center">
          <SmallMetric label="Séances" value={profile.attendance.total} />
          <SmallMetric label="Présent" value={profile.attendance.present} />
          <SmallMetric label="Absent" value={profile.attendance.absent} />
          <SmallMetric label="Retard" value={profile.attendance.late} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <SectionTitle icon={BookOpen}>Moyennes par matière</SectionTitle>
        {profile.subjectAverages.length ? (
          <div className="space-y-4">
            {profile.subjectAverages.map((item) => (
              <div key={item.subject}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-accent">{item.subject}</span>
                  <span className="shrink-0 font-semibold text-primary">{item.average}/20</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, item.average * 5))}%` }} /></div>
                <p className="mt-1 text-[10px] text-gray-400">{item.gradeCount} évaluation{item.gradeCount > 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">Aucune note disponible.</p>}
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <SectionTitle icon={GraduationCap}>Dernières notes</SectionTitle>
        {profile.recentGrades.length ? (
          <div className="divide-y divide-gray-100">
            {profile.recentGrades.map((grade) => (
              <div key={grade.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-accent">{grade.subject}</p>
                  <p className="truncate text-xs text-gray-400">{[formatEvaluationTitle(grade.title, grade.subject), grade.date].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-title font-bold text-primary">{grade.score}/{grade.maxScore}</p>
                  {grade.maxScore !== 20 ? <p className="text-[10px] text-gray-400">{grade.normalizedScore}/20</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">Aucune note récente.</p>}
      </section>

    </div>
  );
}

function TeacherProfile({ teacher }: { teacher: TeacherDirectoryItem }) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><GraduationCap className="h-7 w-7" /></span><div><h3 className="font-title text-lg font-semibold text-accent">{teacher.name}</h3><p className="text-sm text-gray-500">Professeur</p></div></div>
        {teacher.email ? <p className="mt-5 flex items-center gap-2 text-sm text-gray-600"><Mail className="h-4 w-4 text-primary" />{teacher.email}</p> : null}
        {teacher.phone ? <p className="mt-3 flex items-center gap-2 text-sm text-gray-600"><Phone className="h-4 w-4 text-primary" />{teacher.phone}</p> : null}
      </section>
      <ProfileList title="Matières enseignées" values={teacher.subjects} empty="Aucune matière affectée" />
      <ProfileList title="Classes affectées" values={teacher.classes} empty="Aucune classe affectée" />
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof BookOpen; children: string }) {
  return <div className="mb-4 flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><h3 className="font-title font-semibold text-accent">{children}</h3></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-3xl bg-white p-3 shadow-sm sm:p-4"><p className="truncate text-base font-bold text-accent sm:text-lg">{value}</p><p className="mt-1 text-[10px] text-gray-500 sm:text-[11px]">{label}</p></div>;
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return <div className="min-w-0 rounded-2xl bg-gray-50 px-1 py-3 sm:px-2"><p className="font-bold text-accent">{value}</p><p className="truncate text-[9px] text-gray-400 sm:text-[10px]">{label}</p></div>;
}

function ProfileList({ title, values, empty }: { title: string; values: string[]; empty: string }) {
  return <section className="rounded-3xl bg-white p-5 shadow-sm"><h3 className="font-title font-semibold text-accent">{title}</h3>{values.length ? <div className="mt-3 flex flex-wrap gap-2">{values.map((value) => <span key={value} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{value}</span>)}</div> : <p className="mt-2 text-sm text-gray-500">{empty}</p>}</section>;
}
