"use client";

import { useMemo, useState } from "react";
import { demoStudentHomework } from "@/lib/student/demo";
import { EditableTable } from "@/components/ui/EditableTable";

const KEY = "elima.student.homework.done.v1";

function loadDone(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveDone(map: Record<string, boolean>) {
  window.localStorage.setItem(KEY, JSON.stringify(map));
}

export function HomeworkClient({ studentId }: { studentId: string }) {
  const rows = useMemo(
    () => demoStudentHomework.filter((h) => h.studentId === studentId).sort((a, b) => a.dueDateISO.localeCompare(b.dueDateISO)),
    [studentId],
  );

  const [done, setDone] = useState<Record<string, boolean>>(() => loadDone());

  return (
    <EditableTable
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        { key: "due", header: "Échéance", cell: (r) => <span className="font-semibold">{r.dueDateISO}</span>, className: "whitespace-nowrap" },
        { key: "sub", header: "Matière", cell: (r) => r.subject, className: "whitespace-nowrap" },
        { key: "title", header: "Devoir", cell: (r) => (
          <div>
            <p className="font-semibold">{r.title}</p>
            {r.description ? <p className="text-xs text-slate-500">{r.description}</p> : null}
          </div>
        ) },
        {
          key: "done",
          header: "Fait",
          className: "whitespace-nowrap",
          cell: (r) => (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(done[r.id])}
                onChange={() => {
                  setDone((d) => {
                    const next = { ...d, [r.id]: !d[r.id] };
                    saveDone(next);
                    return next;
                  });
                }}
              />
              <span className="text-xs text-slate-600">Personnel</span>
            </label>
          ),
        },
      ]}
    />
  );
}
