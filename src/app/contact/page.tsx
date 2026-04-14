import { CheckCircle2, Phone, Ticket } from "lucide-react";
import { MarketingHeader } from "@/components/ui/MarketingHeader";
import { DemoRequestForm } from "@/components/ui/DemoRequestForm";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-6 md:px-8 md:py-10">
        <MarketingHeader />

        <section className="elima-card space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-[var(--primary)]">Contact & devis</p>
            <h1 className="text-2xl font-bold text-[var(--accent)]">Nous contacter</h1>
            <p className="text-sm text-slate-600">
              Pour déploiement pilote, support ou partenariat, échangeons ensemble pour bâtir votre projet.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-center gap-2"><Ticket size={16} className="text-[var(--primary)]" /> Email: contact@elima.tech</li>
            <li className="flex items-center gap-2"><Phone size={16} className="text-[var(--primary)]" /> WhatsApp: +225 00 00 00 00</li>
            <li className="flex items-center gap-2"><Ticket size={16} className="text-[var(--primary)]" /> Support écoles: support@elima.tech</li>
          </ul>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="elima-card space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--primary)]">Démo & rendez-vous</p>
              <h2 className="text-2xl font-bold text-[var(--accent)]">Parlons de votre établissement</h2>
              <p className="text-sm text-slate-600">
                Recevez une démonstration personnalisée et un plan de déploiement en 48h.
              </p>
            </div>
            <DemoRequestForm ctaLabel="Envoyer ma demande" />
          </div>
          <div className="elima-card h-full space-y-4">
            <h3 className="text-lg font-semibold">Pourquoi demander une démo ?</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              {[
                "Audit rapide de votre organisation",
                "Projection ROI & gains de temps",
                "Conseils d'intégration Mobile Money",
                "Accès à la feuille de route IA",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 text-[var(--primary)]" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="rounded-2xl bg-[var(--primary)]/10 p-4 text-sm">
              <p className="font-semibold text-[var(--accent)]">Besoin d&apos;une réponse rapide ?</p>
              <p className="text-slate-600">Nous répondons sous 24h avec un plan d’action clair.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
