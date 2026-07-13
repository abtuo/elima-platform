import type { PaymentSummary } from "@/types/school";
import { ElimaCard } from "@/components/common/ElimaCard";

const statusLabels = { paid: "Payé", pending: "En attente", overdue: "Impayé" };
const statusColors = { paid: "text-green-600 bg-green-50", pending: "text-amber-600 bg-amber-50", overdue: "text-red-600 bg-red-50" };

export function PaymentStatusCard({ payment }: { payment: PaymentSummary }) {
  return (
    <ElimaCard>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-title text-base font-semibold text-accent">{payment.label}</h3>
          <p className="mt-1 text-sm text-gray-500">{payment.date}</p>
        </div>
        <div className="text-right">
          <p className="font-title text-lg font-bold text-accent">{payment.amount.toLocaleString("fr-FR")} F</p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[payment.status]}`}>
            {statusLabels[payment.status]}
          </span>
        </div>
      </div>
    </ElimaCard>
  );
}
