import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/Reveal";
import { MarketingHeader } from "@/components/ui/MarketingHeader";
import { FEATURE_MODULES, getFeatureModule } from "@/lib/feature-modules";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

type FeaturePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return FEATURE_MODULES.map((feature) => ({ slug: feature.slug }));
}

export async function generateMetadata({ params }: FeaturePageProps): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeatureModule(slug);

  if (!feature) {
    return {};
  }

  return {
    title: `${feature.pageTitle} | Elima`,
    description: feature.subtitle,
  };
}

export default async function FeaturePage({ params }: FeaturePageProps) {
  const { slug } = await params;
  const feature = getFeatureModule(slug);

  if (!feature) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-6 md:px-8 md:py-10">
        <MarketingHeader />

        <Reveal>
          <Link
            href="/#produit"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[var(--primary)]"
          >
            <ArrowLeft size={16} />
            Retour aux modules
          </Link>
        </Reveal>

        <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-white to-[var(--primary)]/[0.05] p-6 shadow-sm md:p-10">
          <div className="pointer-events-none absolute -right-16 top-0 h-60 w-60 rounded-full bg-[var(--secondary)]/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-[var(--primary)]/10 blur-3xl" />

          <Reveal className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--primary)]">
                  Module {feature.number}
                </span>
                {feature.ai ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                    <Sparkles size={13} />
                    IA
                  </span>
                ) : null}
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold leading-tight text-[var(--accent)] md:text-6xl">
                  {feature.pageTitle}
                </h1>
                <p className="text-base leading-8 text-slate-600 md:text-lg">{feature.subtitle}</p>
              </div>
            </div>

            <div className="relative h-36 w-36 overflow-hidden rounded-[28px] bg-white shadow-lg ring-1 ring-[var(--primary)]/15 md:h-44 md:w-44">
              <Image
                src={feature.image}
                alt=""
                fill
                sizes="(min-width: 768px) 176px, 144px"
                className="object-cover"
                priority
              />
            </div>
          </Reveal>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <article className="elima-card h-full p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">Description</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--accent)]">Un module pensé pour le quotidien scolaire</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">{feature.description}</p>
            </article>
          </Reveal>

          <Reveal delayMs={80}>
            <article className="elima-card h-full p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">Bénéfices</p>
              <div className="mt-4 space-y-3">
                {feature.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                    <p className="text-sm leading-6 text-slate-700">{benefit}</p>
                  </div>
                ))}
              </div>
            </article>
          </Reveal>
        </section>

        <section className="space-y-5">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">Cas d&apos;usage</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--accent)]">Utile à chaque profil concerné</h2>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {feature.useCases.map((useCase, index) => (
              <Reveal key={useCase.audience} delayMs={index * 60}>
                <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)]/30 hover:shadow-md">
                  <p className="text-base font-semibold text-[var(--accent)]">{useCase.audience}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{useCase.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal>
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="grid items-center gap-5 md:grid-cols-[1fr_auto]">
              <div>
                <h2 className="text-2xl font-bold text-[var(--accent)]">Passez à une gestion scolaire plus claire</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Accédez à Elima et retrouvez vos équipes, vos données et vos décisions au même endroit.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  S&apos;inscrire <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Se connecter
                </Link>
              </div>
            </div>
          </section>
        </Reveal>
      </main>
    </div>
  );
}
