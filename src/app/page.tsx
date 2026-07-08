"use client";

/* eslint-disable react/no-unescaped-entities */

import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { MarketingHeader } from "@/components/ui/MarketingHeader";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  Headphones,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { FEATURE_MODULES } from "@/lib/feature-modules";
import { MARKETING_PLANS } from "@/lib/marketing-plans";

type IconBadgeProps = {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  className?: string;
};

function IconBadge({ icon: Icon, size = "md", className = "" }: IconBadgeProps) {
  const sizes = {
    sm: { wrap: "h-9 w-9", icon: 18 },
    md: { wrap: "h-12 w-12", icon: 22 },
    lg: { wrap: "h-14 w-14", icon: 26 },
  } as const;
  const s = sizes[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--secondary)]/20 ring-1 ring-[var(--primary)]/15 shadow-sm ${s.wrap} ${className}`}
    >
      <Icon className="text-[var(--primary)]" size={s.icon} strokeWidth={2} />
    </span>
  );
}

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

        <header className="grid items-stretch gap-8 md:grid-cols-3">
          <Reveal className="flex h-full min-h-0 flex-col justify-between space-y-5" delayMs={50}>
            <div className="space-y-5">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-[var(--accent)] md:text-5xl">
                Pilotez votre école avec
                <span className="text-[var(--primary)]"> plus de clarté</span>,
                <span className="text-[var(--primary)]"> plus de confiance</span>,
                <span className="text-[var(--primary)]"> plus de revenus</span>.
              </h1>

              <p className="max-w-xl text-base leading-7 text-slate-600">
                Elima centralise la gestion des élèves, des absences, des bulletins, de la communication parents et des
                paiements, des achats de fournitures dans une seule plateforme — enrichie par l&apos;IA pour mieux anticiper et décider.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                S'inscrire
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Se connecter
              </Link>
            </div>
          </Reveal>

          <Reveal className="relative flex h-full min-h-0 flex-col gap-4 md:col-span-2" delayMs={140}>
            <div className="absolute -inset-4 -z-10 rounded-[32px] bg-gradient-to-br from-[var(--primary)]/25 to-[var(--secondary)]/25 blur-xl" />
            <div className="flex h-full min-h-0 flex-1 flex-col gap-4 rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="relative min-h-[260px] w-full flex-1 overflow-hidden rounded-3xl border border-slate-200">
                <video
                  className="h-full w-full object-cover"
                  src="/videos/5388900_Coll_wavebreak_Class_3840x2160.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { k: "Moins d'admin", v: "Des heures économisées chaque semaine sur les tâches répétitives." },
                  { k: "Plus de revenus", v: "Un suivi des paiements et achats plus net pour réduire les impayés." },
                  { k: "Parents engagés", v: "Une communication régulière via les canaux qu'ils utilisent déjà." },
                ].map((stat) => (
                  <div key={stat.v} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm">
                    <p className="text-sm font-bold text-[var(--accent)]">{stat.k}</p>
                    <p className="mt-1 text-xs font-medium text-slate-600">{stat.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </header>

        <Reveal>
          <section className="relative -mx-4 overflow-hidden md:-mx-8">
            <div className="relative aspect-[16/9] w-full md:aspect-[21/9]">
              <Image
                src="/illustration_web_2.png"
                alt="Elima: gestion scolaire, communication parents, paiements et achats de fournitures en une seule plateforme"
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-white/85 via-white/40 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
                  <div className="ml-auto w-full space-y-3 md:w-1/3">
                    <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[var(--accent)] shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                      Une école connectée
                    </p>
                    <h2 className="text-2xl font-bold leading-tight text-[var(--accent)] md:text-3xl">
                      De la direction aux familles, tout converge dans Elima.
                    </h2>
                    <p className="text-sm text-slate-700 md:text-base">
                      Pilotage scolaire, communication parents, paiements et achats de fournitures connectés dans une expérience pensée pour l'Afrique.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

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
                  const Icon = feature.icon;
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
                            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--primary)] shadow-sm ring-1 ring-[var(--primary)]/15 transition group-hover:scale-105 group-hover:bg-[var(--primary)] group-hover:text-white">
                              <Icon size={22} strokeWidth={2} />
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

        <section id="roles" className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <article className="elima-card">
              <h2 className="text-xl font-semibold">Des espaces adaptés à chaque profil</h2>
              <p className="mt-2 text-sm text-slate-600">
                Direction, enseignant, parent ou élève: chacun accède aux informations utiles à son rôle.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <Image
                    src="/african-woman-teaching-children-class.jpg"
                    alt="Enseignante"
                    width={800}
                    height={600}
                    className="h-40 w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <p className="absolute bottom-3 left-3 text-xs font-semibold text-white">Enseignants • Appel et notes</p>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <Image
                    src="/african-kid-enjoying-life.jpg"
                    alt="Élève"
                    width={800}
                    height={600}
                    className="h-40 w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <p className="absolute bottom-3 left-3 text-xs font-semibold text-white">Élèves • Résultats et progression</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {[
                  "Direction: vision claire sur l'activité et les priorités.",
                  "Enseignant: saisie simple et suivi régulier des classes.",
                  "Parent: informations utiles reçues rapidement.",
                  "Élève: progression plus visible et mieux accompagnée.",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[var(--primary)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          <Reveal delayMs={120}>
            <article className="elima-card">
              <h2 className="text-xl font-semibold">Une proposition lisible pour écoles et investisseurs</h2>
              <p className="mt-2 text-sm text-slate-600">
                Elima répond à un besoin de marché clair avec une offre utile au quotidien et une vision de croissance durable.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    title: "Marché adressable",
                    desc: "Un besoin massif de digitalisation des établissements privés.",
                    icon: Building2,
                  },
                  {
                    title: "Usage quotidien",
                    desc: "Direction, enseignants et parents utilisent la solution sur des besoins concrets.",
                    icon: Users,
                  },
                  {
                    title: "Revenus récurrents",
                    desc: "Abonnements annuels et services complémentaires autour des paiements et achats.",
                    icon: CreditCard,
                  },
                  {
                    title: "Confiance renforcée",
                    desc: "Visibilité, traçabilité et communication plus fiable avec les familles.",
                    icon: ShieldCheck,
                  },
                ].map((it) => (
                  <div key={it.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <IconBadge icon={it.icon} size="sm" />
                      <p className="font-semibold">{it.title}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{it.desc}</p>
                  </div>
                ))}
              </div>
            </article>
          </Reveal>
        </section>

        <section id="tarifs" className="space-y-6">
          <Reveal>
            <div className="flex flex-col gap-2 text-center">
              <p className="text-xs font-semibold uppercase text-[var(--primary)]">Tarifs établissements</p>
              <h2 className="text-2xl font-bold text-[var(--accent)]">
                Des offres adaptées à chaque école
              </h2>
              <p className="text-sm text-slate-600">Choisissez la formule idéale pour votre croissance.</p>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconBadge icon={PlanIcon} size="sm" />
                      <h3 className="text-lg font-semibold">{plan.title}</h3>
                    </div>
                    {plan.highlight ? (
                      <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white">
                        {plan.pill}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {plan.pill}
                      </span>
                    )}
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
                      href={plan.id === "basic" ? "/signup/admin" : "/contact"}
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
                  href="/signup"
                  className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  S'inscrire
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Se connecter
                </Link>
              </div>
            </div>
          </section>
        </Reveal>

        <footer className="pb-10 pt-2 text-sm text-slate-600">
          <Reveal>
            <div className="mt-2 rounded-[28px] border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-10">
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.2fr_2fr_1fr_1fr]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Image src="/logo.png" alt="Logo Elima" width={30} height={30} className="rounded-full" />
                    <p className="text-base font-bold text-[var(--accent)]">Elima</p>
                  </div>
                  <p className="text-sm text-slate-600">Plateforme de gestion scolaire intelligente.</p>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <Mail size={16} className="text-[var(--primary)]" />
                      <a className="hover:text-slate-900" href="mailto:contact@elima.africa">
                        contact@elima.africa
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Headphones size={16} className="text-[var(--primary)]" />
                      <a className="hover:text-slate-900" href="mailto:support@elima.africa">
                        support@elima.africa
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone size={16} className="text-[var(--primary)]" />
                      <a className="hover:text-slate-900" href="https://wa.me/33656802188" target="_blank" rel="noopener noreferrer">
                        +33 6 56 80 21 88
                      </a>
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-3 font-semibold text-[var(--accent)]">Modules inclus</p>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {FEATURE_MODULES.map((mod) => (
                      <li key={mod.title} className="flex items-center gap-3">
                        <IconBadge icon={mod.icon} size="sm" />
                        <span className="flex flex-wrap items-center gap-2">
                          {mod.title}
                          {mod.ai ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-700">
                              <Sparkles size={9} />
                              IA
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="mb-3 font-semibold text-[var(--accent)]">Portails utilisateur</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <IconBadge icon={Users} size="sm" /> Direction
                    </li>
                    <li className="flex items-center gap-3">
                      <IconBadge icon={GraduationCap} size="sm" /> Enseignants
                    </li>
                    <li className="flex items-center gap-3">
                      <IconBadge icon={Users} size="sm" /> Parents
                    </li>
                    <li className="flex items-center gap-3">
                      <IconBadge icon={BookOpen} size="sm" /> Élèves
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="mb-3 font-semibold text-[var(--accent)]">Liens utiles</p>
                  <ul className="space-y-2">
                    <li>
                      <Link className="hover:text-slate-900" href="/tarifs">
                        Tarifs
                      </Link>
                    </li>
                    <li>
                      <Link className="hover:text-slate-900" href="/login">
                        Connexion
                      </Link>
                    </li>
                    <li>
                      <Link className="hover:text-slate-900" href="/signup">
                        S'inscrire
                      </Link>
                    </li>
                    <li>
                      <Link className="hover:text-slate-900" href="/contact">
                        Centre d'aide
                      </Link>
                    </li>
                    <li>
                      <Link className="hover:text-slate-900" href="/contact">
                        Contact
                      </Link>
                    </li>
                    <li className="text-slate-500">Mentions légales</li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 border-t border-slate-200/70 pt-6 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-slate-500">© {new Date().getFullYear()} Elima. Tous droits réservés.</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="text-slate-400">Politique de confidentialité</span>
                  <span className="text-slate-400">CGV</span>
                </div>
              </div>
            </div>
          </Reveal>
        </footer>
      </main>
    </div>
  );
}
