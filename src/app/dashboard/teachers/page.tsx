"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";

type SubjectOption = {
  id: string;
  name: string;
  coefficient: number;
};

type ClassOption = {
  id: string;
  name: string;
  level: string | null;
  academic_year: string | null;
};

export default function DashboardTeachersPage() {
  const toast = useToast();
  const [teacherName, setTeacherName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [classId, setClassId] = useState("");
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const levels = useMemo(() => {
    const unique = new Set(
      classes
        .map((item) => item.level)
        .filter((level): level is string => Boolean(level)),
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "fr"));
  }, [classes]);

  const filteredClasses = useMemo(() => {
    if (!levelFilter) return classes;
    return classes.filter((item) => item.level === levelFilter);
  }, [classes, levelFilter]);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [subjectsRes, classesRes] = await Promise.all([
          fetch("/api/dashboard/subjects"),
          fetch("/api/dashboard/classes"),
        ]);

        if (!subjectsRes.ok || !classesRes.ok) {
          throw new Error("Impossible de charger les données nécessaires.");
        }

        const subjectsBody = (await subjectsRes.json()) as { subjects?: SubjectOption[] };
        const classesBody = (await classesRes.json()) as { classes?: ClassOption[] };

        if (active) {
          setSubjects(subjectsBody.subjects ?? []);
          setClasses(classesBody.classes ?? []);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erreur lors du chargement.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teacherName.trim()) {
      setError("Veuillez saisir le nom de l’enseignant.");
      return;
    }
    if (!subjectId) {
      setError("Veuillez choisir une matière.");
      return;
    }
    if (!levelFilter) {
      setError("Veuillez sélectionner un niveau.");
      return;
    }
    if (!classId) {
      setError("Veuillez sélectionner une classe.");
      return;
    }

    setError(null);
    toast.success(
      "Assignation préparée",
      "La liaison enseignant/matière/classe sera enregistrée dans une prochaine étape.",
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enseignants"
        subtitle="Assignez les enseignants aux matières et classes avant de poursuivre la configuration."
      />

      <section className="elima-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--accent)]">Nouvelle assignation</h2>
          <p className="text-sm text-slate-600">
            Renseignez le nom de l’enseignant, sa matière et la classe à laquelle il sera rattaché.
          </p>
        </div>

        {loading ? <p className="text-sm text-slate-500">Chargement des données…</p> : null}
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {!loading ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Nom de l’enseignant</label>
                <input
                  value={teacherName}
                  onChange={(event) => setTeacherName(event.target.value)}
                  placeholder="Ex: Marie Kouadio"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Matière</label>
                <select
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Sélectionner une matière</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Niveau</label>
                <select
                  value={levelFilter}
                  onChange={(event) => {
                    setLevelFilter(event.target.value);
                    setClassId("");
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Sélectionner un niveau</option>
                  {levels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Classe</label>
                <select
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                  disabled={!levelFilter}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                >
                  <option value="">Sélectionner une classe</option>
                  {filteredClasses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.academic_year ? `· ${item.academic_year}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Les actions seront enregistrées à la validation finale.</p>
              <button
                type="submit"
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                Valider l’assignation
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
