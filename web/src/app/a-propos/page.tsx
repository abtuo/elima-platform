/* eslint-disable react/no-unescaped-entities */

import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { MarketingHeader } from "@/components/ui/MarketingHeader";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Bot,
  ClipboardList,
  CreditCard,
  FileText,
  HeartHandshake,
  MessageCircleMore,
  School,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const platformCards: Array<{ title: string; text: string; icon: LucideIcon; image?: string }> = [
  {
    title: "Gestion administrative",
    text: "Centraliser les élèves, classes, enseignants, parents, inscriptions et informations essentielles de l'établissement.",
    icon: School,
    image: "/gestion_admin.png",
  },
  {
    title: "Suivi des élèves",
    text: "Suivre les notes, absences, progressions et signaux importants pour mieux accompagner chaque élève.",
    icon: BookOpenCheck,
    image: "/suivi_eleve.png",
  },
  {
    title: "Communication",
    text: "Informer les parents, partager les messages importants et renforcer le lien entre l'école et les familles.",
    icon: MessageCircleMore,
    image: "/communication.png",
  },
  {
    title: "Paiements et achats",
    text: "Faciliter le suivi des frais scolaires, des achats de fournitures, améliorer la transparence et réduire les relances manuelles.",
    icon: CreditCard,
    image: "/paiement.png",
  },
  {
    title: "Organisation scolaire",
    text: "Structurer les documents, emplois du temps, salles, disponibilités et informations pratiques de la vie scolaire.",
    icon: ClipboardList,
    image: "/orga_school.png",
  },
  {
    title: "IA responsable",
    text: "Aider à analyser les données, générer des documents et proposer des recommandations utiles, tout en gardant l'humain au centre.",
    icon: Bot,
    image: "/responsible_ai.png",
  },
];

const impactCards = [
  {
    title: "Moins de papier",
    text: "Réduire les registres manuels, les documents dispersés et les communications imprimées.",
    icon: FileText,
  },
  {
    title: "Plus de suivi",
    text: "Détecter plus tôt les absences, les difficultés et les ruptures de suivi.",
    icon: BarChart3,
  },
  {
    title: "Plus de lien",
    text: "Rapprocher l'école, les parents, les enseignants et les élèves.",
    icon: UsersRound,
  },
  {
    title: "Plus d'équité",
    text: "Rendre progressivement les outils numériques accessibles à davantage d'établissements.",
    icon: HeartHandshake,
  },
];

