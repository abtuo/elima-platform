import Link from "next/link";
import { Crown } from "lucide-react";

export function PlanUpgradeCard({ requiredPlan }: { requiredPlan: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10">
        <Crown className="text-[var(--primary)]" size={22} />
      </div>
      <h2 className="text-lg font-semibold text-[var(--accent)]">Offre {requiredPlan}</h2>
      <p className="mt-2 text-sm text-slate-600">
        Cette fonctionnalité fait partie de l&apos;offre {requiredPlan}. Contactez-nous pour activer cette formule
        pour votre établissement.
      </p>
      <Link
        href="/contact"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Demander un devis
      </Link>
    </div>
  );
}
