"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Send, ShoppingBag } from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import type { ClassSupplyList } from "@/lib/store/queries";

type ListSummary = {
  id: string;
  title: string;
  status: "draft" | "pending_validation" | "published";
  classId: string;
  className: string;
  itemCount: number;
};

function listStatusLabel(status: ListSummary["status"]) {
  if (status === "published") return "Publiée";
  if (status === "pending_validation") return "À valider";
  return "Brouillon";
}

function listStatusClass(status: ListSummary["status"]) {
  if (status === "published") return "bg-emerald-100 text-emerald-800";
  if (status === "pending_validation") return "bg-sky-100 text-sky-800";
  return "bg-amber-100 text-amber-900";
}

export default function DashboardSuppliesPage() {
  const searchParams = useSearchParams();
  const classFromUrl = searchParams.get("classId");
  const { success } = useToast();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClassSupplyList | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadLists = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/dashboard/supplies", { cache: "no-store" });
      const body = (await res.json()) as { lists?: ListSummary[]; message?: string };
      if (!res.ok) {
        setLists([]);
        setLoadError(body.message ?? "Impossible de charger les listes de fournitures.");
        return;
      }
      const rows = body.lists ?? [];
      setLists(rows);
      setSelectedClassId((prev) => prev ?? classFromUrl ?? rows[0]?.classId ?? null);
    } finally {
      setLoading(false);
    }
  }, [classFromUrl]);

  const loadDetail = useCallback(async (classId: string) => {
    const res = await fetch(`/api/dashboard/supplies?classId=${encodeURIComponent(classId)}`);
    const body = (await res.json()) as { list?: ClassSupplyList | null };
    setDetail(body.list ?? null);
  }, []);

  useEffect(() => {
    if (classFromUrl) setSelectedClassId(classFromUrl);
  }, [classFromUrl]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (selectedClassId) void loadDetail(selectedClassId);
  }, [selectedClassId, loadDetail]);

  async function publish() {
    if (!selectedClassId || !detail) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard/supplies/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClassId, listId: detail.listId }),
      });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(body.message ?? "Échec");
      success("Liste publiée", `${detail.className} — visible pour les parents.`);
      await loadLists();
      await loadDetail(selectedClassId);
    } catch (err) {
      success("Échec", err instanceof Error ? err.message : "Publication impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function notifyParents() {
    if (!selectedClassId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard/supplies/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClassId }),
      });
      const body = (await res.json()) as { notified?: number; message?: string };
      if (!res.ok) throw new Error(body.message ?? "Échec");
      success("Parents notifiés", `${body.notified ?? 0} famille(s) — lien Store envoyé.`);
    } catch (err) {
      success("Échec", err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fournitures scolaires"
        subtitle="Validez les listes par classe et envoyez le lien Store aux parents."
      />

      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="elima-card space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Classes</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Chargement…</p>
          ) : loadError ? (
            <p className="text-sm text-rose-700">{loadError}</p>
          ) : lists.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune liste. Les enseignants peuvent en créer.</p>
          ) : (
            lists.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedClassId(row.classId)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  selectedClassId === row.classId
                    ? "border-[var(--primary)] bg-[var(--primary)]/5 font-semibold"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <p>{row.className}</p>
                <p className="text-xs text-slate-500">
                  {row.itemCount} article(s) · {listStatusLabel(row.status)}
                </p>
              </button>
            ))
          )}
        </aside>

        <div className="elima-card space-y-4">
          {!detail ? (
            <p className="text-sm text-slate-500">Sélectionnez une classe.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={18} className="text-violet-600" />
                    <h2 className="text-lg font-bold text-[var(--accent)]">{detail.title}</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{detail.className} — {detail.items.length} articles</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${listStatusClass(detail.status)}`}>
                  {listStatusLabel(detail.status)}
                </span>
              </div>

              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {detail.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.quantity}× {item.name}
                      </p>
                      {item.notes ? <p className="text-xs text-slate-500">{item.notes}</p> : null}
                    </div>
                    <p className="tabular-nums text-slate-600">
                      {(item.unitPrice * item.quantity).toLocaleString("fr-FR")} FCFA
                    </p>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                {detail.status !== "published" ? (
                  <button
                    type="button"
                    disabled={busy || detail.items.length === 0}
                    onClick={() => void publish()}
                    className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : detail.status === "pending_validation" ? "Valider et publier" : "Publier la liste"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void notifyParents()}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Send size={16} />
                    Envoyer aux parents
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
