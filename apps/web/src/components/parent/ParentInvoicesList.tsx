"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import type { ParentInvoiceRow } from "@/lib/finance/parent-invoices";

function money(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function ParentInvoicesList({ studentId }: { studentId?: string }) {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<ParentInvoiceRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
      const res = await fetch(`/api/parent/invoices${qs}`, { cache: "no-store" });
      const body = (await res.json()) as { invoices?: ParentInvoiceRow[] };
      setInvoices(body.invoices ?? []);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" />
        Chargement des factures…
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
        <FileText className="mx-auto text-slate-400" size={36} />
        <p className="mt-3 font-semibold text-slate-800">Aucune facture</p>
        <p className="mt-1 text-sm text-slate-500">Les paiements et commandes passés via Elima apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
      {invoices.map((invoice) => (
        <li key={`${invoice.kind}-${invoice.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{invoice.label}</p>
            <p className="text-sm text-slate-600">
              {invoice.studentName} — {invoice.className}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatDate(invoice.paidAt)} · {invoice.method} · {invoice.invoiceNo}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-lg font-bold tabular-nums text-slate-900">{money(invoice.amount)}</p>
            <a
              href={invoice.downloadHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download size={16} />
              PDF
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
