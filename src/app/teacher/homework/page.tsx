"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";
import { useToast } from "@/components/ui/Toast";

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const subjectName = useMemo(
    () => new Map(subjects.map((s) => [s.id, s.name])),
    [subjects],
  );

  const load = useCallback(() => {
    if (!selectedClassId) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetch(`/api/teacher/homework?classId=${encodeURIComponent(selectedClassId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { homeworks?: HomeworkRow[] } | null) => setItems(body?.homeworks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClassId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addHomework() {
    if (!selectedClassId || !selectedSubjectId || !title.trim()) {
      success("Champs requis", "Classe, matière et titre sont obligatoires.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          title: title.trim(),
          description: description.trim() || null,
          resourceUrl: resourceUrl.trim() || null,
          dueDate,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setTitle("");
      setDescription("");
      setResourceUrl("");
      success("Devoir ajouté", "Visible côté élève et parent.");
      load();
    } catch {
      success("Échec", "Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  async function removeHomework(id: string) {
    try {
      const res = await fetch(`/api/teacher/homework?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setItems((all) => all.filter((x) => x.id !== id));
    } catch {
      success("Échec", "Suppression impossible.");
    }
  }

  return (
    <div className="space-y-6">
      <ProgressHeader title="Devoirs" subtitle="Donnez des devoirs à vos classes (visibles élèves et parents)." />

      <section className="elima-card space-y-4">
        <h2 className="text-lg font-semibold">Nouveau devoir</h2>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 w-fit">
          {selectedClass?.name ?? "Aucune classe"} · {selectedSubject?.name ?? "Aucune matière"}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du devoir"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Consignes / description"
            className="min-h-[90px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2"
          />
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Date limite
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Lien ressource (optionnel)
            <input
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder="https://…"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
            />
          </label>
        </div>
        <button
          disabled={saving}
          onClick={addHomework}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Ajouter le devoir"}
        </button>
      </section>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Devoirs de la classe</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun devoir pour cette classe.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{h.title}</p>
                  <p className="text-xs text-slate-500">
                    {subjectName.get(h.subject_id) ?? "Matière"} · à rendre le {h.due_date}
                  </p>
                  {h.description ? <p className="mt-1 text-sm text-slate-600">{h.description}</p> : null}
                  {h.resource_url ? (
                    <a href={h.resource_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold text-[var(--primary)] underline">
                      Ressource
                    </a>
                  ) : null}
                </div>
                <button
                  onClick={() => removeHomework(h.id)}
                  className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