function IconTile({ icon: Icon, className = "" }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--primary)] shadow-sm ring-1 ring-[var(--primary)]/15 ${className}`}
    >
      <Icon size={22} strokeWidth={2} />
    </span>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-6 md:px-8 md:py-10">
        <MarketingHeader />

        <section className="relative overflow-hidden rounded-[32px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-sky-50 p-5 shadow-sm md:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <Reveal className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--primary)] shadow-sm">
                <Sparkles size={14} />
                À propos d'Elima
              </p>
              <div className="space-y-4">
                <h1 className="text-4xl font-bold leading-tight text-[var(--accent)] md:text-6xl">
                  Plus qu'un logiciel scolaire, une infrastructure pour{" "}
                  <span className="text-[var(--primary)]">
                    faire réussir les élèves.
                  </span>
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                  Elima accompagne les établissements scolaires africains dans leur transformation numérique :
                  gestion scolaire, suivi pédagogique, communication avec les familles, paiements, achats de fournitures et outils
                  d'intelligence artificielle utiles au quotidien.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-900/15 hover:opacity-90"
                >
                  S'inscrire <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Se connecter
                </Link>
              </div>
            </Reveal>

            <Reveal delayMs={120} className="relative">
              <div className="absolute -inset-3 rounded-[36px] bg-gradient-to-br from-[var(--primary)]/20 via-white to-amber-300/20 blur-xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white p-3 shadow-2xl shadow-emerald-950/10">
                <div className="relative overflow-hidden rounded-[26px] bg-slate-50">
                  <Image
                    src="/dashbord.png"
                    alt="Tableau de bord Elima pour piloter une école"
                    width={1600}
                    height={1000}
                    priority
                    className="w-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 right-4 grid gap-3 sm:grid-cols-3">
                    {["Suivi élèves", "Messages familles", "Paiements et achats"].map((item) => (
                      <div key={item} className="rounded-2xl border border-white/60 bg-white/85 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">Une conviction, un engagement</p>
            <h2 className="text-3xl font-bold leading-tight text-[var(--accent)] md:text-4xl">Une conviction, un engagement.</h2>
            <div className="space-y-4 text-sm leading-7 text-slate-600 md:text-base">
              <p>Elima est né d'une conviction profonde : une école mieux organisée peut mieux accompagner chaque élève.</p>
              <p>
                Dans beaucoup d'établissements, les équipes travaillent encore avec des outils dispersés, des registres
                papier, des relances manuelles et une communication parfois difficile avec les familles. Elima veut
                simplifier ce quotidien, sans dénaturer le rôle humain de l'école.
              </p>
            </div>
            <blockquote className="rounded-3xl border-l-4 border-[var(--primary)] bg-white p-5 text-base font-semibold leading-7 text-[var(--accent)] shadow-sm">
              “La technologie ne doit pas remplacer l'école. Elle doit lui donner plus de temps, plus de clarté et plus d'impact.”
            </blockquote>
          </Reveal>

          <Reveal delayMs={120}>
            <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-3 shadow-sm">
              <Image
                src="/african-woman-teaching-children-class.jpg"
                alt="Enseignante accompagnant des élèves dans une classe"
                width={1600}
                height={900}
                className="h-[420px] w-full rounded-[26px] object-cover object-center"
              />
            </div>
          </Reveal>
        </section>

        <section className="space-y-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">La plateforme</p>
            <h2 className="mt-2 text-3xl font-bold text-[var(--accent)] md:text-4xl">Une plateforme pensée pour le terrain.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
              Elima réunit les outils essentiels de la vie scolaire dans une seule plateforme claire, moderne et adaptée
              aux réalités des établissements.
            </p>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {platformCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Reveal key={card.title} delayMs={index * 60}>
                  <article className="group h-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-[var(--primary)]/35 hover:shadow-xl">
                    {card.image ? (
                      <div className="mb-4 overflow-hidden rounded-2xl bg-slate-50">
                        <Image src={card.image} alt="" width={900} height={560} className="h-36 w-full object-cover transition group-hover:scale-[1.03]" />
                      </div>
                    ) : null}
                    <IconTile icon={Icon} />
                    <h3 className="mt-4 text-lg font-semibold text-[var(--accent)]">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="rounded-[32px] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5 shadow-sm md:p-8">
          <Reveal className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">Notre engagement social</p>
            <h2 className="text-3xl font-bold leading-tight text-[var(--accent)] md:text-4xl">
              Le numérique scolaire doit aussi être un levier social.
            </h2>
            <p className="text-sm leading-7 text-slate-600 md:text-base">
              Elima veut construire un modèle accessible, capable d'accompagner des écoles aux réalités différentes.
              Notre ambition est de réduire la charge administrative, renforcer le suivi des élèves, faciliter
              l'implication des parents et aider les établissements à prendre de meilleures décisions.
            </p>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {impactCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Reveal key={card.title} delayMs={index * 70}>
                  <article className="h-full rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">
                    <IconTile icon={Icon} />
                    <h3 className="mt-4 text-base font-semibold text-[var(--accent)]">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
          <Reveal delayMs={120}>
            <p className="mt-8 rounded-3xl border border-emerald-200 bg-white p-5 text-base font-semibold leading-7 text-[var(--accent)] shadow-sm">
              Nous voulons construire progressivement un modèle solidaire, capable de rendre ces outils accessibles à
              des établissements aux réalités économiques différentes.
            </p>
          </Reveal>
        </section>

        <section className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">Notre vision</p>
            <h2 className="text-3xl font-bold leading-tight text-[var(--accent)] md:text-4xl">
              Vers une infrastructure éducative intelligente pour l'Afrique.
            </h2>
            <p className="text-sm leading-7 text-slate-600 md:text-base">
              À long terme, Elima veut devenir bien plus qu'un logiciel de gestion scolaire. Nous voulons construire
              une infrastructure éducative capable d'aider les établissements à mieux piloter, les enseignants à mieux
              accompagner, les parents à mieux suivre et les élèves à mieux progresser.
            </p>
          </Reveal>
          <Reveal delayMs={120}>
            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="relative overflow-hidden rounded-[26px] bg-slate-50">
                <Image
                  src="/image_illustration_elima_1.png"
                  alt="Illustration Elima d'une infrastructure éducative intelligente"
                  width={1600}
                  height={1000}
                  className="h-[360px] w-full object-cover object-center"
                />
              </div>
            </div>
          </Reveal>
        </section>

        <Reveal>
          <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[var(--primary)] via-emerald-700 to-amber-500 p-6 text-white shadow-xl shadow-emerald-950/15 md:p-10">
            <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
              <div className="max-w-3xl space-y-3">
                <h2 className="text-3xl font-bold leading-tight md:text-4xl">Construisons l'école africaine de demain.</h2>
                <p className="text-sm leading-7 text-white/85 md:text-base">
                  Nous collaborons avec des établissements pilotes pour tester, améliorer et déployer Elima dans des
                  conditions réelles. Si votre école souhaite moderniser sa gestion et participer à la construction
                  d'une solution pensée pour le terrain, échangeons.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
                  S'inscrire <ArrowRight size={16} />
                </Link>
                <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">
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
