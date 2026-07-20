# Rapport des travaux restants pour un MVP exploitable sur le terrain

Date : 20 juillet 2026
Point de départ : branche `feature/public-auth-onboarding` auditée.

## 1. Définition du MVP terrain recommandée

Le MVP doit permettre à une école pilote de fonctionner pendant plusieurs semaines avec de vraies données et des téléphones ordinaires, sans intervention directe du développeur pour chaque incident.

Périmètre conseillé :

- un administrateur configure l'école et ses utilisateurs ;
- un enseignant consulte ses classes, fait l'appel hors ligne, synchronise et publie un devoir ou document ;
- un élève consulte devoirs/planning/messages et utilise la révision ;
- un parent consulte enfants, résultats, absences, messages et situation de paiement ;
- la messagerie fonctionne avec isolation stricte entre écoles ;
- l'équipe Elima peut détecter une panne, restaurer les données et assister l'utilisateur.

À sortir du MVP initial : paiement transactionnel dans l'app, boutique complète, automatisations WhatsApp métier hors OTP d'authentification, scanner OCR/IA si son backend n'est pas terminé, notifications push, Capacitor iOS/Android et fonctions d'analytics avancées. Les écrans non opérationnels doivent être masqués ou clairement marqués comme bêta.

## 2. Bloquants P0 avant tout pilote réel

### P0.1 — Sécuriser les comptes et les secrets — 3 à 5 jours restants

- fait dans le code : OTP WhatsApp obligatoire avant inscription ;
- fait dans le code : mot de passe oublié et réinitialisation après OTP ;
- fait dans le code : expiration, limite d'essais et quotas par téléphone, identifiant et IP ;
- à faire : appliquer la migration OTP sur `elima.tech`, configurer le Content SID Authentication Twilio et valider inscription/récupération en préproduction ;
- à faire : prévoir un parcours assisté de changement de numéro lorsque l'ancien WhatsApp n'est plus accessible ;
- protéger les formulaires publics contre le spam ;
- tourner les clés Supabase, PostgreSQL, Azure, Resend, Twilio/ACS et Blob présentes dans les environnements locaux ;
- retirer les secrets des dossiers de référence et documenter leur propriétaire ;
- ajouter CSP et en-têtes de sécurité adaptés à Vercel.

Critère de sortie : aucun compte non vérifié ne peut entrer en production, aucun secret historique n'est encore valide et les scénarios de récupération sont testés.

### P0.2 — Valider l'autorisation multi-école — 4 à 6 jours

- déployer une préproduction propre à partir de zéro ;
- appliquer toutes les migrations dans l'ordre ;
- créer une matrice de comptes pour six rôles et deux écoles ;
- tester lecture et écriture de chaque table et RPC ;
- empêcher l'accès direct à `quiz_answers.is_correct` ou assumer explicitement que ces quiz ne sont jamais évaluatifs ;
- vérifier les fichiers Storage privés et les URLs signées ;
- tester doublons d'identité, rattachement élève et fusion contrôlée.

Critère de sortie : aucun utilisateur de l'école A ne peut lire ou modifier une donnée de l'école B, y compris par appel API direct.

### P0.3 — Rendre les déploiements reproductibles — 3 à 5 jours

- supprimer la dépendance de build/seed à `_references` ou versionner un package de schéma autonome ;
- corriger et installer ESLint ;
- ajouter CI : install propre, typecheck, lint, tests, build, contrôle des migrations et recherche de secrets ;
- figer une version Node cohérente dans tous les documents ;
- préparer sauvegarde, restauration, rollback et smoke tests ;
- vérifier Preview et Production, DNS, HTTPS, domaines et redirections OAuth.

Critère de sortie : un clone propre peut être construit et déployé sans fichiers privés présents uniquement sur la machine du développeur.

### P0.4 — Ajouter observabilité et contrôle des coûts — 3 à 5 jours

- suivi des erreurs client et fonctions serverless ;
- journaux structurés avec identifiant de corrélation sans mot de passe, token ni copie scolaire ;
- métriques SSO, inscriptions, sync, uploads et appels IA ;
- quotas par utilisateur/école pour génération et évaluation IA ;
- alertes sur taux d'échec, latence, dépenses IA et indisponibilité Supabase.

Critère de sortie : l'équipe sait qu'un parcours critique est cassé avant que l'école pilote ne le signale.

**Charge P0 estimée : 15 à 24 jours.**

## 3. Fonctions P1 nécessaires au terrain

### P1.1 — Finaliser le flux enseignant — 5 à 8 jours

- adapter l'API d'upload à `Authorization: Bearer <JWT>` ;
- stocker les documents dans un bucket privé avec URLs signées ;
- vérifier taille, MIME, antivirus ou quarantaine ;
- confirmer la création réelle d'un devoir/ressource après upload ;
- rendre les erreurs visibles et rejouables ;
- décider si notes brouillon et remarques sont synchronisées ou retirées de la file offline.

### P1.2 — Durcir l'appel hors ligne — 3 à 5 jours

- passer de `localStorage` à IndexedDB pour une file plus robuste ;
- minimiser les données personnelles conservées localement ;
- chiffrer ou purger les données sur appareils partagés selon le modèle de menace ;
- gérer expiration de session, conflits, rejeu idempotent et reprise après crash ;
- tester réseau lent, coupures répétées et changement de compte.

### P1.3 — Stabiliser les parcours métier — 4 à 7 jours

