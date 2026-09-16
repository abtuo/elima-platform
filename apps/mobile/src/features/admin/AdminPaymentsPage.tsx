import { useEffect, useMemo, useState } from "react";
import { Banknote, CircleCheck, Clock3 } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { GeneratedFeatureIcon } from "@/components/common/GeneratedFeatureIcon";
import { LoadingState } from "@/components/common/LoadingState";
import { WebLinkButton } from "@/components/common/WebLinkButton";
import { PaymentStatusCard } from "@/components/cards/PaymentStatusCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/features/auth/AuthProvider";
import { getPayments } from "@/services/paymentService";
import type { PaymentSummary } from "@/types/school";
import { formatMoney } from "@/lib/currency";

export function AdminPaymentsPage() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getPayments()
      .then((items) => { if (active) setPayments(items); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const totals = useMemo(() => ({ received: payments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0), pending: payments.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.amount, 0) }), [payments]);
  const money = (value: number) => formatMoney(value, profile.currency);

  return <PageContainer><AppHeader title="Finances" subtitle="Encaissements et suivi des échéances" /><div className="mb-5 grid grid-cols-2 gap-3"><div className="relative overflow-hidden rounded-3xl bg-[#163c30] p-4 text-white"><GeneratedFeatureIcon name="payments" className="absolute -right-1 -top-1 h-20 w-20 opacity-80" /><CircleCheck className="relative h-5 w-5 text-secondary" /><p className="relative mt-3 text-xl font-bold">{money(totals.received)}</p><p className="relative text-xs text-white/60">Encaissé récemment</p></div><div className="rounded-3xl bg-white p-4 shadow-sm"><Clock3 className="h-5 w-5 text-amber-500" /><p className="mt-3 text-xl font-bold text-accent">{money(totals.pending)}</p><p className="text-xs text-gray-500">À régulariser</p></div></div><div className="space-y-3">{loading ? <LoadingState label="Chargement des mouvements..." /> : payments.length ? payments.map((payment) => <PaymentStatusCard key={payment.id} payment={payment} />) : <EmptyState icon={Banknote} title="Aucun mouvement récent" description="Les encaissements de l’établissement apparaîtront ici." />}</div><div className="mt-5"><WebLinkButton path="/dashboard/finance" label="Gérer la facturation" /></div></PageContainer>;
}
