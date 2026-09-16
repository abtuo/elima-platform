import { useEffect, useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { PaymentStatusCard } from "@/components/cards/PaymentStatusCard";
import { WebLinkButton } from "@/components/common/WebLinkButton";
import { EmptyState } from "@/components/common/EmptyState";
import { getPayments } from "@/services/paymentService";
import type { PaymentSummary } from "@/types/school";

export function ParentPaymentsPage() {
  const [payments, setPayments] = useState<PaymentSummary[]>([]);

  useEffect(() => { getPayments().then(setPayments); }, []);

  return (
    <PageContainer>
      <AppHeader title="Paiements" subtitle="Frais et échéances" />
      <div className="space-y-3">
        {payments.length ? payments.map((p) => <PaymentStatusCard key={p.id} payment={p} />) : (
          <EmptyState title="Aucun paiement" description="Les paiements apparaîtront ici." />
        )}
      </div>
      <div className="mt-5">
        <WebLinkButton path="/parent/invoices" label="Télécharger mes reçus" />
      </div>
    </PageContainer>
  );
}
