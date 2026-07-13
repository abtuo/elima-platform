import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Mail, Search, UserRound, Users } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageContainer } from "@/components/layout/PageContainer";
import { WebLinkButton } from "@/components/common/WebLinkButton";
import { getAdminStudents, getAdminTeachers } from "@/services/mainDataService";
import type { StudentDirectoryItem, TeacherDirectoryItem } from "@/types/school";

export function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentDirectoryItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherDirectoryItem[]>([]);
  const [view, setView] = useState<"students" | "teachers">("students");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { Promise.all([getAdminStudents(), getAdminTeachers()]).then(([nextStudents, nextTeachers]) => { setStudents(nextStudents); setTeachers(nextTeachers); }).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("fr");
    if (!value) return students;
    return students.filter((student) => `${student.name} ${student.className} ${student.registrationNumber ?? ""}`.toLocaleLowerCase("fr").includes(value));
  }, [query, students]);
  const filteredTeachers = useMemo(() => { const value = query.trim().toLocaleLowerCase("fr"); if (!value) return teachers; return teachers.filter((teacher) => `${teacher.name} ${teacher.email ?? ""} ${teacher.classes.join(" ")}`.toLocaleLowerCase("fr").includes(value)); }, [query, teachers]);

  return (
    <PageContainer>
      <AppHeader title="Annuaire" subtitle={`${students.length} élèves · ${teachers.length} professeurs`} />
      <div className="mb-4 grid grid-cols-2 rounded-2xl bg-gray-100 p-1"><button type="button" onClick={() => { setView("students"); setQuery(""); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${view === "students" ? "bg-white text-primary shadow-sm" : "text-gray-500"}`}>Élèves</button><button type="button" onClick={() => { setView("teachers"); setQuery(""); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${view === "teachers" ? "bg-white text-primary shadow-sm" : "text-gray-500"}`}>Professeurs</button></div>
      <label className="mb-5 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <Search className="h-5 w-5 text-gray-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === "students" ? "Nom, classe ou matricule" : "Nom, email ou classe"} className="w-full bg-transparent text-sm outline-none" />
      </label>
      {loading ? <LoadingState /> : view === "students" ? filtered.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((student) => (
            <article key={student.id} className="flex items-center gap-4 rounded-3xl border border-white bg-white p-4 shadow-sm">
              {student.photoUrl ? <img src={student.photoUrl} alt="" className="h-12 w-12 rounded-2xl object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></span>}
              <div className="min-w-0 flex-1"><h3 className="truncate font-semibold text-accent">{student.name}</h3><p className="text-sm text-gray-500">{student.className}</p>{student.registrationNumber ? <p className="mt-1 text-xs text-gray-400">Matricule {student.registrationNumber}</p> : null}</div>
            </article>
          ))}
        </div>
      ) : <EmptyState icon={Users} title={query ? "Aucun résultat" : "Aucun élève inscrit"} description={query ? "Modifiez votre recherche." : "Les élèves inscrits dans cet établissement apparaîtront ici."} /> : filteredTeachers.length ? <div className="grid gap-3 md:grid-cols-2">{filteredTeachers.map((teacher) => <article key={teacher.id} className="flex items-start gap-4 rounded-3xl border border-white bg-white p-4 shadow-sm"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><GraduationCap className="h-5 w-5" /></span><div className="min-w-0"><h3 className="font-semibold text-accent">{teacher.name}</h3>{teacher.email ? <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-gray-500"><Mail className="h-3.5 w-3.5" />{teacher.email}</p> : null}<p className="mt-2 text-xs text-gray-400">{teacher.classes.length ? teacher.classes.join(" · ") : "Aucune classe affectée"}</p></div></article>)}</div> : <EmptyState icon={GraduationCap} title={query ? "Aucun résultat" : "Aucun professeur"} description={query ? "Modifiez votre recherche." : "Les professeurs de l’établissement apparaîtront ici."} />}
      <div className="mt-5"><WebLinkButton path={view === "students" ? "/dashboard/students" : "/dashboard/teachers"} label={view === "students" ? "Importer des élèves" : "Gérer les professeurs"} /></div>
    </PageContainer>
  );
}
