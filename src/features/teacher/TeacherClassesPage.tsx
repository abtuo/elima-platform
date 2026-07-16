import { useEffect, useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { GeneratedFeatureIcon } from "@/components/common/GeneratedFeatureIcon";
import { GeneratedActionIcon } from "@/components/common/GeneratedActionIcon";
import { PageContainer } from "@/components/layout/PageContainer";
import { ElimaCard } from "@/components/common/ElimaCard";
import { enqueueAttendanceSheet } from "@/services/offlineQueueService";
import { syncPendingActions } from "@/services/syncService";
import { isOnline } from "@/services/networkStatusService";
import { getClassStudents, getTeacherClasses } from "@/services/mainDataService";
import type { ClassInfo, StudentDirectoryItem } from "@/types/school";
import { Check, CheckCircle2, X, Clock } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export function TeacherClassesPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<StudentDirectoryItem[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getTeacherClasses().then((c) => {
      setClasses(c);
      if (c.length) setSelectedClass(c[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    getClassStudents(selectedClass.id).then((nextStudents) => {
      setStudents(nextStudents);
      setAttendance(Object.fromEntries(nextStudents.map((student) => [student.id, "PRESENT"])));
      setNotice("");
    });
  }, [selectedClass]);

  function markStatus(student: StudentDirectoryItem, status: string) {
    setAttendance((prev) => ({ ...prev, [student.id]: status }));
    setNotice("");
  }

  async function validateAttendance() {
    if (!selectedClass || !students.length) return;
    setSaving(true);
    const date = new Date().toISOString().slice(0, 10);
    enqueueAttendanceSheet(students.map((student) => ({ student_id: student.id, student_name: student.name, status: attendance[student.id] ?? "PRESENT", class_id: selectedClass.id, date })));
    if (isOnline()) {
      const result = await syncPendingActions();
      setNotice(result.errors ? "Appel enregistré, mais la synchronisation devra être relancée." : "Appel validé et synchronisé.");
    } else {
      setNotice("Appel validé hors ligne. Il sera synchronisé au retour du réseau.");
    }
    setSaving(false);
  }

  return (
    <PageContainer>
      <AppHeader title="Classes" subtitle="Liste et appel" action={<GeneratedFeatureIcon name="classes" className="h-14 w-14" />} />
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
          <p className="text-sm text-gray-500">Tous les élèves sont présents par défaut. Modifiez uniquement les absences et retards.</p>
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
          {students.length ? <div className="sticky bottom-20 rounded-3xl border border-gray-100 bg-white/95 p-4 shadow-lg backdrop-blur lg:bottom-4"><div className="mb-3 flex items-center justify-between text-sm"><span className="text-gray-500">{Object.values(attendance).filter((status) => status === "ABSENT").length} absent(s) · {Object.values(attendance).filter((status) => status === "LATE").length} retard(s)</span>{notice ? <span className="flex items-center gap-1 font-semibold text-primary"><CheckCircle2 className="h-4 w-4" />{notice}</span> : null}</div><button type="button" onClick={validateAttendance} disabled={saving} className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-2 text-sm font-semibold text-white disabled:opacity-60"><GeneratedActionIcon name="attendance" className="h-9 w-9" />{saving ? "Validation…" : "Valider l’appel"}</button></div> : null}
          {!students.length ? <EmptyState title="Aucun élève dans cette classe" description="La liste se mettra à jour dès que des élèves seront affectés à la classe." /> : null}
        </section>
      ) : null}
    </PageContainer>
  );
}
