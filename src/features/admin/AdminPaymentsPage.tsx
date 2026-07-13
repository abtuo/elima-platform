import { useEffect, useMemo, useState } from "react";
import { Banknote, CircleCheck, Clock3 } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { WebLinkButton } from "@/components/common/WebLinkButton";
import { PaymentStatusCard } from "@/components/cards/PaymentStatusCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/features/auth/AuthProvider";
import { getPayments } from "@/services/paymentService";
import type { PaymentSummary } from "@/types/school";

export function AdminPaymentsPage() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  useEffect(() => { getPayments().then(setPayments); }, []);
  const totals = useMemo(() => ({ received: payments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0), pending: payments.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.amount, 0) }), [payments]);
  const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: profile.currency || "XOF", maximumFractionDigits: 0 }).format(value);

  return <PageContainer><AppHeader title="Finances" subtitle="Encaissements et suivi des échéances" /><div className="mb-5 grid grid-cols-2 gap-3"><div className="rounded-3xl bg-[#163c30] p-4 text-white"><CircleCheck className="h-5 w-5 text-secondary" /><p className="mt-3 text-xl font-bold">{money(totals.received)}</p><p className="text-xs text-white/60">Encaissé récemment</p></div><div className="rounded-3xl bg-white p-4 shadow-sm"><Clock3 className="h-5 w-5 text-amber-500" /><p className="mt-3 text-xl font-bold text-accent">{money(totals.pending)}</p><p className="text-xs text-gray-500">À régulariser</p></div></div><div className="space-y-3">{payments.length ? payments.map((payment) => <PaymentStatusCard key={payment.id} payment={payment} />) : <EmptyState icon={Banknote} title="Aucun mouvement récent" description="Les encaissements de l’établissement apparaîtront ici." />}</div><div className="mt-5"><WebLinkButton path="/dashboard/finance" label="Gérer la facturation" /></div></PageContainer>;
}
