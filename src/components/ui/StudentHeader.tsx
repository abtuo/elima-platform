import { BookOpen, CalendarRange, GraduationCap, User } from "lucide-react";

export function StudentHeader({
  title,
  subtitle,
  studentName,
  className,
  term,
}: {
  title: string;
  subtitle?: string;
  studentName: string;
  className: string;
  term: string;
}) {
  return (
    <header className="elima-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--accent)]">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>

        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <User size={16} className="text-[var(--primary)]" />
            <span className="truncate font-semibold text-slate-800">{studentName}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <GraduationCap size={16} className="text-[var(--primary)]" />
            <span className="truncate font-semibold text-slate-800">{className}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <CalendarRange size={16} className="text-[var(--primary)]" />
            <span className="truncate font-semibold text-slate-800">{term}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <BookOpen size={14} className="text-slate-400" />
        Lecture seule : notes officielles, moyennes et présences.
      </div>
    </header>
  );
}
