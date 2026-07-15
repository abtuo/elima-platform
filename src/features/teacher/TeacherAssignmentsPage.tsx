import { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { AssignmentCard } from "@/components/cards/AssignmentCard";
import { ElimaCard } from "@/components/common/ElimaCard";
import { EmptyState } from "@/components/common/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { schoolDateKey } from "@/lib/schoolDateTime";
import { getAssignments } from "@/services/assignmentService";
import { createTeacherEvaluationEvent, getTeacherClasses, getTimetable } from "@/services/mainDataService";
import type { Assignment, ClassInfo } from "@/types/school";

function addMinutes(time: string, duration: number) {
  const [hours, minutes] = time.split(":").map(Number);
  const total = hours * 60 + minutes + duration;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [evaluation, setEvaluation] = useState({ classId: "", title: "", date: schoolDateKey(new Date()), startsAt: "13:00", duration: "60" });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getAssignments(), getTeacherClasses(), getTimetable(14)]).then(([nextAssignments, nextClasses, timetable]) => {
      setAssignments(nextAssignments);
      setClasses(nextClasses);
      setEvaluation((current) => ({ ...current, classId: nextClasses[0]?.id ?? "", date: timetable[0]?.referenceDate ?? current.date }));
    });
  }, []);

  async function addEvaluation(event: React.FormEvent) {
    event.preventDefault();
    setStatus("");
    if (!evaluation.classId || !evaluation.title.trim()) { setStatus("Choisissez une classe et indiquez le titre de l’évaluation."); return; }
    setSaving(true);
    try {
      await createTeacherEvaluationEvent({ ...evaluation, endsAt: addMinutes(evaluation.startsAt, Number(evaluation.duration)) });
      setEvaluation((current) => ({ ...current, title: "" }));
      setStatus("Évaluation ajoutée à l’emploi du temps.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Impossible d’ajouter l’évaluation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <AppHeader title="Devoirs" subtitle="Devoirs et évaluations" />
      <ElimaCard className="mb-5">
        <form onSubmit={addEvaluation} className="space-y-4">
          <div className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-primary" /><div><h2 className="font-title text-lg font-semibold text-accent">Planifier une évaluation</h2><p className="text-xs text-gray-500">La date apparaîtra dans l’emploi du temps de la classe.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-600">Classe<select value={evaluation.classId} onChange={(event) => setEvaluation((current) => ({ ...current, classId: event.target.value }))} className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 outline-none focus:border-primary">{classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name} · {klass.subject}</option>)}</select></label>
            <label className="text-sm font-medium text-gray-600">Titre<input value={evaluation.title} onChange={(event) => setEvaluation((current) => ({ ...current, title: event.target.value }))} placeholder="Ex. Contrôle chapitre 4" className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 outline-none focus:border-primary" /></label>
            <label className="text-sm font-medium text-gray-600">Date<input type="date" value={evaluation.date} onChange={(event) => setEvaluation((current) => ({ ...current, date: event.target.value }))} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 outline-none focus:border-primary" /></label>
            <div className="grid grid-cols-2 gap-2"><label className="text-sm font-medium text-gray-600">Heure<input type="time" value={evaluation.startsAt} onChange={(event) => setEvaluation((current) => ({ ...current, startsAt: event.target.value }))} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 outline-none focus:border-primary" /></label><label className="text-sm font-medium text-gray-600">Durée<select value={evaluation.duration} onChange={(event) => setEvaluation((current) => ({ ...current, duration: event.target.value }))} className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 outline-none focus:border-primary"><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 h</option><option value="90">1 h 30</option><option value="120">2 h</option></select></label></div>
          </div>
          {status ? <p className="text-sm text-gray-600">{status}</p> : null}
          <button type="submit" disabled={saving || !classes.length} className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50"><CalendarPlus className="h-4 w-4" />{saving ? "Ajout…" : "Ajouter au planning"}</button>
        </form>
      </ElimaCard>
      <section className="space-y-3"><h2 className="font-title text-lg font-semibold text-accent">Devoirs publiés</h2>{assignments.length ? assignments.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />) : <EmptyState title="Aucun devoir publié" description="Les devoirs publiés apparaîtront ici." />}</section>
    </PageContainer>
  );
}
