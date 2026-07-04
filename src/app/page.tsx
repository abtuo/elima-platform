"use client";

/* eslint-disable react/no-unescaped-entities */

import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { MarketingHeader } from "@/components/ui/MarketingHeader";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileBarChart2,
  FileText,
  GraduationCap,
  MessageCircleMore,
  Phone,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";

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
              <p className="inline-flex items-center gap-2 rounded-full bg-[var(--secondary)]/25 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                EdTech de gestion scolaire pour l&apos;Afrique de l&apos;Ouest
              </p>

              <h1 className="text-4xl font-bold leading-tight tracking-tight text-[var(--accent)] md:text-5xl">
                Pilotez votre école avec
                <span className="text-[var(--primary)]"> plus de clarté</span>,
                <span className="text-[var(--primary)]"> plus de confiance</span>,
                <span className="text-[var(--primary)]"> plus de revenus</span>.
              </h1>

              <p className="max-w-xl text-base leading-7 text-slate-600">
                Elima centralise la gestion des élèves, des absences, des bulletins, de la communication parents et des paiements
                dans une seule plateforme. Un socle solide pour mieux administrer aujourd'hui et accélérer demain.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Demander une démo <Ticket size={16} />
              </Link>
              <Link
                href="/#tarifs"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Voir les offres <ArrowRight size={16} />
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
                  { k: "Plus de revenus", v: "Un suivi des paiements plus net pour réduire les impayés." },
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
                alt="Elima: gestion scolaire, communication parents et paiements en une seule plateforme"
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
                      Pilotage scolaire, communication parents et paiements connectés dans une expérience pensée pour l'Afrique.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section id="impact" className="space-y-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-[var(--accent)]">Le problème est connu. La réponse doit être concrète.</h2>
              <p className="text-sm text-slate-600">
                Trop d'écoles gèrent encore l'information entre papier, fichiers dispersés et messages non centralisés.
                Elima transforme cette complexité en pilotage clair et actionnable.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="elima-card">
                <h3 className="text-lg font-semibold text-[var(--accent)]">Ce qui freine les établissements</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {[
                    "Temps administratif élevé et ressaisie répétée.",
                    "Suivi difficile des absences, des performances et des impayés.",
                    "Communication parents irrégulière ou trop manuelle.",
                    "Décisions prises sans vue d'ensemble fiable.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-0.5 text-[var(--primary)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="elima-card">
                <h3 className="text-lg font-semibold text-[var(--accent)]">Ce qu'Elima change</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {[
                    "Gestion unifiée des élèves, classes, notes et absences.",
                    "Parents mieux informés via des canaux déjà adoptés.",
                    "Suivi des paiements plus lisible pour sécuriser la trésorerie.",
                    "Indicateurs clairs pour agir plus tôt et plus vite.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-0.5 text-[var(--primary)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section id="produit" className="space-y-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-[var(--accent)]">Tout ce qu'il faut pour piloter une école</h2>
              <p className="text-sm text-slate-600">
                Des modules pensés pour votre réalité terrain: efficacité opérationnelle, communication fiable et décisions mieux informées.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Gestion scolaire",
                  desc: "Écoles, classes, matières, enseignants, élèves et parents centralisés.",
                  icon: GraduationCap,
                },
                {
                  title: "Présences",
                  desc: "Appel rapide par classe, historique et suivi de l'absentéisme.",
                  icon: Users,
                },
                {
                  title: "Notes et bulletins",
                  desc: "Saisie des notes, calcul des moyennes et génération des bulletins.",
                  icon: FileText,
                },
                {
                  title: "Communication parents",
                  desc: "Alertes utiles sur les absences, résultats et informations scolaires.",
                  icon: MessageCircleMore,
                },
                {
                  title: "Paiements et recouvrement",
                  desc: "Suivi des paiements, relances et meilleure visibilité de trésorerie.",
                  icon: Wallet,
                },
                {
                  title: "Tableau de bord direction",
                  desc: "Indicateurs clés pour piloter les performances académiques et financières.",
                  icon: BarChart3,
                },
                {
                  title: "Reprise de données",
                  desc: "Import intelligent de documents existants pour éviter la ressaisie massive.",
                  icon: FileBarChart2,
                },
              ].map((feature, idx) => (
                <Reveal key={feature.title} delayMs={idx * 70} className="elima-card space-y-3">
                  <IconBadge icon={feature.icon} size="md" />
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-slate-600">{feature.desc}</p>
                </Reveal>
              ))}
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
                    desc: "Abonnements annuels et services complémentaires autour des paiements.",
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
            {[
              {
                title: "Basic",
                icon: ClipboardCheck,
                highlight: true,
                features: [
                  "Gestion élèves et classes",
                  "Notes et absences",
                  "Bulletins",
                  "Emploi du temps",
                  "Communication avec les parents d'élève",
                ],
              },
              {
                title: "Premium",
                icon: Ticket,
                highlight: false,
                features: [
                  "Tout Basic",
                  "Inscriptions en ligne",
                  "Moyens de paiement",
                  "Suivi des paiements",
                  "Tableau de bord direction",
                ],
              },
              {
                title: "Sur mesure",
                icon: ShieldCheck,
                highlight: false,
                features: [
                  "Tout Premium",
                  "Accompagnement renforcé",
                  "Modules complémentaires",
                  "Support prioritaire",
                  "Autres fonctionnalités sur demande",
                ],
              },
            ].map((plan) => (
              <Reveal
                key={plan.title}
                className={`elima-card flex h-full flex-col gap-4 transition hover:-translate-y-1 hover:shadow-lg ${
                  plan.highlight ? "border-[var(--primary)]/60 bg-[var(--primary)]/5" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconBadge icon={plan.icon} size="sm" />
                    <h3 className="text-lg font-semibold">{plan.title}</h3>
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
                    {plan.title === "Basic" ? "Essayer maintenant" : "Demander un devis"}
                  </Link>
                </div>
              </Reveal>
            ))}
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
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Demander une démo
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  Créer un compte
                </Link>
              </div>
            </div>
          </section>
        </Reveal>

        <footer className="pb-10 pt-2 text-sm text-slate-600">
          <Reveal>
            <div className="mt-2 rounded-[28px] border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-10">
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Image src="/logo.png" alt="Logo Elima" width={30} height={30} className="rounded-full" />
                    <p className="text-base font-bold text-[var(--accent)]">Elima</p>
                  </div>
                  <p className="text-sm text-slate-600">Plateforme de gestion scolaire intelligente.</p>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <Ticket size={16} className="text-[var(--primary)]" />
                      <a className="hover:text-slate-900" href="mailto:contact@elima.africa">
                        contact@elima.africa
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Ticket size={16} className="text-[var(--primary)]" />
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
                  <p className="mb-3 font-semibold text-[var(--accent)]">Nous contacter</p>
                  <ul className="space-y-2">
                    <li>
                      <Link className="hover:text-slate-900" href="/contact">
                        Démo et rendez-vous
                      </Link>
                    </li>
                    <li>
                      <Link className="hover:text-slate-900" href="/contact">
                        Devis gratuit
                      </Link>
                    </li>
                    <li>
                      <Link className="hover:text-slate-900" href="/contact">
                        Partenariats
                      </Link>
                    </li>
                    <li>
                      <Link className="hover:text-slate-900" href="/contact">
                        Centre d'aide
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="mb-3 font-semibold text-[var(--accent)]">Modules inclus</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <IconBadge icon={ClipboardCheck} size="sm" /> Présences
                    </li>
                    <li className="flex items-center gap-3">
                      <IconBadge icon={FileText} size="sm" /> Notes et bulletins
                    </li>
                    <li className="flex items-center gap-3">
                      <IconBadge icon={MessageCircleMore} size="sm" /> Communication parents
                    </li>
                    <li className="flex items-center gap-3">
                      <IconBadge icon={FileBarChart2} size="sm" /> Analyse de performance
                    </li>
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
                      <Link className="hover:text-slate-900" href="/contact">
                        Demander une démo
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