- traiter explicitement les erreurs au lieu de retourner silencieusement des tableaux vides ;
- valider les flux Parent, Élève, Enseignant et Admin avec données réelles ;
- ajouter gestion opérationnelle des codes école et demandes d'établissement ;
- décider quelles actions paiements/fournitures restent sur le portail web ;
- vérifier dates, fuseau Africa/Abidjan, devise FCFA et années scolaires réelles.

### P1.4 — Optimiser la PWA terrain — 3 à 5 jours

- découper le code par route et charger KaTeX/révision à la demande ;
- réduire le premier chargement et le précache de 6,4 Mo (valeur issue du journal Workbox : 71 ressources totalisant 6 424,96 KiB, principalement les polices KaTeX et le bundle applicatif, et non d'un fichier unique) ;
- fournir icônes 192/512 et maskable validées ;
- tester la mise à jour du service worker et proposer un rechargement contrôlé ;
- vérifier Chrome Android et Safari iOS sur appareils bas/milieu de gamme.

### P1.5 — Clarifier le scanner — 2 à 4 jours pour le masquer, 8 à 15 jours pour le livrer

Le code actuel ne transfère pas le fichier et ne réalise ni OCR ni génération. Deux options :

- MVP sobre : masquer le scanner et conserver le reste de la révision ;
- MVP IA : upload privé, OCR backend, statut de traitement, reprise sur erreur, suppression du document, génération et validation du résultat.

**Charge P1 estimée : 17 à 29 jours avec scanner masqué ; 23 à 40 jours avec scanner livré.**

## 4. Assurance qualité et pilote P2

### Automatisation — 5 à 8 jours

- tests unitaires auth, rôles, services, offline et fonctions serverless ;
- tests d'intégration Supabase avec deux écoles ;
- tests E2E des parcours critiques ;
- seuil minimal de couverture sur les services métier ;
- correction des 2 tests historiques `elima.tech` et de son script npm.

### Recette terrain — 5 à 8 jours

- une école pilote, 1 admin, 2 enseignants, 10 à 30 élèves et quelques parents ;
- scénario complet sur une semaine scolaire ;
- tests sur 3G/4G instable et appareils partagés ;
- vérification lisibilité, accessibilité, taille tactile et temps de chargement ;
- collecte structurée des incidents, irritants et abandons.

### Exploitation et conformité — 3 à 6 jours

- politique de confidentialité, conditions d'utilisation et consentement concernant les mineurs ;
- procédure export/suppression et durée de conservation ;
- canal de support, responsable incident et délais de réponse ;
- sauvegardes vérifiées et exercice de restauration ;
- inventaire des sous-traitants et flux de données IA.

**Charge P2 estimée : 13 à 22 jours.**

## 5. Charge, calendrier et coût restant

### Scénario recommandé, scanner masqué

| Phase | Charge |
|---|---:|
| P0 sécurité, RLS, déploiement, observabilité | 15–24 jours |
| P1 fonctions terrain et performance | 17–29 jours |
| P2 tests, pilote et conformité | 13–22 jours |
| **Total** | **45–75 jours** |

Calendrier réaliste :

- une personne expérimentée : **9 à 15 semaines** ;
- deux personnes complémentaires : **6 à 10 semaines**, avec coordination et recette ;
- ajouter 2 à 4 semaines calendaires de pilote sans développement continu avant généralisation.

Valorisation indicative du reste :

- marché régional négocié, hypothèse 250–350 EUR/jour : **11 250 à 26 250 EUR** ;
- référence full-stack Malt 426–558 EUR/jour : **19 170 à 41 850 EUR** ;
- budget prudent recommandé, incluant marge d'aléas terrain : **25 000 à 45 000 EUR**, soit environ **16,4 à 29,5 millions FCFA**.

Le coût cloud, SMS/WhatsApp, email, stockage, observabilité et IA est exclu et doit être budgété par élève actif et par appel IA.

## 6. Ordre d'exécution conseillé

1. Geler le périmètre et masquer les fonctions non livrées.
2. Tourner les secrets et sécuriser inscription/récupération.
3. Reconstruire une préproduction propre et auditer la matrice RLS.
4. Finaliser upload enseignant et offline présence.
5. Installer CI, observabilité, sauvegarde et rollback.
6. Réduire le bundle et valider la PWA sur vrais téléphones.
7. Automatiser les parcours critiques.
8. Faire un pilote fermé, corriger les incidents, puis seulement ouvrir à d'autres écoles.

## 7. Critères de « go terrain »

Le produit peut être considéré comme MVP exploitable lorsque tous les critères suivants sont vrais :

- build, lint et tests passent dans CI depuis un clone propre ;
- secrets tournés et absents des dossiers partagés ;
- comptes vérifiés et récupération fonctionnelle ;
- matrice RLS deux écoles/six rôles validée ;
- upload enseignant et appel hors ligne testés de bout en bout ;
- aucun écran ne promet une action simulée sans l'indiquer ;
- erreurs et coûts IA sont observables avec quotas ;
- sauvegarde et restauration ont été réellement testées ;
- les parcours critiques passent sur Android milieu de gamme avec réseau lent ;
- politique de confidentialité, suppression des données et support sont publiés ;
- un pilote d'au moins une semaine s'est terminé sans perte ni fuite de données critique.

## 8. Conclusion

Le projet n'a pas besoin d'une réécriture. Il a besoin d'une phase courte mais rigoureuse de **durcissement, réduction de périmètre et validation terrain**. La stratégie la plus efficace est de conserver le socle actuel, de garder WhatsApp uniquement pour l'OTP, de masquer scanner/paiement avancé/automatisations métier non finalisées, puis de concentrer l'effort restant sur RLS, upload, offline, CI, observabilité et pilote réel.
