"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";
import { useToast } from "@/components/ui/Toast";

type LessonRow = {
  id: string;
  class_id: string;
  subject_id: string;
  lesson_date: string;
  content: string;
  resource_url: string | null;
};

export default function TeacherLessonsPage() {
  const { selectedClassId, selectedSubjectId, selectedTerm, classes, subjects } = useTeacherContext();
  const { success } = useToast();

  const [items, setItems] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [lessonDate, setLessonDate] = useState(() => new Date().toISOString().slice(0, 10));

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const subjectName = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);

  const load = useCallback(() => {
    if (!selectedClassId) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetch(`/api/teacher/lessons?classId=${encodeURIComponent(selectedClassId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { lessons?: LessonRow[] } | null) => setItems(body?.lessons ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClassId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addLesson() {
    if (!selectedClassId || !selectedSubjectId || content.trim().length < 2) {
      success("Champs requis", "Classe, matière et contenu sont obligatoires.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          lessonDate,
          content: content.trim(),
          term: selectedTerm,
          resourceUrl: resourceUrl.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setContent("");
      setResourceUrl("");
      success("Séance enregistrée", "Cahier de textes mis à jour.");
      load();
    } catch {
      success("Échec", "Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  async function removeLesson(id: string) {
    try {
      const res = await fetch(`/api/teacher/lessons?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setItems((all) => all.filter((x) => x.id !== id));
    } catch {
      success("Échec", "Suppression impossible.");
    }
  }

  return (
    <div className="space-y-6">
      <ProgressHeader title="Cahier de textes" subtitle="Consignez le contenu des cours par séance." />

      <section className="elima-card space-y-4">
        <h2 className="text-lg font-semibold">Nouvelle séance</h2>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 w-fit">
          {selectedClass?.name ?? "Aucune classe"} · {selectedSubject?.name ?? "Aucune matière"}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Date de la séance
            <input
              type="date"
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
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
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Contenu du cours, notions abordées…"
            className="min-h-[110px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2"
          />
        </div>
        <button
          disabled={saving}
          onClick={addLesson}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer la séance"}
        </button>
      </section>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Historique du cahier de textes</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune séance enregistrée pour cette classe.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">
                    {l.lesson_date} · {subjectName.get(l.subject_id) ?? "Matière"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{l.content}</p>
                  {l.resource_url ? (
                    <a href={l.resource_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold text-[var(--primary)] underline">
                      Ressource
                    </a>
                  ) : null}
                </div>
                <button
                  onClick={() => removeLesson(l.id)}
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
