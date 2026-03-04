"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type TeacherTerm = "Trimestre 1" | "Trimestre 2" | "Trimestre 3";

export type TeacherContextValue = {
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  selectedSubject: string;
  setSelectedSubject: (value: string) => void;
  selectedTerm: TeacherTerm;
  setSelectedTerm: (value: TeacherTerm) => void;
};

const TeacherContext = createContext<TeacherContextValue | null>(null);

export function TeacherContextProvider({ children }: { children: React.ReactNode }) {
  // Demo defaults (later: from DB/profile)
  const [selectedClass, setSelectedClass] = useState("6e A");
  const [selectedSubject, setSelectedSubject] = useState("Mathématiques");
  const [selectedTerm, setSelectedTerm] = useState<TeacherTerm>("Trimestre 1");

  const value = useMemo<TeacherContextValue>(
    () => ({
      selectedClass,
      setSelectedClass,
      selectedSubject,
      setSelectedSubject,
      selectedTerm,
      setSelectedTerm,
    }),
    [selectedClass, selectedSubject, selectedTerm],
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
