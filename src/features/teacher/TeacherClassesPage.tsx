import { useEffect, useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { ElimaCard } from "@/components/common/ElimaCard";
import { enqueueAction } from "@/services/offlineQueueService";
import { getClassStudents, getTeacherClasses } from "@/services/mainDataService";
import type { ClassInfo, StudentDirectoryItem } from "@/types/school";
import { Check, X, Clock } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export function TeacherClassesPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<StudentDirectoryItem[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});

  useEffect(() => {
    getTeacherClasses().then((c) => {
      setClasses(c);
      if (c.length) setSelectedClass(c[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    getClassStudents(selectedClass.id).then(setStudents);
  }, [selectedClass]);

  function markStatus(student: StudentDirectoryItem, status: string) {
    setAttendance((prev) => ({ ...prev, [student.id]: status }));
    enqueueAction("attendance", { student_id: student.id, student_name: student.name, status, class_id: selectedClass?.id, date: new Date().toISOString().slice(0, 10) });
  }

  return (
    <PageContainer>
      <AppHeader title="Classes" subtitle="Liste et appel" />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {classes.map((c) => (
          <button key={c.id} type="button" onClick={() => setSelectedClass(c)}
            className={`tap shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${selectedClass?.id === c.id ? "bg-primary text-white" : "bg-white text-gray-600 shadow-sm"}`}>
            {c.name}
          </button>
        ))}
      </div>
      {selectedClass ? (
        <section className="space-y-3">
          <h2 className="font-title text-lg font-semibold text-accent">Appel — {selectedClass.name}</h2>
          {students.map((student) => (
            <ElimaCard key={student.id}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-accent">{student.name}</span>
                <div className="flex gap-1">
                  {(["PRESENT", "ABSENT", "LATE"] as const).map((s) => {
                    const Icon = s === "PRESENT" ? Check : s === "ABSENT" ? X : Clock;
                    const active = attendance[student.id] === s;
                    const colors = { PRESENT: "bg-green-100 text-green-700", ABSENT: "bg-red-100 text-red-700", LATE: "bg-amber-100 text-amber-700" };
                    return (
                      <button key={s} type="button" onClick={() => markStatus(student, s)}
                        className={`tap flex h-9 w-9 items-center justify-center rounded-xl ${active ? colors[s] : "bg-gray-100 text-gray-400"}`}>
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </ElimaCard>
          ))}
          {!students.length ? <EmptyState title="Aucun élève dans cette classe" description="La liste se mettra à jour dès que des élèves seront affectés à la classe." /> : null}
        </section>
      ) : null}
    </PageContainer>
  );
}
