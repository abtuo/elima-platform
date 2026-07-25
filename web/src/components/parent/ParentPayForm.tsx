"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, Smartphone } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type BalancePayload = {
  student: { id: string; fullName: string; className: string };
  balance: { expected: number; paid: number; remaining: number; status: string };
  currency: string;
};

function money(value: number, currency = "FCFA") {
  return `${value.toLocaleString("fr-FR")} ${currency}`;
}

type Step = "form" | "processing" | "success";

export function ParentPayForm({ studentId }: { studentId: string }) {
  const { success } = useToast();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<BalancePayload | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"mobile_money" | "card">("mobile_money");
  const [provider, setProvider] = useState("Orange Money");
  const [step, setStep] = useState<Step>("form");
  const [receiptNo, setReceiptNo] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [newRemaining, setNewRemaining] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/parent/finance/pay?studentId=${encodeURIComponent(studentId)}`);
      const body = (await res.json()) as BalancePayload | null;
      if (res.ok && body?.student) {
        setPayload(body);
        setAmount(String(body.balance.remaining));
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePay() {
    if (!payload) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      success("Montant invalide", "Saisissez un montant supérieur à 0.");
      return;
    }
    if (value > payload.balance.remaining) {
      success("Montant trop élevé", `Maximum : ${money(payload.balance.remaining)}`);
      return;
    }

    setStep("processing");
    await new Promise((r) => setTimeout(r, 2200));

    try {
      const res = await fetch("/api/parent/finance/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, amount: value, method, provider }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        receiptNo?: string;
        paymentId?: string;
        remaining?: number;
        message?: string;
      };
      if (!res.ok || !body.ok) throw new Error(body.message ?? "Paiement échoué");
      setReceiptNo(body.receiptNo ?? "");
      setPaymentId(body.paymentId ?? "");
      setNewRemaining(body.remaining ?? 0);
      setStep("success");
      success("Paiement confirmé", body.remaining === 0 ? "Solde soldé." : `Reste : ${money(body.remaining ?? 0)}`);
    } catch (err) {
      setStep("form");
      success("Échec", err instanceof Error ? err.message : "Paiement impossible.");
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Chargement du solde…</p>;
  }

  if (!payload) {
    return <p className="text-sm text-rose-600">Impossible de charger les informations de paiement.</p>;
  }

  if (payload.balance.remaining <= 0 && step !== "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
        <p className="mt-3 font-semibold text-emerald-900">Aucun solde à régler</p>
        <p className="mt-1 text-sm text-emerald-800">Les frais de {payload.student.fullName} sont à jour.</p>
        <Link href="/parent/messages" className="mt-4 inline-block text-sm font-semibold text-[var(--primary)]">
          Retour à la messagerie
        </Link>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <Loader2 className="mx-auto animate-spin text-[var(--primary)]" size={36} />
        <p className="mt-4 font-semibold text-slate-800">Paiement en cours…</p>
        <p className="mt-1 text-sm text-slate-500">
          {method === "card" ? "Autorisation bancaire" : `Validation ${provider}`} — simulation démo
        </p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="shrink-0 text-emerald-600" size={32} />
          <div>
            <p className="text-lg font-bold text-emerald-900">Paiement accepté</p>
            <p className="mt-1 text-sm text-emerald-800">
              {payload.student.fullName} — {receiptNo}
            </p>
            {newRemaining > 0 ? (
              <p className="mt-2 text-sm font-semibold text-amber-800">Reste à payer : {money(newRemaining)}</p>
            ) : (
              <p className="mt-2 text-sm font-semibold text-emerald-800">Solde entièrement réglé.</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {paymentId ? (
            <a
              href={`/api/finance/receipt/${paymentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Télécharger le reçu
            </a>
          ) : null}
          <Link href="/parent/invoices" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Mes factures
          </Link>
          <Link href="/parent/messages" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Voir la messagerie
          </Link>
          {newRemaining > 0 ? (
            <button
              type="button"
              onClick={() => {
                setStep("form");
                void load();
              }}
              className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Payer le reste
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Attendu</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{money(payload.balance.expected)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase text-emerald-700">Payé</p>
          <p className="mt-1 text-lg font-bold text-emerald-900">{money(payload.balance.paid)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase text-amber-800">Reste</p>
          <p className="mt-1 text-lg font-bold text-amber-900">{money(payload.balance.remaining)}</p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <label className="text-sm font-semibold text-slate-700">Montant à payer</label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              className="w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setAmount(String(payload.balance.remaining))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Tout payer
            </button>
            <button
              type="button"
              onClick={() => setAmount(String(Math.min(15000, payload.balance.remaining)))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Acompte 15 000
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700">Mode de paiement</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMethod("mobile_money")}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
                method === "mobile_money" ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-slate-200"
              }`}
            >
              <Smartphone size={18} className="text-[var(--primary)]" />
              Mobile Money
            </button>
            <button
              type="button"
              onClick={() => setMethod("card")}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
                method === "card" ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-slate-200"
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
              className="mt-2 w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm"
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

        <button
          type="button"
          onClick={() => void handlePay()}
          className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white hover:opacity-90 sm:w-auto"
        >
          Payer {money(Number(amount) || 0)}
        </button>
        <p className="text-xs text-slate-500">Paiement simulé pour la démo — aucun débit réel.</p>
      </div>
    </div>
  );
}
