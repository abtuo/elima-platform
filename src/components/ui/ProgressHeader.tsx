"use client";

import { BookOpen, CalendarRange, GraduationCap, Layers } from "lucide-react";
import { useTeacherContext } from "@/app/teacher/TeacherContext";
import { demoClasses, demoSubjects, demoTerms } from "@/lib/teacher/demo";

export function ProgressHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const {
    selectedClass,
    setSelectedClass,
    selectedSubject,
    setSelectedSubject,
    selectedTerm,
    setSelectedTerm,
  } = useTeacherContext();

  return (
    <header className="elima-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--accent)]">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>

        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <GraduationCap size={16} className="text-[var(--primary)]" />
            <span className="sr-only">Classe</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
            >
              {demoClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <BookOpen size={16} className="text-[var(--primary)]" />
            <span className="sr-only">Matière</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
            >
              {demoSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <CalendarRange size={16} className="text-[var(--primary)]" />
            <span className="sr-only">Période</span>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value as (typeof demoTerms)[number])}
              className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
            >
              {demoTerms.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Layers size={14} className="text-slate-400" />
        Contexte actif : <span className="font-semibold text-slate-700">{selectedClass}</span> •{" "}
        <span className="font-semibold text-slate-700">{selectedSubject}</span> •{" "}
        <span className="font-semibold text-slate-700">{selectedTerm}</span>
      </div>
    </header>
  );
}
