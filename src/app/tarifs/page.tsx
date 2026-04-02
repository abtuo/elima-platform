import Link from "next/link";
import { CheckCircle2, Crown, Rocket, Sparkles } from "lucide-react";
import { MarketingHeader } from "@/components/ui/MarketingHeader";

export default function TarifsPage() {
  const plans = [
    {
      title: "Basic",
      icon: Sparkles,
      highlight: true,
      features: [
        "Gestion élèves / classes",
        "Notes & absences",
        "Bulletins",
        "Emploi du temps",
        "Communication avec les parents d'élève",
      ],
    },
    {
      title: "Premium",
      icon: Crown,
      highlight: false,
      features: [
        "Tout Basic",
        "Inscriptions en ligne",
        "Paiements (Mobile Money)",
        "Suivi des paiements",
        "Relances WhatsApp",
        "Dashboard financier",
      ],
    },
    {
      title: "Sur mesure",
      icon: Rocket,
      highlight: false,
      features: [
        "Tout Premium",
        "OCR documents",
        "Assistant administratif",
        "Compta / budget / reporting",
        "Support prioritaire",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 md:px-8 md:py-10">
        <MarketingHeader />
        <section className="space-y-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase text-[var(--primary)]">Tarifs pour les établissements</p>
          <h1 className="text-3xl font-bold text-[var(--accent)]">Des offres adaptées à chaque école</h1>
          <p className="mt-2 text-sm text-slate-600">
            Choisissez la formule idéale pour votre croissance.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.title}
              className={`elima-card flex h-full flex-col gap-4 transition hover:-translate-y-1 hover:shadow-lg ${
                plan.highlight ? "border-[var(--primary)]/60 bg-[var(--primary)]/5" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <plan.icon className="text-[var(--primary)]" size={20} />
                  <h2 className="text-lg font-semibold">{plan.title}</h2>
                </div>
                {plan.highlight ? (
                  <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white">Gratuit</span>
                ) : null}
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {plan.features.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 text-[var(--primary)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                <Link
                  href="/contact"
                  className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold ${
                    plan.highlight
                      ? "bg-[var(--primary)] text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Démarrer maintenant
                </Link>
              </div>
            </article>
          ))}
        </div>
        </section>
      </main>
    </div>
  );
}
