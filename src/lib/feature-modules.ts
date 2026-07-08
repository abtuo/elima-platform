import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarClock,
  FolderArchive,
  GraduationCap,
  MessageCircleMore,
  Sparkles,
  Wallet,
} from "lucide-react";

export type FeatureModule = {
  number: string;
  slug: string;
  href: string;
  title: string;
  pageTitle: string;
  subtitle: string;
  desc: string;
  description: string;
  benefits: string[];
  useCases: Array<{ audience: string; text: string }>;
  icon: LucideIcon;
  accent: string;
  ai: boolean;
};

export const FEATURE_MODULES: FeatureModule[] = [
  {
    number: "01",
    slug: "gestion-scolaire",
    href: "/fonctionnalites/gestion-scolaire",
    title: "Gestion scolaire",
    pageTitle: "Gestion scolaire",
    subtitle: "Centralisez les informations essentielles de votre établissement dans un espace clair et structuré.",
    desc: "Élèves, classes, matières, enseignants, notes, absences et bulletins — avec import intelligent des listes par IA.",
    description:
      "Le module de gestion scolaire permet de regrouper les élèves, classes, enseignants, matières, parents, inscriptions, notes, absences et bulletins dans une seule plateforme. Il aide l'administration à gagner du temps, réduire les erreurs et garder une vision fiable de la vie scolaire.",
    benefits: [
      "Centralisation des données élèves, enseignants et parents.",
      "Gestion claire des classes, matières et inscriptions.",
      "Suivi des notes, absences et bulletins.",
      "Import intelligent des listes avec l'aide de l'IA.",
      "Moins de fichiers dispersés, plus de fiabilité.",
    ],
    useCases: [
      { audience: "Administration", text: "Gérer les dossiers, classes, inscriptions et bulletins." },
      { audience: "Enseignants", text: "Accéder aux classes, saisir les notes et suivre les absences." },
      { audience: "Parents", text: "Consulter les informations importantes liées à la scolarité." },
      { audience: "Élèves", text: "Bénéficier d'un suivi plus clair et mieux organisé." },
    ],
    icon: GraduationCap,
    accent: "from-emerald-500/15 to-teal-400/10",
    ai: true,
  },
  {
    number: "02",
    slug: "communication",
    href: "/fonctionnalites/communication",
    title: "Communication",
    pageTitle: "Communication école-famille",
    subtitle: "Renforcez le lien entre l'établissement, les parents, les enseignants et les élèves.",
    desc: "Messagerie parents-école, alertes utiles et informations partagées au bon moment.",
    description:
      "Le module Communication facilite les échanges entre l'école et les familles. Il permet de partager les informations importantes, d'envoyer des alertes utiles et de maintenir les parents informés au bon moment.",
    benefits: [
      "Messagerie parents-école plus fluide.",
      "Alertes importantes envoyées au bon moment.",
      "Meilleure circulation de l'information.",
      "Réduction des oublis et messages dispersés.",
      "Parents plus impliqués dans la vie scolaire.",
    ],
    useCases: [
      { audience: "Administration", text: "Diffuser les informations officielles." },
      { audience: "Enseignants", text: "Communiquer plus facilement avec les familles." },
      { audience: "Parents", text: "Recevoir les informations essentielles." },
      { audience: "Élèves", text: "Bénéficier d'un meilleur relais entre l'école et la maison." },
    ],
    icon: MessageCircleMore,
    accent: "from-sky-500/15 to-cyan-400/10",
    ai: false,
  },
  {
    number: "03",
    slug: "paiements",
    href: "/fonctionnalites/paiements",
    title: "Paiements et achats",
    pageTitle: "Paiements et achats scolaires",
    subtitle: "Suivez les frais, encaissements, factures, relances et achats de fournitures avec plus de lisibilité.",
    desc: "Suivi des frais, encaissements, factures, relances et achats de fournitures pour une trésorerie plus lisible.",
    description:
      "Le module Paiements et achats aide les établissements à mieux suivre les frais scolaires, les encaissements, les factures, les relances et les achats de fournitures. Il améliore la transparence financière et simplifie la gestion quotidienne de la trésorerie comme des commandes liées à la vie scolaire.",
    benefits: [
      "Suivi clair des frais scolaires.",
      "Encaissements et factures mieux organisés.",
      "Achat de fournitures scolaires intégré au parcours familles.",
      "Relances plus simples et mieux suivies.",
      "Vision plus lisible de la trésorerie.",
    ],
    useCases: [
      { audience: "Administration", text: "Suivre les paiements, factures, relances et commandes." },
      { audience: "Parents", text: "Mieux visualiser les frais, échéances et achats de fournitures." },
      { audience: "Direction", text: "Piloter les finances et les services associés avec plus de clarté." },
    ],
    icon: Wallet,
    accent: "from-amber-500/15 to-yellow-400/10",
    ai: false,
  },
  {
    number: "04",
    slug: "tableau-de-bord",
    href: "/fonctionnalites/tableau-de-bord",
    title: "Tableau de bord",
    pageTitle: "Tableau de bord intelligent",
    subtitle: "Transformez les données scolaires en indicateurs utiles pour mieux décider.",
    desc: "Indicateurs clés, tendances et analyse prédictive : repérez tôt les élèves à risque et les classes à surveiller.",
    description:
      "Le tableau de bord Elima rassemble les indicateurs clés de l'établissement : effectifs, absences, notes, paiements, tendances et signaux à surveiller. Avec l'analyse prédictive, il aide à repérer plus tôt les élèves à risque et les classes nécessitant une attention particulière.",
    benefits: [
      "Vision globale de la vie scolaire.",
      "Indicateurs clés accessibles rapidement.",
      "Analyse des tendances et signaux faibles.",
      "Repérage plus précoce des élèves à risque.",
      "Décisions plus éclairées pour la direction.",
    ],
    useCases: [
      { audience: "Direction", text: "Suivre les indicateurs stratégiques de l'école." },
      { audience: "Administration", text: "Repérer les anomalies et priorités." },
      { audience: "Enseignants", text: "Mieux comprendre les dynamiques de classe." },
      { audience: "Parents", text: "Bénéficier indirectement d'un meilleur suivi de leur enfant." },
    ],
    icon: BarChart3,
    accent: "from-violet-500/15 to-purple-400/10",
    ai: true,
  },
  {
    number: "05",
    slug: "gestion-des-documents",
    href: "/fonctionnalites/gestion-des-documents",
    title: "Gestion des documents",
    pageTitle: "Gestion des documents",
    subtitle: "Centralisez, archivez et retrouvez vos documents scolaires en quelques secondes.",
    desc: "Archivage centralisé, OCR et recherche intelligente pour retrouver dossiers et pièces en quelques secondes.",
    description:
      "Le module Gestion des documents permet d'archiver les dossiers, pièces justificatives, bulletins, attestations et documents administratifs dans un espace centralisé. Grâce à l'OCR et à la recherche intelligente, les informations importantes deviennent plus faciles à retrouver.",
    benefits: [
      "Archivage centralisé des documents scolaires.",
      "Recherche intelligente dans les fichiers.",
      "OCR pour exploiter les documents scannés.",
      "Réduction du papier et des pertes de documents.",
      "Accès plus rapide aux pièces importantes.",
    ],
    useCases: [
      { audience: "Administration", text: "Retrouver rapidement les dossiers et pièces." },
      { audience: "Direction", text: "Sécuriser et structurer les archives." },
      { audience: "Parents", text: "Transmettre ou recevoir certains documents plus simplement." },
      { audience: "Enseignants", text: "Accéder aux documents utiles selon les droits." },
    ],
    icon: FolderArchive,
    accent: "from-rose-500/15 to-orange-400/10",
    ai: true,
  },
  {
    number: "06",
    slug: "apprentissage-personnalise",
    href: "/fonctionnalites/apprentissage-personnalise",
    title: "Apprentissage personnalisé",
    pageTitle: "Apprentissage personnalisé",
    subtitle: "Aidez chaque élève à progresser avec des recommandations adaptées à son niveau.",
    desc: "Recommandations IA par élève : points à renforcer, progression suivie et parcours adaptés au rythme de chacun.",
    description:
      "Le module Apprentissage personnalisé utilise les données pédagogiques pour proposer des recommandations adaptées à chaque élève. Il permet d'identifier les points à renforcer, de suivre la progression et de proposer des parcours de révision adaptés au rythme de chacun.",
    benefits: [
      "Recommandations adaptées au niveau de l'élève.",
      "Identification des points à renforcer.",
      "Suivi de la progression dans le temps.",
      "Parcours de révision plus ciblés.",
      "Meilleur accompagnement des élèves en difficulté.",
    ],
    useCases: [
      { audience: "Élèves", text: "Réviser selon leurs besoins réels." },
      { audience: "Enseignants", text: "Identifier les difficultés récurrentes." },
      { audience: "Parents", text: "Suivre les progrès et points à travailler." },
      { audience: "Direction", text: "Mieux comprendre les besoins pédagogiques globaux." },
    ],
    icon: Sparkles,
    accent: "from-indigo-500/15 to-fuchsia-400/10",
    ai: true,
  },
  {
    number: "07",
    slug: "organisation-academique-intelligente",
    href: "/fonctionnalites/organisation-academique-intelligente",
    title: "Organisation académique intelligente",
    pageTitle: "Organisation académique intelligente",
    subtitle: "Créez, gérez et consultez les emplois du temps avec plus de clarté.",
    desc: "Emplois du temps, créneaux, salles et disponibilités enseignants — avec assistance IA pour limiter les conflits et offrir une vision claire à toute la communauté éducative.",
    description:
      "Le module Organisation académique intelligente aide les établissements à gérer les emplois du temps, les créneaux, les salles et les disponibilités enseignants. Il offre une meilleure visibilité aux équipes, aux élèves et aux parents, tout en préparant l'intégration d'une assistance IA pour limiter les conflits et optimiser l'organisation.",
    benefits: [
      "Création et consultation des emplois du temps.",
      "Gestion des créneaux, salles et disponibilités.",
      "Visibilité pour les enseignants, élèves et parents.",
      "Réduction des conflits d'organisation.",
      "Assistance IA pour améliorer la planification.",
    ],
    useCases: [
      { audience: "Administration", text: "Organiser les cours, salles et disponibilités." },
      { audience: "Enseignants", text: "Consulter leur journée et leur semaine." },
      { audience: "Élèves", text: "Accéder facilement à leur emploi du temps." },
      { audience: "Parents", text: "Suivre l'organisation scolaire de leur enfant." },
    ],
    icon: CalendarClock,
    accent: "from-cyan-500/15 to-emerald-400/10",
    ai: true,
  },
];

export function getFeatureModule(slug: string) {
  return FEATURE_MODULES.find((feature) => feature.slug === slug);
}
