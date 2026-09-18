"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Plus, Send, Trash2 } from "lucide-react";

import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";
import { useToast } from "@/components/ui/Toast";
import type { ClassSupplyList } from "@/lib/store/queries";

function statusLabel(status: ClassSupplyList["status"]) {
  if (status === "published") return { text: "Publiée", className: "bg-emerald-100 text-emerald-800" };
  if (status === "pending_validation") return { text: "En attente de validation", className: "bg-sky-100 text-sky-800" };
  return { text: "Brouillon", className: "bg-amber-100 text-amber-900" };
}

export default function TeacherSuppliesPage() {
  const { selectedClassId, classes } = useTeacherContext();
  const { success } = useToast();
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const [list, setList] = useState<ClassSupplyList | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedClassId) {
      setList(null);
      return;
    }
    setLoading(true);
    fetch(`/api/teacher/supplies?classId=${encodeURIComponent(selectedClassId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { list?: ClassSupplyList | null } | null) => setList(body?.list ?? null))
      .catch(() => setList(null))
      .finally(() => setLoading(false));
  }, [selectedClassId]);

  async function addItem() {
    if (!selectedClassId || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          action: "add",
          name: name.trim(),
          quantity: Number(quantity) || 1,
          notes: notes.trim() || null,
        }),
      });
      const body = (await res.json()) as { list?: ClassSupplyList; message?: string };
      if (!res.ok) throw new Error(body.message ?? "Échec");
      setList(body.list ?? null);
      setName("");
      setQuantity("1");
      setNotes("");
      success("Article ajouté", name.trim());
    } catch (err) {
      success("Échec", err instanceof Error ? err.message : "Impossible d'ajouter.");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(itemId: string) {
    if (!selectedClassId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClassId, action: "remove", itemId }),
      });
      const body = (await res.json()) as { list?: ClassSupplyList; message?: string };
      if (!res.ok) throw new Error(body.message ?? "Échec");
      setList(body.list ?? null);
    } catch (err) {
      success("Échec", err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function submitForValidation() {
    if (!selectedClassId || !list) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher/supplies/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClassId }),
      });
      const body = (await res.json()) as { list?: ClassSupplyList; message?: string };
      if (!res.ok) throw new Error(body.message ?? "Échec");
      setList(body.list ?? null);
      success("Liste soumise", "L'administration a été notifiée.");
    } catch (err) {
      success("Échec", err instanceof Error ? err.message : "Soumission impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  const editable = list?.status === "draft";
  const badge = list ? statusLabel(list.status) : null;

  return (
    <div className="space-y-6">
      <ProgressHeader
        title="Fournitures scolaires"
        subtitle="Saisissez la liste par classe, puis validez pour envoi à l'administration."
      />

      <section className="elima-card space-y-4">
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 inline-block">
          Classe : {selectedClass?.name ?? "Aucune"}
        </div>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Chargement…
          </p>
        ) : !list ? (
          <p className="text-sm text-slate-500">Sélectionnez une classe dans l&apos;emploi du temps ou les notes.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{list.title}</span>
                {badge ? (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>{badge.text}</span>
                ) : null}
              </div>
              {list.status === "draft" && list.items.length > 0 ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void submitForValidation()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {submitting ? "Envoi…" : "Valider la liste"}
                </button>
              ) : null}
              {list.status === "pending_validation" ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700">
                  <CheckCircle2 size={14} /> Soumise — en attente de l&apos;admin
                </span>
              ) : null}
            </div>

            <ul className="space-y-2">
              {list.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm">
                  <div>
                    <span className="font-semibold">
                      {item.quantity}× {item.name}
                    </span>
                    {item.notes ? <p className="text-xs text-slate-500">{item.notes}</p> : null}
                  </div>
                  {editable ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void removeItem(item.id)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            {editable ? (
              <div className="grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_80px_1fr_auto]">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Article (ex. Cahier 100 pages)"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  inputMode="numeric"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note optionnelle"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={saving || !name.trim()}
                  onClick={() => void addItem()}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Plus size={14} /> Ajouter
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
