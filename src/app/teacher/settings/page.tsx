"use client";

import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";

export default function TeacherSettingsPage() {
  const { selectedClass, selectedSubject, selectedTerm } = useTeacherContext();

  return (
    <div className="space-y-6">
      <ProgressHeader
        title="Paramètres"
        subtitle="Paramètres de l’espace enseignant (démo UI)."
      />

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Contexte par défaut</h2>
        <p className="text-sm text-slate-600">
          Pour la démo, le contexte est global et partagé via <span className="font-mono">TeacherContext</span>.
        </p>

        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Classe</span> : {selectedClass}
          </p>
          <p>
            <span className="font-semibold">Matière</span> : {selectedSubject}
          </p>
          <p>
            <span className="font-semibold">Période</span> : {selectedTerm}
          </p>
        </div>
      </section>
    </div>
  );
}
