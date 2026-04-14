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

type TeacherOption = {
  id: string;
  fullName: string;
  source: "existing" | "upload" | "manual";
};

type AssignmentRow = {
  teacherId: string;
  subjectId: string;
  level: string;
  classIds: string[];
};

type TeacherAccessCodeRow = {
  teacherId: string;
  fullName: string;
  email: string;
  matricule: string;
  code: string;
};

export default function DashboardTeachersPage() {
  const toast = useToast();
  const [manualTeacherName, setManualTeacherName] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [existingTeachers, setExistingTeachers] = useState<TeacherOption[]>([]);
  const [uploadedTeachers, setUploadedTeachers] = useState<TeacherOption[]>([]);
  const [manualTeachers, setManualTeachers] = useState<TeacherOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [accessCodes, setAccessCodes] = useState<TeacherAccessCodeRow[]>([]);
  const [codeFailures, setCodeFailures] = useState<Array<{ teacherId: string; reason: string }>>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allTeachers = useMemo(
    () => [...existingTeachers, ...uploadedTeachers, ...manualTeachers],
    [existingTeachers, uploadedTeachers, manualTeachers],
  );

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

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [subjectsRes, classesRes, teachersRes] = await Promise.all([
          fetch("/api/dashboard/subjects"),
          fetch("/api/dashboard/classes"),
          fetch("/api/dashboard/teachers"),
        ]);

        if (!subjectsRes.ok || !classesRes.ok || !teachersRes.ok) {
          throw new Error("Impossible de charger les données nécessaires.");
        }

        const subjectsBody = (await subjectsRes.json()) as { subjects?: SubjectOption[] };
        const classesBody = (await classesRes.json()) as { classes?: ClassOption[] };
        const teachersBody = (await teachersRes.json()) as { teachers?: Array<{ id: string; fullName: string }> };

        if (active) {
          setSubjects(subjectsBody.subjects ?? []);
          setClasses(classesBody.classes ?? []);
          setExistingTeachers(
            (teachersBody.teachers ?? []).map((teacher) => ({
              id: teacher.id,
              fullName: teacher.fullName,
              source: "existing",
            })),
          );
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

  useEffect(() => {
    if (selectedTeacherId) return;
    if (!allTeachers.length) return;
    setSelectedTeacherId(allTeachers[0].id);
  }, [allTeachers, selectedTeacherId]);

  useEffect(() => {
    setSelectedClassIds([]);
  }, [levelFilter, selectedTeacherId]);

  function parseTeacherNamesFromCsv(content: string) {
    const rows = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const values = rows
      .map((line) => line.split(/[;,|\t]/)[0]?.trim() ?? "")
      .filter(Boolean)
      .filter((name) => !/^nom\b/i.test(name));
    return Array.from(new Set(values));
  }

  async function handleUploadTeachers(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const names = parseTeacherNamesFromCsv(text);
      if (!names.length) {
        setError("Le fichier ne contient aucun nom d’enseignant exploitable.");
        return;
      }

      const existingNames = new Set(allTeachers.map((teacher) => teacher.fullName.trim().toLocaleLowerCase("fr")));
      const newTeachers = names
        .filter((name) => !existingNames.has(name.toLocaleLowerCase("fr")))
        .map((name, idx) => ({
          id: `upload-${Date.now()}-${idx}`,
          fullName: name,
          source: "upload" as const,
        }));

      if (!newTeachers.length) {
        setError("Tous les enseignants du fichier sont déjà dans la liste.");
        return;
      }

      setUploadedTeachers((prev) => [...prev, ...newTeachers]);
      setError(null);
      toast.success("Fichier importé", `${newTeachers.length} enseignant(s) ajouté(s) à la liste.`);
    } catch {
      setError("Impossible de lire le fichier importé.");
    } finally {
      event.target.value = "";
    }
  }

  function handleAddManualTeacher() {
    const trimmed = manualTeacherName.trim();
    if (!trimmed) {
      setError("Veuillez saisir le nom de l’enseignant à ajouter.");
      return;
    }

    const duplicate = allTeachers.some(
      (teacher) => teacher.fullName.trim().toLocaleLowerCase("fr") === trimmed.toLocaleLowerCase("fr"),
    );
    if (duplicate) {
      setError("Cet enseignant existe déjà dans la liste.");
      return;
    }

    const newTeacher: TeacherOption = {
      id: `manual-${Date.now()}`,
      fullName: trimmed,
      source: "manual",
    };
    setManualTeachers((prev) => [...prev, newTeacher]);
    setManualTeacherName("");
    setError(null);
    toast.success("Enseignant ajouté", "Vous pouvez maintenant lui affecter des classes.");
  }

  function toggleClassSelection(classId: string) {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((value) => value !== classId) : [...prev, classId],
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTeacherId) {
      setError("Veuillez choisir un enseignant.");
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
    if (selectedClassIds.length === 0) {
      setError("Veuillez sélectionner au moins une classe.");
      return;
    }

    setError(null);
    const uniqueClassIds = Array.from(new Set(selectedClassIds));
    setAssignments((prev) => {
      const next = [...prev];
      const existingIdx = next.findIndex(
        (row) => row.teacherId === selectedTeacherId && row.subjectId === subjectId && row.level === levelFilter,
      );
      const payload: AssignmentRow = {
        teacherId: selectedTeacherId,
        subjectId,
        level: levelFilter,
        classIds: uniqueClassIds,
      };
      if (existingIdx >= 0) {
        next[existingIdx] = payload;
      } else {
        next.push(payload);
      }
      return next;
    });
    setSelectedClassIds([]);
    toast.success(
      "Assignation enregistrée",
      "La liaison enseignant/matière/classes est prête pour la validation finale.",
    );
  }

  function labelFromSource(source: TeacherOption["source"]) {
    if (source === "existing") return "Déjà défini";
    if (source === "upload") return "Import fichier";
    return "Ajout manuel";
  }

  const assignmentPreview = useMemo(() => {
    return assignments.map((row) => {
      const teacher = allTeachers.find((item) => item.id === row.teacherId);
      const subject = subjects.find((item) => item.id === row.subjectId);
      const classNames = row.classIds
        .map((id) => classes.find((item) => item.id === id)?.name)
        .filter((value): value is string => Boolean(value));
      return {
        id: `${row.teacherId}-${row.subjectId}-${row.level}`,
        teacher: teacher?.fullName ?? "Enseignant",
        subject: subject?.name ?? "Matière",
        level: row.level,
        classes: classNames,
      };
    });
  }, [assignments, allTeachers, classes, subjects]);

  const selectedTeacherName =
    allTeachers.find((teacher) => teacher.id === selectedTeacherId)?.fullName ?? "Choisissez un enseignant.";

  async function generateTeacherCodes(targetTeacherId?: string) {
    setCodesLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/teachers/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetTeacherId ? { teacherId: targetTeacherId } : {}),
      });
      const body = (await res.json().catch(() => null)) as
        | {
            message?: string;
            codes?: TeacherAccessCodeRow[];
            generated?: number;
            failedCount?: number;
            failed?: Array<{ teacherId: string; reason: string }>;
          }
        | null;
      if (!res.ok) {
        throw new Error(body?.message ?? "Génération des codes impossible.");
      }
      const generatedCodes = body?.codes ?? [];
      setCodeFailures(body?.failed ?? []);
      setAccessCodes((prev) => {
        if (targetTeacherId) {
          const keep = prev.filter((row) => row.teacherId !== targetTeacherId);
          return [...keep, ...generatedCodes];
        }
        return generatedCodes;
      });
      toast.success(
        "Codes générés",
        `${body?.generated ?? generatedCodes.length} code(s) généré(s), ${body?.failedCount ?? 0} échec(s).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la génération des codes.");
    } finally {
      setCodesLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enseignants"
        subtitle="Chargez la liste des enseignants puis assignez leurs classes par niveau."
      />

      <section className="elima-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--accent)]">Liste des enseignants</h2>
          <p className="text-sm text-slate-600">
            Utilisez la liste existante, importez un fichier ou ajoutez les enseignants un à un.
          </p>
        </div>

        {loading ? <p className="text-sm text-slate-500">Chargement des données…</p> : null}
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {!loading ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-800">Import fichier (CSV/TXT)</h3>
              <p className="mt-1 text-xs text-slate-500">
                Une ligne = un enseignant. Le séparateur virgule/point-virgule est accepté.
              </p>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleUploadTeachers}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Ajouter manuellement</label>
                <input
                  value={manualTeacherName}
                  onChange={(event) => setManualTeacherName(event.target.value)}
                  placeholder="Ex: Marie Kouadio"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Action</label>
                <button
                  type="button"
                  onClick={handleAddManualTeacher}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ajouter cet enseignant
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">Liste prête à assigner</h3>
              {allTeachers.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun enseignant disponible pour l’instant.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {allTeachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <p className="text-sm text-slate-700">{teacher.fullName}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {labelFromSource(teacher.source)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <section className="elima-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--accent)]">Assigner les classes</h2>
          <p className="text-sm text-slate-600">
            Sélectionnez un enseignant, une matière, puis un niveau pour afficher seulement les classes concernées.
          </p>
        </div>

        {!loading ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Enseignant</label>
                <select
                  value={selectedTeacherId}
                  onChange={(event) => setSelectedTeacherId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Sélectionner un enseignant</option>
                  {allTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
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

            <div>
                <label className="text-sm font-medium text-slate-700">Niveau</label>
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
              </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-800">Classes du niveau sélectionné</h3>
              {!levelFilter ? (
                <p className="text-sm text-slate-500">Sélectionnez un niveau pour voir les classes.</p>
              ) : null}
              {levelFilter && filteredClasses.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune classe disponible pour ce niveau.</p>
              ) : null}
              {filteredClasses.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedClassIds.includes(item.id)}
                    onChange={() => toggleClassSelection(item.id)}
                    className="h-4 w-4"
                  />
                  <span>
                    {item.name} {item.academic_year ? `· ${item.academic_year}` : ""}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Enseignant actif: {selectedTeacherName}</p>
              <button
                type="submit"
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                Affecter les classes
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold text-[var(--accent)]">Récapitulatif des assignations</h2>
        {assignmentPreview.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune assignation enregistrée pour le moment.</p>
        ) : (
          assignmentPreview.map((row) => (
            <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-800">
                {row.teacher} · {row.subject}
              </p>
              <p className="text-xs text-slate-500">Niveau: {row.level}</p>
              <p className="mt-1 text-sm text-slate-700">
                Classes: {row.classes.length ? row.classes.join(", ") : "Aucune classe"}
              </p>
            </div>
          ))
        )}
      </section>

      <section className="elima-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--accent)]">Codes d&apos;accès enseignants</h2>
            <p className="text-sm text-slate-600">
              Générez les codes provisoires (5 caractères), imprimez la liste et partagez-la aux enseignants.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => generateTeacherCodes()}
              disabled={codesLoading}
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {codesLoading ? "Génération..." : "Générer les codes"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={accessCodes.length === 0}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Imprimer
            </button>
          </div>
        </div>

        {accessCodes.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aucun code généré pour le moment. Cliquez sur “Générer les codes”. Si rien ne sort, les erreurs seront listées ci-dessous.
          </p>
        ) : (
          <div className="space-y-2">
            {accessCodes.map((row) => (
              <div key={row.teacherId} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <p className="font-semibold text-slate-800">{row.fullName}</p>
                <p className="text-slate-600">{row.email}</p>
                <p className="mt-1 text-slate-700">
                  Matricule: <span className="font-mono font-semibold">{row.matricule}</span> · Code provisoire:{" "}
                  <span className="font-mono font-semibold">{row.code}</span>
                </p>
                <button
                  type="button"
                  onClick={() => generateTeacherCodes(row.teacherId)}
                  disabled={codesLoading}
                  className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Régénérer ce code
                </button>
              </div>
            ))}
          </div>
        )}

        {codeFailures.length > 0 ? (
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
            <p className="font-semibold">Échecs de génération</p>
            <ul className="mt-1 space-y-1">
              {codeFailures.map((failure, idx) => (
                <li key={`${failure.teacherId}-${idx}`}>
                  {failure.teacherId}: {failure.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
