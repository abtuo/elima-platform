import Link from "next/link";
import { CheckCircle2, Crown, Rocket, Sparkles, School, Wallet, Bot } from "lucide-react";
import { MarketingHeader } from "@/components/ui/MarketingHeader";
import { MARKETING_PLANS, PRICING_FLEXIBILITY_NOTE } from "@/lib/marketing-plans";

const PLAN_ICONS = {
  basic: { icon: Sparkles, iconChip: School, accent: "from-emerald-500/20 to-lime-400/20" },
  premium: { icon: Crown, iconChip: Wallet, accent: "from-[var(--primary)]/20 to-[var(--secondary)]/20" },
  custom: { icon: Rocket, iconChip: Bot, accent: "from-sky-500/20 to-violet-500/20" },
} as const;

export default function TarifsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 md:px-8 md:py-10">
        <MarketingHeader />
        <section className="space-y-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase text-[var(--primary)]">Tarifs pour les établissements</p>
            <h1 className="text-3xl font-bold text-[var(--accent)]">Des offres adaptées à chaque école</h1>
            <p className="mt-2 text-sm text-slate-600">Choisissez la formule idéale pour votre croissance.</p>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
              {PRICING_FLEXIBILITY_NOTE}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {MARKETING_PLANS.map((plan) => {
              const visuals = PLAN_ICONS[plan.id];
              return (
                <article
                  key={plan.id}
                  className={`relative overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                    plan.highlight ? "border-[var(--primary)]/60 bg-[var(--primary)]/5" : "border-slate-200"
                  }`}
                >
                  <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${visuals.accent}`} />
                  <div className="relative flex items-start gap-3">
                    <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
                      <visuals.icon className="text-[var(--primary)]" size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-lg font-semibold text-transparent">
                          {plan.title}
                        </h2>
                        {plan.highlight ? (
                          <span className="rounded-full bg-[var(--primary)]/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                            Recommandé
                          </span>
                        ) : null}
                      </div>
                      {plan.price ? (
                        <p className="mt-2 text-sm font-semibold leading-snug text-slate-600">{plan.price}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="relative mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    <visuals.iconChip size={13} className="text-[var(--primary)]" />
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
                      href={plan.ctaHref}
                      className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold ${
                        plan.highlight
                          ? "bg-[var(--primary)] text-white hover:opacity-90"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
