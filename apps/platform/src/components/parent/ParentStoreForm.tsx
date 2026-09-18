"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, PackageCheck, ShoppingBag, Smartphone } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { ClassSupplyList } from "@/lib/store/queries";
import type { ExistingStoreOrder } from "@/lib/finance/parent-invoices";

function money(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  available_for_pickup: "Prête au retrait",
  picked_up: "Retirée",
};

type Step = "browse" | "processing" | "success" | "already_ordered";

function OrderSummary({
  studentName,
  total,
  invoiceNo,
  itemCount,
  downloadHref,
  statusLabel,
}: {
  studentName?: string;
  total: number;
  invoiceNo?: string;
  itemCount?: number;
  downloadHref?: string;
  statusLabel?: string;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50 p-6">
      <div className="flex items-start gap-3">
        <PackageCheck className="shrink-0 text-violet-600" size={32} />
        <div>
          <p className="text-lg font-bold text-violet-900">Commande déjà passée</p>
          <p className="mt-1 text-sm text-violet-800">
            {studentName} — {money(total)}
            {itemCount ? ` — ${itemCount} article(s)` : ""}
          </p>
          {statusLabel ? <p className="mt-1 text-sm font-semibold text-violet-900">Statut : {statusLabel}</p> : null}
          {invoiceNo ? <p className="mt-1 text-xs text-violet-700">Facture {invoiceNo}</p> : null}
          <p className="mt-2 text-sm text-violet-800">Retrait à l&apos;école sous 48h.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {downloadHref ? (
          <a
            href={downloadHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Télécharger la facture
          </a>
        ) : null}
        <Link href="/parent/invoices" className="rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-100">
          Mes factures
        </Link>
        <Link href="/parent/messages" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Messagerie
        </Link>
      </div>
    </div>
  );
}

export function ParentStoreForm({ studentId }: { studentId: string }) {
  const { success } = useToast();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<{ id: string; fullName: string; className: string } | null>(null);
  const [list, setList] = useState<ClassSupplyList | null>(null);
  const [existingOrder, setExistingOrder] = useState<ExistingStoreOrder | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [method, setMethod] = useState<"mobile_money" | "card">("mobile_money");
  const [provider, setProvider] = useState("Orange Money");
  const [step, setStep] = useState<Step>("browse");
  const [orderTotal, setOrderTotal] = useState(0);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [downloadHref, setDownloadHref] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/parent/store?studentId=${encodeURIComponent(studentId)}`, { cache: "no-store" });
      const body = (await res.json()) as {
        student?: typeof student;
        list?: ClassSupplyList | null;
        existingOrder?: ExistingStoreOrder | null;
        message?: string;
      };
      if (body.student) setStudent(body.student);
      if (body.existingOrder) {
        setExistingOrder(body.existingOrder);
        setStep("already_ordered");
      } else {
        setExistingOrder(null);
        setStep("browse");
      }
      if (body.list) {
        setList(body.list);
        setSelected(Object.fromEntries(body.list.items.map((item) => [item.id, true])));
      } else {
        setList(null);
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedItems = useMemo(
    () => (list?.items ?? []).filter((item) => selected[item.id]),
    [list, selected],
  );
  const total = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [selectedItems],
  );

  async function placeOrder() {
    if (!list?.packId || selectedItems.length === 0) {
      success("Sélection vide", "Cochez au moins un article.");
      return;
    }
    setStep("processing");
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const res = await fetch("/api/parent/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          packId: list.packId,
          itemIds: selectedItems.map((i) => i.id),
          paymentMethod: method,
          provider,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        totalAmount?: number;
        invoiceNo?: string;
        downloadHref?: string;
        existingOrder?: ExistingStoreOrder;
        message?: string;
      };
      if (res.status === 409 && body.existingOrder) {
        setExistingOrder(body.existingOrder);
        setStep("already_ordered");
        return;
      }
      if (!res.ok || !body.ok) throw new Error(body.message ?? "Commande échouée");
      setOrderTotal(body.totalAmount ?? total);
      setInvoiceNo(body.invoiceNo ?? "");
      setDownloadHref(body.downloadHref ?? "");
      setStep("success");
      success("Commande confirmée", `${selectedItems.length} article(s) — retrait à l'école.`);
    } catch (err) {
      setStep("browse");
      success("Échec", err instanceof Error ? err.message : "Commande impossible.");
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Chargement de la liste…</p>;

  if (!list || list.items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <ShoppingBag className="mx-auto text-slate-400" size={36} />
        <p className="mt-3 font-semibold text-slate-800">Liste non disponible</p>
        <p className="mt-1 text-sm text-slate-500">L&apos;école n&apos;a pas encore publié la liste de fournitures.</p>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <Loader2 className="mx-auto animate-spin text-[var(--primary)]" size={36} />
        <p className="mt-4 font-semibold">Validation de la commande…</p>
        <p className="mt-1 text-sm text-slate-500">
          {method === "card" ? "Autorisation bancaire" : `Validation ${provider}`}
        </p>
      </div>
    );
  }

  if (step === "already_ordered" && existingOrder) {
    return (
      <OrderSummary
        studentName={student?.fullName}
        total={existingOrder.totalAmount}
        invoiceNo={existingOrder.invoiceNo}
        itemCount={existingOrder.itemCount}
        downloadHref={existingOrder.downloadHref}
        statusLabel={ORDER_STATUS_LABELS[existingOrder.orderStatus] ?? existingOrder.orderStatus}
      />
    );
  }

  if (step === "success") {
    return (
      <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-violet-600" size={32} />
          <div>
            <p className="text-lg font-bold text-violet-900">Commande enregistrée</p>
            <p className="mt-1 text-sm text-violet-800">
              {student?.fullName} — {money(orderTotal)} — retrait à l&apos;école sous 48h.
            </p>
            {invoiceNo ? <p className="mt-1 text-xs text-violet-700">Facture {invoiceNo}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {downloadHref ? (
            <a
              href={downloadHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Télécharger la facture
            </a>
          ) : null}
          <Link href="/parent/invoices" className="rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-100">
            Mes factures
          </Link>
          <Link href="/parent/messages" className="inline-block rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Messagerie
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3">
        <p className="font-semibold text-violet-900">{list.title}</p>
        <p className="text-sm text-violet-800">{student?.fullName} — {list.className}</p>
      </div>

      <ul className="space-y-2">
        {list.items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <input
              type="checkbox"
              checked={Boolean(selected[item.id])}
              onChange={(e) => setSelected((s) => ({ ...s, [item.id]: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800">
                {item.quantity}× {item.name}
              </p>
              {item.notes ? <p className="text-xs text-slate-500">{item.notes}</p> : null}
            </div>
            <p className="shrink-0 font-semibold tabular-nums text-slate-800">{money(item.unitPrice * item.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm text-slate-600">{selectedItems.length} article(s) sélectionné(s)</p>
          <p className="text-xl font-bold text-slate-900">{money(total)}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700">Mode de paiement</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMethod("mobile_money")}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
                method === "mobile_money" ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-slate-200 bg-white"
              }`}
            >
              <Smartphone size={18} className="text-[var(--primary)]" />
              Mobile Money
            </button>
            <button
              type="button"
              onClick={() => setMethod("card")}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
                method === "card" ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-slate-200 bg-white"
              }`}
            >
              <CreditCard size={18} className="text-[var(--primary)]" />
              Carte bancaire
            </button>
          </div>
        </div>

        {method === "mobile_money" ? (
          <div>
            <label className="text-sm font-semibold text-slate-700">Opérateur</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="mt-2 w-full max-w-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option>Orange Money</option>
              <option>MTN MoMo</option>
              <option>Moov Money</option>
              <option>Wave</option>
            </select>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <input placeholder="Numéro de carte" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" defaultValue="4111 1111 1111 1111" readOnly />
            <input placeholder="MM/AA" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" defaultValue="12/28" readOnly />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={selectedItems.length === 0}
            onClick={() => void placeOrder()}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            Commander
          </button>
        </div>
      </div>
    </div>
  );
}
