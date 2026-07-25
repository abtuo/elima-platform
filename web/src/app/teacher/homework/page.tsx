"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Paperclip, Plus, Trash2, Upload, X } from "lucide-react";

import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";
import { useToast } from "@/components/ui/Toast";
import { getAppNow } from "@/lib/app-date";

type HomeworkRow = {
  id: string;
  class_id: string;
  subject_id: string;
  title: string;
  description: string | null;
  resource_url: string | null;
  due_date: string;
};

export default function TeacherHomeworkPage() {
  const { selectedClassId, selectedSubjectId, classes, subjects } = useTeacherContext();
  const { success } = useToast();

  const [items, setItems] = useState<HomeworkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [dueDate, setDueDate] = useState(() => getAppNow().toISOString().slice(0, 10));

  const selectedClass = classes.find((item) => item.id === selectedClassId);
  const selectedSubject = subjects.find((item) => item.id === selectedSubjectId);
  const subjectName = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject.name])), [subjects]);
  const editingHomework = items.find((item) => item.id === editingId);

  const load = useCallback(() => {
    if (!selectedClassId) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetch(`/api/teacher/homework?classId=${encodeURIComponent(selectedClassId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { homeworks?: HomeworkRow[] } | null) => setItems(body?.homeworks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClassId]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setResourceUrl("");
    setResourceFile(null);
    setDueDate(getAppNow().toISOString().slice(0, 10));
  }

  function editHomework(homework: HomeworkRow) {
    setEditingId(homework.id);
    setTitle(homework.title);
    setDescription(homework.description ?? "");
    setResourceUrl(homework.resource_url ?? "");
    setResourceFile(null);
    setDueDate(homework.due_date);
  }

  const resourceFileLabel = resourceFile
    ? `${resourceFile.name} - ${(resourceFile.size / 1024 / 1024).toFixed(2)} Mo`
    : editingHomework?.resource_url
      ? "Document actuel conserve"
      : "Aucun fichier joint";

  async function uploadResourceFile() {
    if (!resourceFile || !selectedClassId || !selectedSubjectId) return null;

    const form = new FormData();
    form.set("classId", selectedClassId);
    form.set("subjectId", selectedSubjectId);
    form.set("file", resourceFile);

    const response = await fetch("/api/teacher/homework/upload", {
      method: "POST",
      body: form,
    });
    const body = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;
    if (!response.ok || !body?.url) {
      throw new Error(body?.message ?? "Upload impossible.");
    }
    return body.url;
  }

  async function saveHomework() {
    if (!selectedClassId || !selectedSubjectId || !title.trim()) {
      success("Champs requis", "Classe, matiere et titre sont obligatoires.");
      return;
    }

    setSaving(true);
    try {
      const uploadedUrl = await uploadResourceFile();
      const finalResourceUrl = uploadedUrl ?? (resourceUrl.trim() || null);
      const response = await fetch("/api/teacher/homework", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          title: title.trim(),
          description: description.trim() || null,
          resourceUrl: finalResourceUrl,
          dueDate,
        }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? "Enregistrement impossible.");

      success(editingId ? "Devoir modifie" : "Devoir ajoute", "Visible cote eleve et parent.");
      resetForm();
      load();
    } catch (err) {
      success("Echec", err instanceof Error ? err.message : "Veuillez reessayer.");
    } finally {
      setSaving(false);
    }
  }

  async function removeHomework(id: string) {
    try {
      const response = await fetch(`/api/teacher/homework?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
      setItems((all) => all.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
    } catch {
      success("Echec", "Suppression impossible.");
    }
  }

  return (
    <div className="space-y-6">
      <ProgressHeader title="Devoirs" subtitle="Ajoutez, consultez et modifiez les devoirs visibles par les eleves et parents." />

      <section className="elima-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{editingId ? "Modifier le devoir" : "Nouveau devoir"}</h2>
            <div className="mt-2 w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {selectedClass?.name ?? "Aucune classe"} - {selectedSubject?.name ?? "Aucune matiere"}
            </div>
          </div>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus size={16} />
              Nouveau devoir
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titre du devoir"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Consignes / description"
            className="min-h-[90px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2"
          />
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Date limite
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Lien ressource (optionnel)
            <input
              value={resourceUrl}
              onChange={(event) => setResourceUrl(event.target.value)}
              disabled={Boolean(resourceFile)}
              placeholder="https://..."
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-3 sm:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Paperclip size={14} className="text-[var(--primary)]" />
                  Document joint
                </p>
                <p className="mt-1 truncate text-sm text-slate-700">{resourceFileLabel}</p>
                <p className="mt-0.5 text-xs text-slate-500">PDF, image, Word, Excel ou TXT - 10 Mo max.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Upload size={16} />
                  Choisir
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,image/png,image/jpeg,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={(event) => {
                      setResourceFile(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {resourceFile ? (
                  <button
                    type="button"
                    onClick={() => setResourceFile(null)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <X size={16} />
                    Retirer
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <button
          disabled={saving}
          onClick={saveHomework}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : editingId ? "Mettre a jour le devoir" : "Ajouter le devoir"}
        </button>
      </section>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Devoirs de la classe</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun devoir pour cette classe.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((homework) => (
              <li key={homework.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{homework.title}</p>
                  <p className="text-xs text-slate-500">
                    {subjectName.get(homework.subject_id) ?? "Matiere"} - a rendre le {homework.due_date}
                  </p>
                  {homework.description ? <p className="mt-1 text-sm text-slate-600">{homework.description}</p> : null}
                  {homework.resource_url ? (
                    <a
                      href={homework.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] underline"
                    >
                      <Paperclip size={13} />
                      Document joint
                    </a>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => editHomework(homework)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="Modifier"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => removeHomework(homework.id)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
