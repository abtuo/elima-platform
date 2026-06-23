"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, Download, PiggyBank, ReceiptText, Wallet, Send } from "lucide-react";

import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useToast } from "@/components/ui/Toast";

type Overview = {
  schoolId: string;
  currency: string;
  totalExpected: number;
  totalCollected: number;
  totalRemaining: number;
  collectionRate: number;
  studentsWithDebt: number;
  source: "model" | "legacy";
};

type UnpaidRow = {
  studentId: string;
  fullName: string;
  className: string;
  parentPhone: string | null;
  expected: number;
  paid: number;
  remaining: number;
  status: "late" | "partial" | "unpaid";
};

function money(value: number, currency: string) {
  return `${value.toLocaleString("fr-FR")} ${currency}`;
}

export default function FinanceDashboardPage() {
  const { success } = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [unpaid, setUnpaid] = useState<UnpaidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState<string | null>(null);
  const [amountDraft, setAmountDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, unpaidRes] = await Promise.all([
        fetch("/api/dashboard/finance"),
        fetch("/api/dashboard/finance/unpaid?limit=200"),
      ]);
      const dash = (await dashRes.json().catch(() => null)) as { overview?: Overview } | null;
      const un = (await unpaidRes.json().catch(() => null)) as { unpaid?: UnpaidRow[] } | null;
      if (dash?.overview) setOverview(dash.overview);
      setUnpaid(un?.unpaid ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currency = overview?.currency ?? "XOF";

  async function recordPayment(row: UnpaidRow) {
    const raw = amountDraft[row.studentId] ?? String(row.remaining);
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      success("Montant invalide", "Saisissez un montant supérieur à 0.");
      return;
    }
    setCollecting(row.studentId);
    try {
      const res = await fetch("/api/dashboard/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: row.studentId, amount, method: "cash" }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; id?: string; receiptNo?: string } | null;
      if (!res.ok || !body?.ok) throw new Error("payment failed");
      success("Paiement enregistré", `Reçu ${body.receiptNo ?? ""}`);
      if (body.id) window.open(`/api/finance/receipt/${body.id}`, "_blank");
      load();
    } catch {
      success("Échec", "Enregistrement du paiement impossible.");
    } finally {
      setCollecting(null);
    }
  }

  function relancer(row: UnpaidRow) {
    if (!row.parentPhone) {
      success("Téléphone manquant", "Aucun numéro parent enregistré.");
      return;
    }
    const phone = row.parentPhone.replace(/[^0-9]/g, "");
    const message = encodeURIComponent(
      `Bonjour, rappel concernant la scolarité de ${row.fullName} (${row.className}). Reste à payer : ${money(row.remaining, currency)}. Merci.`,
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <header className="elima-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--accent)]">Finances</h1>
            <p className="mt-1 text-sm text-slate-600">
              Frais scolaires, encaissements et impayés.
              {overview?.source === "legacy" ? " (données de démonstration)" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/dashboard/finance/export?format=csv"
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Download size={16} /> CSV
            </a>
            <a
              href="/api/dashboard/finance/export?format=xlsx"
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Download size={16} /> Excel
            </a>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total attendu"
          value={overview ? money(overview.totalExpected, currency) : "—"}
          icon={<Banknote size={18} />}
        />
        <StatCard
          title="Total encaissé"
          value={overview ? money(overview.totalCollected, currency) : "—"}
          status="success"
          icon={<PiggyBank size={18} />}
        />
        <StatCard
          title="Reste à collecter"
          value={overview ? money(overview.totalRemaining, currency) : "—"}
          status={overview && overview.totalRemaining > 0 ? "warning" : "default"}
          icon={<Wallet size={18} />}
        />
        <StatCard
          title="Taux de paiement"
          value={overview ? `${overview.collectionRate}%` : "—"}
          status={overview && overview.collectionRate >= 80 ? "success" : "warning"}
          icon={<ReceiptText size={18} />}
        />
      </section>

      <section className="elima-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Impayés ({overview?.studentsWithDebt ?? 0})</h2>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : unpaid.length === 0 ? (
          <EmptyState title="Aucun impayé" description="Tous les frais enregistrés sont soldés." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Élève</th>
                  <th className="py-2 pr-3">Classe</th>
                  <th className="py-2 pr-3">Attendu</th>
                  <th className="py-2 pr-3">Payé</th>
                  <th className="py-2 pr-3">Reste</th>
                  <th className="py-2 pr-3">Encaisser</th>
                  <th className="py-2 pr-3">Relance</th>
                </tr>
              </thead>
              <tbody>
                {unpaid.map((r) => (
                  <tr key={r.studentId} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{r.fullName}</td>
                    <td className="py-2 pr-3 text-slate-600">{r.className}</td>
                    <td className="py-2 pr-3 tabular-nums">{money(r.expected, currency)}</td>
                    <td className="py-2 pr-3 tabular-nums text-emerald-700">{money(r.paid, currency)}</td>
                    <td className="py-2 pr-3 tabular-nums font-semibold text-rose-600">{money(r.remaining, currency)}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1">
                        <input
                          value={amountDraft[r.studentId] ?? ""}
                          onChange={(e) => setAmountDraft((d) => ({ ...d, [r.studentId]: e.target.value }))}
                          placeholder={String(r.remaining)}
                          inputMode="numeric"
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        />
                        <button
                          disabled={collecting === r.studentId}
                          onClick={() => recordPayment(r)}
                          className="rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {collecting === r.studentId ? "…" : "OK"}
                        </button>
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        onClick={() => relancer(r)}
                        className="flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Send size={13} /> WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
