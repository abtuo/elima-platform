import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ElimaLogo } from "@/components/common/ElimaLogo";
import { LegalLinks } from "@/components/common/LegalLinks";

export const LEGAL_CONTACT_EMAIL = "support@elima.africa";
const UPDATED_AT = "30 septembre 2026";

type LegalKind = "terms" | "privacy" | "account-deletion";
type Section = { title: string; paragraphs?: React.ReactNode[]; items?: React.ReactNode[] };

const company = <><strong>Elima Tech</strong>, SAS au capital de 4 000 €, immatriculée au RCS de Paris sous le numéro 108 566 720, dont le siège social est situé 47 rue Vivienne, 75002 Paris. Nom commercial : Elima. Site : elima.ci.</>;

const content: Record<LegalKind, { title: string; intro: React.ReactNode; sections: Section[] }> = {
  terms: {
    title: "Conditions d’utilisation",
    intro: <>Les présentes conditions encadrent l’utilisation du service Elima Révision édité par {company}</>,
    sections: [
      { title: "1. Objet du service", paragraphs: [<>Elima Révision propose des QCM, fiches, parcours guidés, outils de progression et une analyse pédagogique de documents. Les contenus générés ou analysés avec l’aide de services d’intelligence artificielle sont des aides à la révision : ils peuvent comporter des erreurs et ne remplacent ni un enseignant ni les consignes officielles.</>] },
      { title: "2. Compte élève", paragraphs: [<>Le compte est personnel. L’élève doit fournir des informations exactes, préserver la confidentialité de son mot de passe et signaler tout accès non autorisé. Pour un utilisateur mineur, l’utilisation doit intervenir avec l’accord et sous la responsabilité de son représentant légal lorsque la loi l’exige.</>] },
      { title: "3. Vérification WhatsApp", paragraphs: [<>Le numéro WhatsApp sert à vérifier l’identité, créer le compte, sécuriser la récupération du mot de passe et se connecter avec le mot de passe choisi. Les coûts éventuels de connexion ou de messagerie facturés par l’opérateur restent à la charge de l’utilisateur.</>] },
      { title: "4. Documents et contenus envoyés", paragraphs: [<>L’utilisateur ne doit envoyer que des documents qu’il est autorisé à utiliser. Sont interdits les contenus illicites, dangereux, portant atteinte aux droits de tiers ou contenant inutilement des données sensibles. Les documents scolaires transmis au Scanner sont traités afin d’en extraire le texte et de produire une analyse pédagogique.</>] },
      { title: "5. Usage acceptable", items: ["Ne pas contourner les protections, quotas ou contrôles d’accès.", "Ne pas perturber le service ni automatiser des demandes abusives.", "Ne pas utiliser le service pour tricher ou présenter un contenu généré comme un travail personnel lorsque cela est interdit."] },
      { title: "6. Disponibilité et évolution", paragraphs: [<>Elima Tech met en œuvre des moyens raisonnables pour assurer la disponibilité et la sécurité du service, sans garantir une disponibilité continue. Le service, ses fonctions et ses quotas peuvent évoluer pour des raisons pédagogiques, techniques, économiques ou de sécurité.</>] },
      { title: "7. Propriété intellectuelle", paragraphs: [<>La marque, l’interface, le logiciel et les contenus propres à Elima restent protégés. L’utilisateur conserve ses droits sur ses documents et accorde à Elima les droits strictement nécessaires à leur traitement pour fournir le service.</>] },
      { title: "8. Suspension et suppression", paragraphs: [<>Elima peut suspendre un compte en cas d’usage frauduleux, dangereux ou contraire aux présentes conditions. L’utilisateur peut supprimer son compte depuis Profil → Réglages → Compte. Les conséquences sont détaillées sur la page Suppression de compte.</>] },
      { title: "9. Droit applicable et contact", paragraphs: [<>Les présentes conditions sont soumises au droit français. Pour toute question : <a className="font-semibold text-primary underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.</>] },
    ],
  },
  privacy: {
    title: "Politique de confidentialité",
    intro: <>Elima Tech agit comme responsable de traitement pour Elima Révision. Cette politique décrit les données traitées, leur utilisation et les droits des utilisateurs.</>,
    sections: [
      { title: "1. Données traitées", items: ["Numéro WhatsApp, prénom, nom, niveau scolaire, école et ville éventuellement déclarées.", "Matières choisies, préférences et profil local Révision.", "Données d’authentification et de sécurité. Le mot de passe est traité par Supabase Auth et n’est pas lisible par Elima.", "Progression, XP, série, quiz, réponses, scores, historique, parcours et fiches.", "Documents envoyés au Scanner, texte extrait par OCR, structure du document et analyse pédagogique produite.", "Données techniques nécessaires à la sécurité et au fonctionnement : adresse IP hachée lorsque prévu, horodatages, erreurs techniques, tentatives et quotas."] },
      { title: "2. Finalités et bases juridiques", items: ["Créer et sécuriser le compte, vérifier le numéro et permettre la connexion : exécution du service et sécurité.", "Personnaliser les révisions, enregistrer la progression et produire les analyses demandées : exécution du service.", "Prévenir les abus, appliquer les quotas et diagnostiquer les incidents : intérêt légitime de sécurité et de maîtrise du service.", "Respecter les obligations légales et répondre aux demandes d’exercice de droits : obligation légale."] },
      { title: "3. Prestataires", paragraphs: [<>Les données peuvent être traitées, dans la limite nécessaire, par <strong>Supabase</strong> pour l’authentification, les bases de données et le stockage temporaire, <strong>Twilio Verify</strong> pour les codes WhatsApp, <strong>Azure Document Intelligence</strong> pour l’OCR et <strong>Azure OpenAI</strong> pour la génération ou l’analyse pédagogique. Ces prestataires agissent selon leurs conditions contractuelles et mesures de protection applicables.</>] },
      { title: "4. Scanner et conservation", paragraphs: [<>Le fichier original n’est envoyé au serveur qu’au lancement de l’analyse. Il est placé dans un espace privé de transit puis supprimé après sa récupération par le service d’analyse, y compris en cas d’échec traité. Le texte OCR, la structure utile et l’analyse pédagogique sont enregistrés dans la fiche de l’utilisateur jusqu’à la suppression du document ou du compte.</>] },
      { title: "5. Durées de conservation", items: ["Compte, profil, progression et contenus personnels : pendant la durée du compte, puis suppression à la demande.", "Documents analysés, texte OCR et analyses : jusqu’à leur suppression depuis Mes documents ou jusqu’à la suppression du compte.", "Autorisations temporaires de vérification : inutilisables après quelques minutes et supprimées au plus tôt après leur expiration, avec une cible technique de 24 heures.", "Tentatives de sécurité hachées : jusqu’à 30 jours afin de limiter les abus.", "Événements de quota IA : fenêtre technique courte, avec nettoyage prévu après 48 heures.", "Autres journaux techniques et de sécurité : durée limitée nécessaire au diagnostic, à la prévention des abus ou au respect d’une obligation légale."] },
      { title: "6. Identité centrale et profil Révision", paragraphs: [<>L’identité Elima centrale et le profil métier Révision sont conservés dans deux environnements distincts et reliés par un identifiant technique. Si le compte Elima est aussi utilisé par une école, Platform, Mobile ou un autre rôle, supprimer Révision ne supprime pas automatiquement cette identité partagée.</>] },
      { title: "7. Destinataires et transferts", paragraphs: [<>L’accès est limité aux personnes autorisées chez Elima et aux prestataires nécessaires. Certains prestataires peuvent traiter des données hors de l’Espace économique européen ; Elima s’appuie alors sur les mécanismes contractuels et garanties prévus par le droit applicable.</>] },
      { title: "8. Droits", paragraphs: [<>Selon le RGPD, l’utilisateur peut demander l’accès, la rectification, l’effacement, la limitation, l’opposition ou la portabilité lorsque ces droits s’appliquent. Il peut également introduire une réclamation auprès de la CNIL. Contact : <a className="font-semibold text-primary underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.</>] },
      { title: "9. Sécurité et mises à jour", paragraphs: [<>Elima applique des contrôles d’accès, des communications chiffrées, des séparations de clés serveur et des limitations d’usage. Cette politique peut évoluer ; la date de mise à jour figure en haut de page.</>] },
    ],
  },
  "account-deletion": {
    title: "Suppression du compte Elima Révision",
    intro: <>Cette page publique explique comment demander la suppression du compte et des données associées. Elle peut être consultée sans être connecté.</>,
    sections: [
      { title: "Supprimer depuis l’application", items: ["Connecte-toi à Elima Révision.", "Ouvre Profil, puis la section Réglages → Compte.", "Choisis Supprimer mon compte.", "Confirme avec ton mot de passe et saisis SUPPRIMER.", "Après suppression, les sessions locales sont effacées et l’application revient à l’accueil public."] },
      { title: "Données Révision supprimées", items: ["Profil Révision et lien technique avec l’identité centrale.", "Matières choisies, préférences, progression et utilisation des indices.", "Quiz, tentatives, scores, parcours, réponses et états de maîtrise personnels.", "Documents, texte OCR, analyses pédagogiques et fiches personnelles issues de ces documents.", "Fichiers temporaires encore présents dans l’espace privé d’import."] },
      { title: "Identité Elima partagée", paragraphs: [<>Si l’identité centrale est uniquement utilisée pour Révision, elle est également supprimée. Si elle est liée à une école, Platform, Mobile ou un autre rôle Elima — ou si ce point ne peut pas être vérifié avec certitude — elle est conservée afin de ne pas supprimer un autre service silencieusement. Seules les données Révision sont alors effacées.</>] },
      { title: "Conservation exceptionnelle", paragraphs: [<>Des éléments strictement nécessaires peuvent être conservés pendant la durée imposée par une obligation légale, la prévention de la fraude, la sécurité ou la défense de droits en justice. Ils ne sont pas réutilisés pour fournir des fonctions de Révision.</>] },
      { title: "Tu n’as plus accès au compte", paragraphs: [<>Écris à <a className="font-semibold text-primary underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> depuis une adresse permettant d’expliquer ta demande. Elima pourra demander des éléments raisonnables pour vérifier ton identité sans demander ton mot de passe ni ton code OTP.</>] },
    ],
  },
};

export function LegalPage({ kind }: { kind: LegalKind }) {
  const page = content[kind];
  return <main className="min-h-screen bg-gray-50 px-4 py-6 text-gray-700 sm:px-6 sm:py-10">
    <article className="mx-auto max-w-3xl rounded-[2rem] bg-white p-6 shadow-sm sm:p-10">
      <header><Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500"><ArrowLeft className="h-4 w-4" />Accueil</Link><ElimaLogo className="mt-7 w-28" /><h1 className="mt-7 font-title text-3xl font-semibold text-accent sm:text-4xl">{page.title}</h1><p className="mt-2 text-xs text-gray-400">Dernière mise à jour : {UPDATED_AT}</p><p className="mt-5 leading-7">{page.intro}</p></header>
      <div className="mt-8 space-y-8">{page.sections.map((section) => <section key={section.title}><h2 className="font-title text-xl font-semibold text-accent">{section.title}</h2>{section.paragraphs?.map((paragraph, index) => <p key={index} className="mt-3 leading-7">{paragraph}</p>)}{section.items ? <ul className="mt-3 list-disc space-y-2 pl-5 leading-7">{section.items.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}</section>)}</div>
      <footer className="mt-10 border-t border-gray-100 pt-6"><LegalLinks className="text-gray-500" /></footer>
    </article>
  </main>;
}
