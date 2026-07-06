export type MarketingPlanId = "basic" | "premium" | "custom";

export type MarketingPlan = {
  id: MarketingPlanId;
  title: string;
  pill: string;
  cta: string;
  highlight?: boolean;
  features: string[];
};

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    id: "basic",
    title: "Basic",
    pill: "Gratuit",
    cta: "Essayer maintenant",
    highlight: true,
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
    ],
  },
  {
    id: "premium",
    title: "Premium",
    pill: "Populaire",
    cta: "Demander une démo",
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
    ],
  },
  {
    id: "custom",
    title: "Sur mesure",
    pill: "Entreprise",
    cta: "Demander une démo",
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
