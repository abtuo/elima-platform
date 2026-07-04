"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type TeacherTerm = "Trimestre 1" | "Trimestre 2" | "Trimestre 3";

export type TeacherClass = {
  id: string;
  name: string;
  level: string;
  academicYear: string;
};

export type TeacherSubject = {
  id: string;
  name: string;
};

export type TeacherStudent = {
  id: string;
  fullName: string;
  classId: string;
  className: string;
};

export type TeacherAssignment = {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
};

export type TeacherContextValue = {
  selectedClassId: string;
  setSelectedClassId: (value: string) => void;
  selectedSubjectId: string;
  setSelectedSubjectId: (value: string) => void;
  selectedTerm: TeacherTerm;
  setSelectedTerm: (value: TeacherTerm) => void;
  classes: TeacherClass[];
  subjects: TeacherSubject[];
  students: TeacherStudent[];
  assignments: TeacherAssignment[];
  loading: boolean;
};

const TeacherContext = createContext<TeacherContextValue | null>(null);

export function TeacherContextProvider({ children }: { children: React.ReactNode }) {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTerm, setSelectedTerm] = useState<TeacherTerm>("Trimestre 3");
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadTeacherContext() {
      try {
        setLoading(true);
        const res = await fetch("/api/teacher/context");
        const body = (await res.json().catch(() => null)) as
          | {
              classes?: TeacherClass[];
              subjects?: TeacherSubject[];
              students?: TeacherStudent[];
              assignments?: TeacherAssignment[];
            }
          | null;
        if (!res.ok || !active) return;

        const nextClasses = body?.classes ?? [];
        const nextSubjects = body?.subjects ?? [];
        setClasses(nextClasses);
        setSubjects(nextSubjects);
        setStudents(body?.students ?? []);
        setAssignments(body?.assignments ?? []);
        setSelectedClassId((current) => current || nextClasses[0]?.id || "");
        setSelectedSubjectId((current) => current || nextSubjects[0]?.id || "");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadTeacherContext().catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedClassId((current) => {
      if (current && classes.some((c) => c.id === current)) return current;
      return classes[0]?.id ?? "";
    });
  }, [classes]);

  useEffect(() => {
    const availableSubjectIds = selectedClassId
      ? assignments.filter((a) => a.classId === selectedClassId).map((a) => a.subjectId)
      : subjects.map((s) => s.id);
    const uniqueSubjectIds = Array.from(new Set(availableSubjectIds));
    const fallback = uniqueSubjectIds[0] ?? subjects[0]?.id ?? "";

    setSelectedSubjectId((current) => {
      if (current && uniqueSubjectIds.includes(current)) return current;
      return fallback;
    });
  }, [assignments, selectedClassId, subjects]);

  const value = useMemo<TeacherContextValue>(
    () => ({
      selectedClassId,
      setSelectedClassId,
      selectedSubjectId,
      setSelectedSubjectId,
      selectedTerm,
      setSelectedTerm,
      classes,
      subjects,
      students,
      assignments,
      loading,
    }),
    [selectedClassId, selectedSubjectId, selectedTerm, classes, subjects, students, assignments, loading],
  );

  return <TeacherContext.Provider value={value}>{children}</TeacherContext.Provider>;
}

export function useTeacherContext() {
  const ctx = useContext(TeacherContext);
  if (!ctx) {
    throw new Error("useTeacherContext must be used within TeacherContextProvider");
  }
  return ctx;
}
