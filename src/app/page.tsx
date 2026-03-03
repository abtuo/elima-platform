import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileBarChart2,
  FileText,
  GraduationCap,
  MessageCircleMore,
  Phone,
  Scale,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";


export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Decorative background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[var(--secondary)]/25 blur-3xl" />
        <div className="absolute top-24 right-[-120px] h-[520px] w-[520px] rounded-full bg-[var(--primary)]/15 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[-120px] h-[520px] w-[520px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-6 md:px-8 md:py-10">
        {/* Navbar */}
        <nav className="sticky top-4 z-20 rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo_e-lima-with-text-removebg-preview.png"
                alt="Logo Elima"
                width={190}
                height={56}
                className="h-14 w-auto"
                priority
              />
            </Link>

            <div className="hidden items-center gap-1 text-sm md:flex">
              <Link href="#produit" className="rounded-lg px-3 py-2 hover:bg-slate-100">Produit</Link>
              <Link href="#roles" className="rounded-lg px-3 py-2 hover:bg-slate-100">Pour qui ?</Link>
              <Link href="/tarifs" className="rounded-lg px-3 py-2 hover:bg-slate-100">Tarifs</Link>
              <Link href="/contact" className="rounded-lg px-3 py-2 hover:bg-slate-100">Contact</Link>
              <Link href="/dashboard" className="rounded-lg px-3 py-2 hover:bg-slate-100">Démo</Link>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="grid items-center gap-8 md:grid-cols-2">
          <Reveal className="space-y-5" delayMs={50}>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--secondary)]/25 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
              Votre plateforme de gestion éducative intelligente
            </p>

            <h1 className="text-4xl font-bold leading-tight tracking-tight text-[var(--accent)] md:text-5xl">
              La gestion scolaire,
              <span className="text-[var(--primary)]"> simple</span>,
              <span className="text-[var(--primary)]"> automatisée</span>,
              <span className="text-[var(--primary)]"> pilotée</span>.
            </h1>

            <p className="max-w-xl text-base leading-7 text-slate-600">
              Elima aide les écoles à gérer les présences, notes, bulletins, et à assurer une communication fluide avec les parents.
              Le tout avec une analyse de performance pour détecter les élèves à risque.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Commencer maintenant <ArrowRight size={16} />
              </Link>
              <Link
                href="/tarifs"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Voir nos tarifs <Ticket size={16} />
              </Link>
            </div>

            <div className="grid gap-4 pt-4 sm:grid-cols-3">
              {[{ k: "10+", v: "Écoles pilotes" }, { k: "48h", v: "Mise en place" }, { k: "-30%", v: "Temps admin économisé" }].map(
                (stat) => (
                  <Reveal
                    key={stat.v}
                    delayMs={120}
                    className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm"
                  >
                    <p className="text-2xl font-bold text-[var(--accent)]">{stat.k}</p>
                    <p className="text-xs font-medium text-slate-600">{stat.v}</p>
                  </Reveal>
                ),
              )}
            </div>
          </Reveal>

          <Reveal className="relative" delayMs={140}>
            <div className="absolute -inset-4 -z-10 rounded-[32px] bg-gradient-to-br from-[var(--primary)]/25 to-[var(--secondary)]/25 blur-xl" />
            <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
              {/* Video highlight */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200">
                <video
                  className="h-44 w-full object-cover md:h-52"
                  src="/videos/5388900_Coll_wavebreak_Class_3840x2160.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm font-semibold text-white">Une expérience mobile-first</p>
                  <p className="text-xs text-white/80">Pensée pour les écoles et les parents.</p>
                </div>
              </div>

              <div className="rounded-3xl bg-[var(--accent)]/95 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircleMore size={18} />
                    <p className="text-sm font-semibold">Communication parents</p>
                  </div>
                  <span className="rounded-full bg-white/15 px-2 py-1 text-xs">Instantané</span>
                </div>
                <p className="mt-4 text-sm text-white/80">Absence détectée : Moussa Traoré (6e A)</p>
                <div className="mt-3 rounded-2xl bg-white/10 p-3 text-xs">
                  Bonjour, votre enfant est absent aujourd’hui. Merci de confirmer la raison de l’absence.
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Performance</p>
                    <BarChart3 size={18} className="text-[var(--primary)]" />
                  </div>
                  <p className="mt-2 text-2xl font-bold">13.4/20</p>
                  <p className="text-xs text-slate-600">Moyenne générale</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Assiduité</p>
                    <Bell size={18} className="text-[var(--primary)]" />
                  </div>
                  <p className="mt-2 text-2xl font-bold">94%</p>
                  <p className="text-xs text-slate-600">Taux de présence</p>
                </div>
              </div>
            </div>
          </Reveal>
        </header>

        {/* Product */}
        <Reveal>
          <section id="produit" className="space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-[var(--accent)]">Tout ce qu’il faut pour piloter une école</h2>
            <p className="text-sm text-slate-600">Un MVP complet, mobile-first, prêt à évoluer vers l’IA.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Gestion scolaire",
                desc: "Écoles, classes, matières, enseignants, élèves, parents.",
                icon: GraduationCap,
              },
              {
                title: "Présences",
                desc: "Appel rapide par classe, historique et taux d’absences.",
                icon: Users,
              },
              {
                title: "Notes & bulletins",
                desc: "Saisie notes, moyennes automatiques, génération PDF.",
                icon: FileText,
              },
              {
                title: "Communication parents",
                desc: "Absence, bulletin publié, alertes de suivi.",
                icon: MessageCircleMore,
              },
            ].map((feature, idx) => (
              <Reveal key={feature.title} delayMs={idx * 80} className="elima-card space-y-2">
                <feature.icon className="text-[var(--primary)]" size={20} />
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-slate-600">{feature.desc}</p>
              </Reveal>
            ))}
          </div>
        </section>
        </Reveal>

        {/* Roles */}
        <section id="roles" className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <article className="elima-card">
            <h2 className="text-xl font-semibold">Des espaces adaptés à chaque profil</h2>
            <p className="mt-2 text-sm text-slate-600">
              Directeur, enseignant, parent ou élève : chacun voit uniquement ce qui le concerne.
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
                <p className="absolute bottom-3 left-3 text-xs font-semibold text-white">Enseignants • Appel & Notes</p>
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
                <p className="absolute bottom-3 left-3 text-xs font-semibold text-white">Élèves • Résultats & progression</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {["Direction : KPIs, élèves à risque, bulletins", "Enseignant : appel, notes, évaluations", "Parent : notes, absences, bulletin", "Élève : résultats, progression"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[var(--primary)]" />
                    {item}
                  </li>
                ),
              )}
            </ul>
            </article>
          </Reveal>

          <Reveal delayMs={120}>
            <article className="elima-card">
            <h2 className="text-xl font-semibold">Sécurité & conformité</h2>
            <p className="mt-2 text-sm text-slate-600">RBAC strict par école, validation serveur et logs critiques.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { title: "RBAC", desc: "Rôles par école + contrôle d’accès", icon: ShieldCheck },
                { title: "Validation", desc: "Zod côté serveur", icon: CheckCircle2 },
                { title: "Traçabilité", desc: "Logs événements clés", icon: Bell },
                { title: "Évolutif", desc: "Prêt pour IA/analytics", icon: BarChart3 },
              ].map((it) => (
                <div key={it.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <it.icon size={18} className="text-[var(--primary)]" />
                    <p className="font-semibold">{it.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{it.desc}</p>
                </div>
              ))}
            </div>
            </article>
          </Reveal>
        </section>

        {/* CTA */}
        <Reveal>
          <section className="rounded-[28px] border border-slate-200 bg-white/70 p-6 shadow-sm md:p-10">
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-[var(--accent)]">Démarrer un pilote en 48h</h2>
              <p className="mt-2 text-sm text-slate-600">
                On configure votre école, vos classes, vos utilisateurs et on active la communication parents.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link
                href="/contact"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Parler à l’équipe
              </Link>
              <Link
                href="/login"
                className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </section>
        </Reveal>

        {/* Footer (mega) */}
        <footer className="pb-10 pt-2 text-sm text-slate-600">
          <Reveal>
            <div className="mt-2 rounded-[28px] border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-10">
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Image src="/logo_e-lima.png" alt="Logo Elima" width={30} height={30} className="rounded-full" />
                    <p className="text-base font-bold text-[var(--accent)]">Elima</p>
                  </div>
                  <p className="text-sm text-slate-600">Plateforme de gestion scolaire intelligente.</p>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2"><Ticket size={16} className="text-[var(--primary)]" /> Support : support@elima.tech</p>
                    <p className="flex items-center gap-2"><Phone size={16} className="text-[var(--primary)]" /> +225 01 23 45 67 89</p>
                  </div>
                </div>

                <div>
                  <p className="mb-3 font-semibold text-[var(--accent)]">Nous contacter</p>
                  <ul className="space-y-2">
                    <li><Link className="hover:text-slate-900" href="/contact">Démo & rendez-vous</Link></li>
                    <li><Link className="hover:text-slate-900" href="/contact">Devis gratuit</Link></li>
                    <li><Link className="hover:text-slate-900" href="/contact">Partenariats</Link></li>
                    <li><Link className="hover:text-slate-900" href="/contact">Centre d’aide</Link></li>
                  </ul>
                </div>

                <div>
                  <p className="mb-3 font-semibold text-[var(--accent)]">Modules inclus</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2"><ClipboardCheck size={16} className="text-[var(--primary)]" /> Présences</li>
                    <li className="flex items-center gap-2"><FileText size={16} className="text-[var(--primary)]" /> Notes & bulletins</li>
                    <li className="flex items-center gap-2"><MessageCircleMore size={16} className="text-[var(--primary)]" /> Communication parents</li>
                    <li className="flex items-center gap-2"><FileBarChart2 size={16} className="text-[var(--primary)]" /> Analyse performance</li>
                  </ul>
                </div>

                <div>
                  <p className="mb-3 font-semibold text-[var(--accent)]">Portails utilisateur</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2"><Users size={16} className="text-[var(--primary)]" /> Direction</li>
                    <li className="flex items-center gap-2"><GraduationCap size={16} className="text-[var(--primary)]" /> Enseignants</li>
                    <li className="flex items-center gap-2"><Users size={16} className="text-[var(--primary)]" /> Parents</li>
                    <li className="flex items-center gap-2"><BookOpen size={16} className="text-[var(--primary)]" /> Élèves</li>
                  </ul>
                </div>

                <div>
                  <p className="mb-3 font-semibold text-[var(--accent)]">Liens utiles</p>
                  <ul className="space-y-2">
                    <li><Link className="hover:text-slate-900" href="/tarifs">Tarifs</Link></li>
                    <li><Link className="hover:text-slate-900" href="/login">Connexion</Link></li>
                    <li><Link className="hover:text-slate-900" href="/dashboard">Démo</Link></li>
                    <li className="flex items-center gap-2"><Scale size={16} className="text-[var(--primary)]" /> Mentions légales</li>
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
