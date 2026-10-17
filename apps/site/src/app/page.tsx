"use client";

/* eslint-disable react/no-unescaped-entities */

import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { MarketingHeader } from "@/components/ui/MarketingHeader";
import { IconBadge } from "@/components/IconBadge";
import { RevisionSection } from "@/components/RevisionSection";
import { platformLoginUrl } from "@/lib/urls";
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  MessageCircleMore,
  School,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { FEATURE_MODULES } from "@/lib/feature-modules";
import { MARKETING_PLANS, PRICING_FLEXIBILITY_NOTE } from "@/lib/marketing-plans";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[var(--secondary)]/25 blur-3xl" />
        <div className="absolute top-24 right-[-120px] h-[520px] w-[520px] rounded-full bg-[var(--primary)]/15 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[-120px] h-[520px] w-[520px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute inset-0 opacity-60">
          <div className="absolute left-0 top-20 h-48 w-[120%] -translate-x-10 animate-[wave_18s_ease-in-out_infinite] rounded-full border border-[var(--primary)]/20" />
          <div className="absolute left-0 top-60 h-56 w-[130%] -translate-x-16 animate-[wave_22s_ease-in-out_infinite] rounded-full border border-[var(--secondary)]/25" />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-6 md:px-8 md:py-10">
        <MarketingHeader />

        <header className="relative isolate grid min-w-0 items-start gap-x-6 gap-y-8 overflow-hidden rounded-[2rem] border border-white/80 px-5 py-10 shadow-[0_24px_70px_rgba(15,64,45,0.12)] sm:px-8 sm:py-12 lg:min-h-[690px] lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:px-10 lg:py-14 xl:px-12">
          <Image
            src="/hero_landscape.png"
            alt="Des élèves devant leur établissement scolaire équipé avec Elima"
            fill
            priority
            sizes="(max-width: 1152px) 100vw, 1152px"
            className="-z-20 object-cover object-[64%_center] lg:object-center"
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white/95 via-white/85 to-white/25 lg:bg-gradient-to-r lg:from-white lg:via-white/85 lg:to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-emerald-950/10 to-transparent" />

          <Reveal className="relative z-10 min-w-0 lg:col-start-1 lg:row-start-1" delayMs={50}>
            <div className="min-w-0 max-w-2xl">
              <h1 className="text-[2.7rem] font-bold leading-[1.03] tracking-[-0.04em] text-[var(--accent)] sm:text-[3.2rem] lg:text-[clamp(2.45rem,3.1vw,2.9rem)]">
                <span className="block lg:whitespace-nowrap">Transformer l’éducation</span>
                <span className="block text-[var(--primary)] lg:whitespace-nowrap">en Afrique à l’ère</span>
                <span className="block text-[var(--primary)] lg:whitespace-nowrap">du numérique.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Avec Elima, simplifiez la gestion scolaire, fluidifiez la communication avec les familles, centralisez les paiements et offrez à chaque élève une révision personnalisée par l’IA.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/contact"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition duration-300 hover:-translate-y-0.5 hover:brightness-105"
                >
                  Démarrer gratuitement
                </Link>
                <Link
                  href={platformLoginUrl}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300/90 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:text-[var(--primary)]"
                >
                  Se connecter
                </Link>
              </div>

            </div>
          </Reveal>

          <Reveal className="relative z-0 min-h-[400px] min-w-0 w-full sm:min-h-[500px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-[575px]" delayMs={140}>
            <div aria-hidden className="absolute bottom-[-2%] left-[4%] h-[58%] w-[88%] rounded-full bg-gradient-to-r from-emerald-300/45 via-sky-200/35 to-violet-300/45 blur-3xl" />

            <div className="absolute bottom-[3%] left-[1%] z-10 w-[84%] overflow-hidden rounded-xl border border-white/90 bg-white/95 p-1 shadow-[0_30px_70px_rgba(15,64,45,0.25)] ring-1 ring-emerald-100/70 backdrop-blur-sm transition duration-500 ease-out hover:-translate-y-2 hover:rotate-0 hover:shadow-[0_36px_85px_rgba(15,64,45,0.32)] sm:left-0 sm:w-[86%] sm:rounded-2xl sm:p-1.5 lg:bottom-[-8%] lg:w-[80%] lg:-rotate-2">
              <Image
                src="/web_view.png"
                alt="Tableau de bord web Elima pour la gestion d’un établissement"
                width={1536}
                height={1080}
                loading="eager"
                sizes="(max-width: 1023px) 82vw, 44vw"
                className="h-auto w-full rounded-[0.6rem] sm:rounded-xl"
              />
              <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/25 via-transparent to-emerald-100/15" />
            </div>

            <div className="absolute bottom-0 right-[1%] z-20 w-[32%] overflow-hidden rounded-[1.15rem] border border-white bg-white/95 p-1 shadow-[0_30px_70px_rgba(76,29,149,0.28)] ring-1 ring-violet-200/70 backdrop-blur-sm transition duration-500 ease-out hover:-translate-y-3 hover:rotate-0 hover:scale-[1.03] hover:shadow-[0_38px_90px_rgba(76,29,149,0.34)] sm:right-0 sm:w-[32%] sm:rounded-[1.65rem] sm:p-1.5 lg:bottom-[-5%] lg:w-[34%] lg:rotate-3">
              <Image
                src="/mobiles_view.png"
                alt="Vue mobile Elima de révision personnalisée pour les élèves"
                width={768}
                height={1024}
                sizes="(max-width: 1023px) 25vw, 13vw"
                className="h-auto w-full rounded-[0.85rem] sm:rounded-[1.25rem]"
              />
              <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/30 via-transparent to-violet-100/20" />
            </div>
          </Reveal>

          <Reveal className="relative z-10 min-w-0 lg:col-start-1 lg:row-start-2" delayMs={190}>
            <div className="grid min-w-0 grid-cols-2 gap-3" aria-label="Les bénéfices Elima">
              {[
                { label: "Gestion scolaire", icon: School, tone: "bg-emerald-50 text-emerald-700" },
                { label: "Communication familles", icon: MessageCircleMore, tone: "bg-amber-50 text-amber-700" },
                { label: "Paiements simplifiés", icon: CreditCard, tone: "bg-blue-50 text-blue-700" },
                { label: "Révision personnalisée par l’IA", icon: Sparkles, tone: "bg-violet-50 text-violet-700" },
              ].map((benefit) => (
                <div
                  key={benefit.label}
                  className="group flex min-h-20 min-w-0 items-center gap-3 rounded-2xl border border-white/90 bg-white/85 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_34px_rgba(15,23,42,0.11)]"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${benefit.tone}`}>
                    <benefit.icon aria-hidden size={19} strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 text-xs font-bold leading-5 text-[var(--accent)] sm:text-sm">{benefit.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </header>

        <section id="roles">
          <Reveal>
            <article className="elima-card overflow-hidden p-0">
              <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="p-5 md:p-7">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">Espaces utilisateurs</p>
                  <h2 className="mt-2 text-2xl font-bold text-[var(--accent)]">Des espaces adaptés à chaque profil</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
                    Elima organise les informations selon les besoins de chacun : la direction pilote, les enseignants
                    suivent leurs classes, les parents restent informés et les élèves avancent avec plus de clarté.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        title: "Direction",
                        desc: "Une vision claire sur l'activité, les priorités et les décisions à prendre.",
                        icon: Users,
                      },
                      {
                        title: "Enseignants",
                        desc: "Des outils simples pour l'appel, les notes, les devoirs et le suivi des classes.",
                        icon: GraduationCap,
                      },
                      {
                        title: "Parents",
                        desc: "Les messages, paiements, achats et informations scolaires au bon endroit.",
                        icon: Users,
                      },
                      {
                        title: "Élèves",
                        desc: "Une progression plus visible, mieux suivie et mieux accompagnée.",
                        icon: BookOpen,
                      },
                    ].map((profile) => (
                      <div key={profile.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                          <IconBadge icon={profile.icon} size="sm" />
                          <p className="font-semibold text-[var(--accent)]">{profile.title}</p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{profile.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative m-4 min-h-[260px] overflow-hidden rounded-3xl bg-white">
                  <Image
                    src="/african-kid-enjoying-life.jpg"
                    alt="Élève souriant accompagné dans son parcours scolaire"
                    width={800}
                    height={600}
                    className="h-full min-h-[260px] w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                  <p className="absolute bottom-5 left-5 right-5 text-sm font-semibold text-white">
                    Une expérience plus lisible pour toute la communauté éducative.
                  </p>
                </div>
              </div>
            </article>
          </Reveal>
        </section>

        <Reveal>
          <section id="produit" className="relative space-y-10 overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-b from-white via-white to-[var(--primary)]/[0.04] p-6 shadow-sm md:p-10">
            <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-[var(--secondary)]/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[var(--primary)]/10 blur-3xl" />

            <div className="relative mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">Modules Elima</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--accent)] md:text-3xl">
                Tout ce qu&apos;il faut pour piloter une école
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
                Des modules pensés pour votre réalité terrain : efficacité opérationnelle, communication fiable,
                décisions éclairées par l&apos;IA et analyse prédictive intégrée.
              </p>
            </div>

            <div className="relative mx-auto max-w-3xl md:max-w-4xl">
              <div
                aria-hidden
                className="absolute bottom-0 left-5 top-0 w-0.5 bg-gradient-to-b from-[var(--primary)]/50 via-[var(--primary)]/30 to-transparent md:left-1/2 md:-translate-x-1/2"
              />

              <div className="space-y-8 md:space-y-12">
                {FEATURE_MODULES.map((feature, idx) => {
                  const isLeft = idx % 2 === 0;
                  return (
                    <Reveal key={feature.title} delayMs={idx * 80}>
                      <div
                        className={`relative flex ${isLeft ? "md:justify-start" : "md:justify-end"}`}
                      >
                        <span
                          className="absolute left-5 top-8 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[var(--primary)] to-[#1d8a52] text-xs font-bold text-white shadow-lg shadow-[var(--primary)]/25 ring-4 ring-[var(--primary)]/10 md:left-1/2"
                          aria-hidden
                        >
                          {idx + 1}
                        </span>

                        <Link
                          href={feature.href}
                          className={`group relative ml-12 block w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-[var(--primary)]/35 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60 md:ml-0 md:w-[calc(50%-2.5rem)] ${
                            isLeft ? "md:mr-10" : "md:ml-10"
                          }`}
                        >
                          <div
                            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-60 transition group-hover:opacity-100`}
                          />
                          <div className={`relative flex items-start gap-4 ${isLeft ? "md:flex-row" : "md:flex-row-reverse md:text-right"}`}>
                            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[var(--primary)]/15 transition group-hover:scale-105">
                              <Image
                                src={feature.image}
                                alt=""
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">
                                  Module {feature.number}
                                </p>
                                {feature.ai ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                                    <Sparkles size={10} />
                                    IA
                                  </span>
                                ) : null}
                              </div>
                              <h3 className="mt-1 text-lg font-semibold text-[var(--accent)]">{feature.title}</h3>
                              <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.desc}</p>
                            </div>
                          </div>
                        </Link>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </section>
        </Reveal>

        <RevisionSection />
        <section id="tarifs" className="space-y-6">
          <Reveal>
            <div className="flex flex-col gap-2 text-center">
              <p className="text-xs font-semibold uppercase text-[var(--primary)]">Tarifs établissements</p>
              <h2 className="text-2xl font-bold text-[var(--accent)]">
                Des offres adaptées à chaque école
              </h2>
              <p className="text-sm text-slate-600">Choisissez la formule idéale pour votre croissance.</p>
              <p className="mx-auto mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                {PRICING_FLEXIBILITY_NOTE}
              </p>
            </div>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {MARKETING_PLANS.map((plan) => {
              const planIcons = {
                basic: ClipboardCheck,
                premium: Ticket,
                custom: ShieldCheck,
              } as const;
              const PlanIcon = planIcons[plan.id];
              return (
                <Reveal
                  key={plan.id}
                  className={`elima-card flex h-full flex-col gap-4 transition hover:-translate-y-1 hover:shadow-lg ${
                    plan.highlight ? "border-[var(--primary)]/60 bg-[var(--primary)]/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <IconBadge icon={PlanIcon} size="sm" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-[var(--accent)]">{plan.title}</h3>
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
                      href={plan.ctaHref}
                      className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold ${
                        plan.highlight
                          ? "bg-[var(--primary)] text-white"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <Reveal>
          <section className="rounded-[28px] border border-slate-200 bg-white/70 p-6 shadow-sm md:p-10">
            <div className="grid items-center gap-6 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-bold text-[var(--accent)]">Passez de la complexité au pilotage maîtrisé</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Échangeons sur vos priorités: administration, performance, communication parents et recouvrement.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  href="/contact"
                  className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  Demander une démo
                </Link>
                <Link
                  href={platformLoginUrl}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
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
