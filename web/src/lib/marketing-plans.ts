export type MarketingPlanId = "basic" | "premium" | "custom";

export type MarketingPlan = {
  id: MarketingPlanId;
  title: string;
  price?: string;
  cta: string;
  ctaHref: string;
  highlight?: boolean;
  features: string[];
};

export const PRICING_FLEXIBILITY_NOTE =
  "Quelle que soit la formule choisie, nous ajustons l'offre à la réalité de votre établissement : effectifs, priorités pédagogiques et contraintes budgétaires.";

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    id: "basic",
    title: "Basic",
    price: "À partir de 100 000 FCFA/an",
    cta: "Commencer l'essai gratuit",
    ctaHref: "/signup/admin",
    features: [
      "Gestion élèves, classes et matières",
      "Gestion enseignants et codes d'accès",
      "Notes, évaluations et moyennes",
      "Absences et appels",
      "Bulletins PDF personnalisés",
      "Emploi du temps",
      "Devoirs et cahier de textes",
      "Messagerie parents-école",
      "Portails parent et élève",
      "Branding école (logo, cachet)",
      "Cockpit de direction",
      "Support technique 24h/24",
    ],
  },
  {
    id: "premium",
    title: "Premium",
    price: "À partir de 300 000 FCFA/an",
    cta: "Commencer l'essai gratuit",
    ctaHref: "/signup/admin",
    highlight: true,
    features: [
      "Tout Basic",
      "Inscriptions en ligne",
      "Paiements Mobile Money et carte",
      "Suivi des frais et soldes",
      "Factures et reçus PDF",
      "Elima Store (fournitures scolaires)",
      "Dashboard financier et export",
      "Relances impayés (WhatsApp et messagerie)",
      "KPIs, analytics et analyse prédictive",
      "Espace comptable dédié",
      "Support prioritaire",
    ],
  },
  {
    id: "custom",
    title: "Sur mesure",
    cta: "Demander un devis",
    ctaHref: "/contact",
    features: [
      "Tout Premium",
      "Import intelligent des listes d'élèves",
      "OCR de documents administratifs",
      "Assistant administratif IA",
      "Apprentissage personnalisé assisté par IA",
      "Barèmes de frais et échéanciers",
      "Reporting comptable et budgétaire",
      "Pilotage multi-établissements",
      "Accompagnement dédié et support prioritaire",
      "Et plus encore (nous répondons à vos besoins spécifiques)",
    ],
  },
];
