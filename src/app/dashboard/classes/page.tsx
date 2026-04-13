"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { UploadDocument } from "@/components/dashboard/UploadDocument";

type ClassItem = {
  id: string;
  name: string;
  level: string | null;
  academic_year: string | null;
};

export default function DashboardClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [levelFilter, setLevelFilter] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
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
    if (!levelFilter) return [];
    return classes.filter((item) => item.level === levelFilter);
  }, [classes, levelFilter]);

  async function fetchClasses() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/classes");
      if (!res.ok) {
        throw new Error("Impossible de récupérer les classes.");
      }
      const body = (await res.json()) as { classes?: ClassItem[] };
      const availableClasses = body.classes ?? [];
      setClasses(availableClasses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClasses()
      .then(() => null)
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!levelFilter) {
      setSelectedClassId("");
      return;
    }
    if (!filteredClasses.some((item) => item.id === selectedClassId)) {
      setSelectedClassId(filteredClasses[0]?.id ?? "");
    }
  }, [filteredClasses, levelFilter, selectedClassId]);

  const selectedClass = classes.find((item) => item.id === selectedClassId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        subtitle="Sélectionnez un niveau pour gérer les classes et importer des élèves."
      />

      <section className="elima-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--accent)]">Filtrer par niveau</h2>
          <p className="text-sm text-slate-600">
            Choisissez un niveau pour afficher les classes et sélectionner celle à gérer.
          </p>
        </div>

        {loading ? <p className="text-sm text-slate-500">Chargement des classes…</p> : null}
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {!loading ? (
          <select
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Sélectionner un niveau</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        ) : null}
      </section>

      <section className="elima-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--accent)]">Classes du niveau</h2>
          <p className="text-sm text-slate-600">Sélectionnez la classe à gérer.</p>
        </div>

        {levelFilter && filteredClasses.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune classe pour ce niveau.</p>
        ) : null}

        {filteredClasses.length > 0 ? (
          <div className="space-y-2">
            {filteredClasses.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedClassId(item.id)}
                className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  selectedClassId === item.id
                    ? "border-[var(--primary)] bg-[var(--primary)]/10"
                    : "border-slate-200 bg-white hover:border-[var(--primary)]/40"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.level ?? "Niveau non défini"} · {item.academic_year ?? "Année non définie"}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {selectedClassId === item.id ? "Sélectionnée" : "Choisir"}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <UploadDocument
        classId={selectedClassId}
        className={selectedClass ? `${selectedClass.name} · ${selectedClass.level ?? "Niveau"}` : undefined}
        onUploaded={fetchClasses}
      />
    </div>
  );
}
