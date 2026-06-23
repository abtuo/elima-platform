"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";
import { EditableTable } from "@/components/ui/EditableTable";
import { useToast } from "@/components/ui/Toast";

type Status = "PRESENT" | "ABSENT" | "LATE";

export default function TeacherAttendancePage() {
  const { selectedClassId, classes, students: contextStudents } = useTeacherContext();
  const { success } = useToast();
  const [saving, setSaving] = useState(false);
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const students = useMemo(
    () =>
      contextStudents
        .filter((s) => s.classId === selectedClassId)
        .map((s) => ({ id: s.id, name: s.fullName }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [contextStudents, selectedClassId],
  );
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<{ dateISO: string; present: number; absent: number; late: number }[]>([]);

  useEffect(() => {
    if (!selectedClassId) {
      setHistory([]);
      setStatus({});
      setReason({});
      return;
    }
    let active = true;
    fetch(`/api/teacher/attendance?classId=${encodeURIComponent(selectedClassId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { history?: { dateISO: string; present: number; absent: number; late: number }[]; today?: Record<string, Status>; todayReason?: Record<string, string> } | null) => {
        if (!active || !body) return;
        setHistory(body.history ?? []);
        setStatus(body.today ?? {});
        setReason(body.todayReason ?? {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedClassId]);

  return (
    <div className="space-y-6">
      <ProgressHeader title="Présences" subtitle="Appel rapide par classe + historique consultable." />

      <section className="elima-card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Classe : {selectedClass?.name ?? "Aucune"}
          </div>
          <div className="ml-auto text-sm text-slate-600">{students.length} élèves</div>
        </div>

        <EditableTable
          rows={students}
          rowKey={(s) => s.id}
          columns={[
            {
              key: "student",
              header: "Élève",
              cell: (s) => <span className="font-semibold">{s.name}</span>,
            },
            {
              key: "status",
              header: "Statut",
              cell: (s) => (
                <select
                  value={status[s.id] ?? "PRESENT"}
                  onChange={(e) => setStatus((st) => ({ ...st, [s.id]: e.target.value as Status }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="PRESENT">Présent</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Retard</option>
                </select>
              ),
            },
            {
              key: "reason",
              header: "Motif",
              cell: (s) => {
                const st = status[s.id] ?? "PRESENT";
                if (st === "PRESENT") return <span className="text-xs text-slate-400">—</span>;
                return (
                  <input
                    value={reason[s.id] ?? ""}
                    onChange={(e) => setReason((r) => ({ ...r, [s.id]: e.target.value }))}
                    placeholder="Motif (optionnel)"
                    className="w-40 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                );
              },
            },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={saving || students.length === 0}
            onClick={async () => {
              if (!selectedClassId || students.length === 0) return;
              setSaving(true);
              const todayISO = new Date().toISOString().slice(0, 10);
              const statuses = students.map((s) => {
                const st = (status[s.id] ?? "PRESENT") as Status;
                return { studentId: s.id, status: st, reason: st === "PRESENT" ? null : (reason[s.id] ?? null) };
              });
              try {
                const res = await fetch("/api/teacher/attendance", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ classId: selectedClassId, date: todayISO, statuses }),
                });
                if (!res.ok) throw new Error("save failed");
                const present = statuses.filter((s) => s.status === "PRESENT").length;
                const absent = statuses.filter((s) => s.status === "ABSENT").length;
                const late = statuses.filter((s) => s.status === "LATE").length;
                setHistory((h) => [
                  { dateISO: todayISO, present, absent, late },
                  ...h.filter((r) => r.dateISO !== todayISO),
                ]);
                success("Appel enregistré", `${present} présents · ${absent} absents · ${late} retards`);
              } catch {
                success("Échec de l’enregistrement", "Veuillez réessayer.");
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer l’appel"}
          </button>
          <Link
            href="/teacher/timetable"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Retour emploi du temps
          </Link>
        </div>
      </section>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Historique</h2>
        <EditableTable
          rows={history}
          rowKey={(r) => r.dateISO}
          columns={[
            { key: "date", header: "Date", cell: (r) => <span className="font-semibold">{r.dateISO}</span> },
            { key: "p", header: "Présents", cell: (r) => r.present, className: "whitespace-nowrap" },
            { key: "a", header: "Absents", cell: (r) => r.absent, className: "whitespace-nowrap" },
            { key: "l", header: "Retards", cell: (r) => r.late, className: "whitespace-nowrap" },
          ]}
        />
      </section>
    </div>
  );
}
