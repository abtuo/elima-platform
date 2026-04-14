import Link from "next/link";
import { CheckCircle2, Crown, Rocket, Sparkles, School, Wallet, Bot } from "lucide-react";
import { MarketingHeader } from "@/components/ui/MarketingHeader";

export default function TarifsPage() {
  const plans = [
    {
      title: "Basic",
      icon: Sparkles,
      pill: "Gratuit",
      accent: "from-emerald-500/20 to-lime-400/20",
      iconChip: School,
      features: [
        "Gestion élèves / classes",
        "Notes & absences",
        "Bulletins",
        "Emploi du temps",
        "Communication avec les parents d'élève",
      ],
      cta: "Essayer maintenant",
    },
    {
      title: "Premium",
      icon: Crown,
      pill: "Populaire",
      accent: "from-[var(--primary)]/20 to-[var(--secondary)]/20",
      iconChip: Wallet,
      features: [
        "Tout Basic",
        "Inscriptions en ligne",
        "Paiements (Mobile Money)",
        "Suivi des paiements",
        "Relances WhatsApp",
        "Dashboard financier",
      ],
      cta: "Demander une démo",
    },
    {
      title: "Sur mesure",
      icon: Rocket,
      pill: "Entreprise",
      accent: "from-sky-500/20 to-violet-500/20",
      iconChip: Bot,
      features: [
        "Tout Premium",
        "OCR documents",
        "Assistant administratif",
        "Compta / budget / reporting",
        "Support prioritaire",
      ],
      cta: "Parler à un expert",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 md:px-8 md:py-10">
        <MarketingHeader />
        <section className="space-y-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase text-[var(--primary)]">Tarifs pour les établissements</p>
            <h1 className="text-3xl font-bold text-[var(--accent)]">
              Des offres <span className="text-[var(--primary)]">adaptées</span> à chaque école
            </h1>
            <p className="mt-2 text-sm text-slate-600">Choisissez la formule idéale pour votre croissance.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.title}
                className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${plan.accent}`} />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
                      <plan.icon className="text-[var(--primary)]" size={20} />
                    </div>
                    <h2 className="text-lg font-semibold">{plan.title}</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {plan.pill}
                  </span>
                </div>
                <div className="relative mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  <plan.iconChip size={13} className="text-[var(--primary)]" />
                  Conçu pour les écoles africaines
                </div>
                <ul className="relative mt-4 space-y-2 text-sm text-slate-600">
                  {plan.features.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-0.5 text-[var(--primary)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="relative mt-5">
                  <Link
                    href="/contact"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    {plan.title === "Basic" ? "Essayer maintenant" : plan.cta}
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
