import Link from "next/link";
import { Users } from "lucide-react";
import type { ParentChild } from "@/lib/parent/queries";

export function ChildSwitcher({
  childrenList,
  selectedStudentId,
  basePath,
}: {
  childrenList: ParentChild[];
  selectedStudentId: string | null;
  basePath: string;
}) {
  const selected = childrenList.find((c) => c.student_id === selectedStudentId) ?? childrenList[0];

  return (
    <div className="elima-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--accent)]">Espace Parent</h1>
          <p className="mt-1 text-sm text-slate-600">Sélectionnez un enfant pour consulter ses informations (lecture seule).</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          <Users size={14} className="text-[var(--primary)]" />
          {childrenList.length} enfant(s)
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {childrenList.map((c) => {
          const active = c.student_id === selected?.student_id;
          return (
            <Link
              key={c.student_id}
              href={`${basePath}?child=${c.student_id}`}
              className={
                active
                  ? "rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white"
                  : "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              }
            >
              {c.full_name} • {c.class_name}
            </Link>
          );
        })}
      </div>

      {selected ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Enfant sélectionné</span> : {selected.full_name}
          </p>
          <p>
            <span className="font-semibold">Classe</span> : {selected.class_name}
          </p>
        </div>
      ) : null}
    </div>
  );
}
