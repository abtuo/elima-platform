import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, GraduationCap, Mail, Search, UserRound, Users } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { WebLinkButton } from "@/components/common/WebLinkButton";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminDirectoryProfileDrawer } from "@/features/admin/AdminDirectoryProfileDrawer";
import type { DirectorySelection } from "@/features/admin/AdminDirectoryProfileDrawer";
import { getAdminStudents, getAdminTeachers } from "@/services/mainDataService";
import type { StudentDirectoryItem, TeacherDirectoryItem } from "@/types/school";

type StudentClassGroup = {
  name: string;
  students: StudentDirectoryItem[];
};

type StudentLevelGroup = {
  name: string;
  classes: StudentClassGroup[];
  studentCount: number;
};

export function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentDirectoryItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherDirectoryItem[]>([]);
  const [view, setView] = useState<"students" | "teachers">("students");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<DirectorySelection | null>(null);
  const [openLevels, setOpenLevels] = useState<Set<string>>(new Set());
  const [openClasses, setOpenClasses] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([getAdminStudents(), getAdminTeachers()])
      .then(([nextStudents, nextTeachers]) => {
        setStudents(nextStudents);
        setTeachers(nextTeachers);
        const firstLevel = sortLevels([...new Set(nextStudents.map(studentLevel))])[0];
        if (firstLevel) setOpenLevels(new Set([firstLevel]));
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredStudents = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("fr");
    if (!value) return students;
    return students.filter((student) =>
      `${student.name} ${student.level ?? ""} ${student.className} ${student.registrationNumber ?? ""}`
        .toLocaleLowerCase("fr")
        .includes(value),
    );
  }, [query, students]);

  const studentGroups = useMemo(() => groupStudents(filteredStudents), [filteredStudents]);

  const filteredTeachers = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("fr");
    if (!value) return teachers;
    return teachers.filter((teacher) =>
      `${teacher.name} ${teacher.email ?? ""} ${teacher.classes.join(" ")} ${teacher.subjects.join(" ")}`
        .toLocaleLowerCase("fr")
        .includes(value),
    );
  }, [query, teachers]);

  const searching = Boolean(query.trim());

  function switchView(nextView: "students" | "teachers") {
    setView(nextView);
    setQuery("");
  }

  return (
    <PageContainer>
      <AppHeader title="Annuaire" subtitle={`${students.length} élèves · ${teachers.length} professeurs`} />

      <div className="mb-4 grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
        <TabButton active={view === "students"} onClick={() => switchView("students")}>Élèves</TabButton>
        <TabButton active={view === "teachers"} onClick={() => switchView("teachers")}>Professeurs</TabButton>
      </div>

      <label className="mb-5 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <Search className="h-5 w-5 text-gray-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={view === "students" ? "Nom, niveau, classe ou matricule" : "Nom, matière, email ou classe"}
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>

      {loading ? (
        <LoadingState />
      ) : view === "students" ? (
        studentGroups.length ? (
          <div className="space-y-4">
            {studentGroups.map((level) => {
              const levelOpen = searching || openLevels.has(level.name);
              return (
                <section key={level.name} className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleSetValue(setOpenLevels, level.name)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left"
                    aria-expanded={levelOpen}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-title text-lg font-semibold text-accent">{level.name}</span>
                      <span className="text-xs text-gray-500">{level.classes.length} classe{level.classes.length > 1 ? "s" : ""} · {level.studentCount} élève{level.studentCount > 1 ? "s" : ""}</span>
                    </span>
                    <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${levelOpen ? "rotate-180" : ""}`} />
                  </button>

                  {levelOpen ? (
                    <div className="space-y-3 border-t border-gray-100 bg-gray-50/70 p-3 sm:p-4">
                      {level.classes.map((classGroup) => {
                        const classKey = `${level.name}::${classGroup.name}`;
                        const classOpen = searching || openClasses.has(classKey);
                        return (
                          <div key={classKey} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                            <button
                              type="button"
                              onClick={() => toggleSetValue(setOpenClasses, classKey)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left"
                              aria-expanded={classOpen}
                            >
                              <Users className="h-4 w-4 text-primary" />
                              <span className="flex-1 font-semibold text-accent">{classGroup.name}</span>
                              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{classGroup.students.length}</span>
                              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${classOpen ? "rotate-180" : ""}`} />
                            </button>

                            {classOpen ? (
                              <div className="divide-y divide-gray-100 border-t border-gray-100">
                                {classGroup.students.map((student) => (
                                  <StudentRow key={student.id} student={student} onClick={() => setSelection({ kind: "student", person: student })} />
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Users} title={query ? "Aucun résultat" : "Aucun élève inscrit"} description={query ? "Modifiez votre recherche." : "Les élèves inscrits dans cet établissement apparaîtront ici."} />
        )
      ) : filteredTeachers.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredTeachers.map((teacher) => (
            <button
              key={teacher.id}
              type="button"
              onClick={() => setSelection({ kind: "teacher", person: teacher })}
              className="flex items-start gap-4 rounded-3xl border border-white bg-white p-4 text-left shadow-sm transition hover:border-primary/20 hover:shadow-md"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><GraduationCap className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-accent">{teacher.name}</span>
                {teacher.email ? <span className="mt-1 flex items-center gap-1.5 truncate text-sm text-gray-500"><Mail className="h-3.5 w-3.5" />{teacher.email}</span> : null}
                <span className="mt-2 block text-xs text-gray-400">{teacher.subjects.length ? teacher.subjects.join(" · ") : "Aucune matière affectée"}</span>
                <span className="mt-1 block text-xs text-gray-400">{teacher.classes.length ? teacher.classes.join(" · ") : "Aucune classe affectée"}</span>
              </span>
              <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-gray-300" />
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon={GraduationCap} title={query ? "Aucun résultat" : "Aucun professeur"} description={query ? "Modifiez votre recherche." : "Les professeurs de l’établissement apparaîtront ici."} />
      )}

      <div className="mt-5">
        <WebLinkButton path={view === "students" ? "/dashboard/students" : "/dashboard/teachers"} label={view === "students" ? "Importer des élèves" : "Gérer les professeurs"} />
      </div>

      <AdminDirectoryProfileDrawer selection={selection} onClose={() => setSelection(null)} />
    </PageContainer>
  );
}

function StudentRow({ student, onClick }: { student: StudentDirectoryItem; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-primary/[0.03]">
      {student.photoUrl ? <img src={student.photoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500"><UserRound className="h-4 w-4" /></span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-accent">{student.name}</span>
        {student.registrationNumber ? <span className="mt-0.5 block text-xs text-gray-400">Matricule {student.registrationNumber}</span> : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
    </button>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return <button type="button" onClick={onClick} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${active ? "bg-white text-primary shadow-sm" : "text-gray-500"}`}>{children}</button>;
}

function studentLevel(student: StudentDirectoryItem) {
  return student.level?.trim() || "Niveau non renseigné";
}

function groupStudents(students: StudentDirectoryItem[]): StudentLevelGroup[] {
  const levels = new Map<string, Map<string, StudentDirectoryItem[]>>();
  for (const student of students) {
    const level = studentLevel(student);
    const className = student.className?.trim() || "Classe non renseignée";
    if (!levels.has(level)) levels.set(level, new Map());
    const classes = levels.get(level)!;
    if (!classes.has(className)) classes.set(className, []);
    classes.get(className)!.push(student);
  }

  return sortLevels([...levels.keys()]).map((name) => {
    const classMap = levels.get(name)!;
    const classes = [...classMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "fr", { numeric: true }))
      .map(([className, classStudents]) => ({ name: className, students: classStudents.sort((a, b) => a.name.localeCompare(b.name, "fr")) }));
    return { name, classes, studentCount: classes.reduce((sum, item) => sum + item.students.length, 0) };
  });
}

function sortLevels(levels: string[]) {
  return levels.sort((a, b) => levelRank(a) - levelRank(b) || a.localeCompare(b, "fr", { numeric: true }));
}

function levelRank(level: string) {
  const normalized = level.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  if (/^6/.test(normalized) || normalized.includes("sixieme")) return 0;
  if (/^5/.test(normalized) || normalized.includes("cinquieme")) return 1;
  if (/^4/.test(normalized) || normalized.includes("quatrieme")) return 2;
  if (/^3/.test(normalized) || normalized.includes("troisieme")) return 3;
  if (/^2/.test(normalized) || normalized.includes("seconde")) return 4;
  if (/^1/.test(normalized) || normalized.includes("premiere")) return 5;
  if (normalized.includes("terminale")) return 6;
  return 99;
}

function toggleSetValue(setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
}
