# Elima Révision — Finalisation des abonnements avant déploiement

Date : 20 octobre 2026  
Périmètre : API et application Elima Révision  
Projet Supabase contrôlé : `rydnrvvmwixrkmnvpajf`

> Mise à jour : l'authentification Google Play Production utilise désormais Vercel
> OIDC et Workload Identity Federation, sans clé JSON statique. Voir
> `elima-revision-vercel-oidc-billing-2026-10-20.md`.

## Synthèse

La chaîne d'abonnement est conçue selon le bon modèle de confiance : Google Play réalise l'achat, l'application transmet uniquement le `purchaseToken`, l'API vérifie ce jeton auprès d'Android Publisher, puis une fonction Supabase réservée au rôle serveur enregistre le droit. Aucun droit Premium n'est attribué par le client.

Les défauts de code démontrés ont été corrigés et l'écran « Mon abonnement » a été nettoyé. La configuration externe nécessaire aux achats n'est toutefois pas disponible dans les environnements locaux inspectés. La configuration Google Play Console et les variables du backend doivent être terminées avant le déploiement public.

## 1. Causes démontrées

### Configuration de l'API Révision absente

Le backend exige volontairement les variables explicites `REVISION_SUPABASE_*` afin de ne jamais retomber par ambiguïté sur Elima Identity. Elles sont absentes du `.env` racine et de `apps/api/.env` inspectés.

La configuration Supabase générique présente pointe bien vers Révision, mais elle n'est pas réutilisée automatiquement : ce refus est une protection contre un mélange de projets. En l'état local, `resolveRevisionServerConfig()` renvoie donc `revision_configuration_missing`.

### Configuration Google Play serveur absente

Les variables suivantes sont toutes absentes des environnements locaux inspectés :

- `GOOGLE_PLAY_PACKAGE_NAME` ;
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ;
- `GOOGLE_PLAY_ACCOUNT_HASH_SECRET` ;
- `GOOGLE_PLAY_RTDN_AUDIENCE` ;
- `GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL`.

Avant correction, le GET des droits calculait toujours l'identifiant de compte Google obscurci. L'absence de `GOOGLE_PLAY_ACCOUNT_HASH_SECRET` faisait ainsi échouer même l'affichage d'un compte gratuit, ce qui explique « Le service d'abonnement est momentanément indisponible ».

### États d'interface confondus

L'ancien écran chargeait les droits et le catalogue Google séparément, mais utilisait un seul message d'erreur. Après un échec des droits, le bloc « Chargement de tes droits… » restait affiché. Si les droits ou le catalogue manquaient, aucune offre n'était sélectionnée, ce qui entraînait simultanément :

- « Tarif disponible dans Google Play » ;
- bouton Premium désactivé ;
- absence d'explication permettant de distinguer API, catalogue, compte test ou installation hors Play.

### Prix Google Play

Les prix localisés proviennent exclusivement de `ProductDetails` dans l'application Android. Le Web ne dispose pas de ce catalogue et ne doit pas inventer ou convertir un prix. Sur Android, un tarif absent signifie que Google Play n'a retourné aucune offre éligible : produit/base plan inactif, région non couverte, compte non éligible, application non installée depuis Play, ou mauvaise piste de test.

Le dépôt confirme la cohérence des identifiants attendus :

- package : `ci.elima.revision` ;
- produits : `elima_revision_standard` et `elima_revision_premium` ;
- base plan : `monthly` ;
- offre d'essai optionnelle : `trial-1-month`.

La disponibilité réelle de ces objets dans Play Console ne peut pas être confirmée sans accès Console ou compte de service. La base Révision contient actuellement 7 lignes d'abonnement et 0 achat Google Play enregistré.

## 2. Corrections apportées

### API et sécurité

- le GET des droits d'un compte sans achat peut désormais fonctionner même si Google Play n'est pas encore configuré ;
- la réponse expose `billingAvailable` et un `accountId` nullable, sans détail de secret ;
- le bouton d'achat exige une configuration complète, y compris le cycle RTDN ;
- la création du client Android Publisher reste fail-closed si le package, le compte de service ou le secret de liaison manquent ;
- le compte Google est toujours lié à l'identité Elima par un HMAC serveur de 64 caractères ;
- restauration et achat passent toujours par la vérification serveur avant attribution ;
- le contrôle pré-déploiement `npm run billing:check:revision --workspace @elima/api` vérifie la cible Révision et la configuration sans afficher de valeur sensible.

Le contrôle échoue actuellement comme attendu avec quatre indicateurs à `false` : base Révision explicite, package Play, vérification d'achat et cycle RTDN.

### Compatibilité QCM

- l'endpoint local `/api/revision-quiz-attempt` a été ajouté à la passerelle Vite Révision ;
- le statut distant confirme la migration QCM `20261020180000` appliquée sans divergence ;
- les 40 historiques legacy sont conservés ;
- les RPC QCM arbitraires restent inaccessibles au client ;
- aucune nouvelle migration n'a été créée ni appliquée pour cette mission.

### Vérification Supabase des abonnements

Le script de statut Révision contrôle désormais durablement :

- RLS activée sur `revision_subscriptions`, `revision_play_purchases` et `revision_usage` ;
- aucune lecture de ces tables pour `anon` ou `authenticated` ;
- exécution de `revision_entitlement` et `revision_apply_play_purchase` refusée à `authenticated` ;
- exécution de ces fonctions autorisée à `service_role` uniquement ;
- `search_path` verrouillé sur `public, pg_temp`.

Tous ces contrôles sont confirmés sur le projet distant Révision.

## 3. Changements visuels

- séparation claire des états de chargement des droits et du catalogue ;
- disparition du faux chargement persistant après une erreur ;
- actions « Réessayer » et « Recharger les tarifs » ;
- message explicite lorsque les achats sont indisponibles mais que les droits et historiques restent accessibles ;
- prix Android provenant uniquement du format localisé Google Play ;
- formulation Web explicite : le prix est affiché dans l'application Android ;
- suppression des mentions UTC et des détails anti-abus ;
- remplacement de « illimité » par les plafonds réels Premium : 500 quiz IA, 200 fiches, 100 scans et 1 000 indices par jour ;
- affichage des conditions d'essai uniquement lorsqu'une offre d'essai est réellement retournée par Google Play ;
- affichage des règles de changement de formule uniquement pour un abonnement Standard ou Premium concerné ;
- maintien des mentions de renouvellement automatique et d'annulation ;
- « Restaurer mes achats » conservé dans une zone d'actions plus discrète ;
- « Gérer ou annuler dans Google Play » affiché uniquement pour un abonnement concerné ;
- disposition verticale sur petit écran, retour à la ligne et marge de sécurité inférieure pour éviter chevauchements et navigation masquée.

## 4. Fichiers modifiés

API et contrôle de configuration :

- `apps/api/server/googlePlayBilling.mjs`
- `apps/api/server/handlers/revision-subscription.mjs`
- `apps/api/scripts/check-revision-billing-config.mjs`
- `apps/api/package.json`

Application et packages Révision :

- `apps/revision/src/features/subscription/SubscriptionPage.tsx`
- `apps/revision/src/services/subscriptionService.ts`
- `apps/revision/vite.base.ts`
- `packages/revision-core/src/subscriptionApi.ts`

Automatisation et tests :

- `database/scripts/supabase-migrate.mjs`
- `tests/api/revision-monetization.test.ts`
- `tests/revision/subscription.test.ts`

Les travaux Elima Store présents dans l'arbre de travail n'ont pas été modifiés par cette mission.

## 5. Résultats des tests

| Contrôle | Résultat |
| --- | --- |
| Tests API | 140/140 réussis |
| Tests Révision | 72/72 réussis |
| Tests packages | 44/44 réussis |
| Tests ciblés Billing/QCM | réussis |
| Typecheck API | réussi |
| Typecheck Révision | réussi |
| Typecheck packages | réussi |
| Lint API | 0 erreur, 2 avertissements préexistants |
| Lint Révision | 0 erreur, 7 avertissements préexistants |
| Build Web Révision | réussi |
| Build natif Révision | réussi |
| Gradle `testDebugUnitTest` | réussi, plugin Billing compilé |
| Statut Supabase Révision | à jour, aucune divergence |
| Contrôle RLS abonnements | réussi |
| Contrôle pré-déploiement Billing | échec attendu : configuration externe absente |

Le build signale uniquement l'avertissement existant sur la taille du principal chunk JavaScript. Aucun AAB n'a été généré.

## 6. Actions Google Play Console et backend

### Produits et tarifs

1. Dans Play Console, ouvrir Elima Révision et confirmer le package `ci.elima.revision`.
2. Dans **Monétiser > Produits > Abonnements**, créer ou ouvrir exactement `elima_revision_standard` et `elima_revision_premium`.
3. Pour chaque produit, créer et activer le base plan `monthly`, renouvelé automatiquement, avec sa disponibilité et son tarif pour chaque pays ciblé. Un abonnement n'est pas achetable sans base plan actif. Voir la documentation officielle [Créer et gérer des abonnements](https://support.google.com/googleplay/android-developer/answer/140504).
4. Si un mois d'essai est voulu, créer et activer l'offre `trial-1-month` sur chaque produit, avec une phase gratuite mensuelle et les critères d'éligibilité voulus. Sans cette offre, l'application n'affichera aucune promesse d'essai.
5. Vérifier notamment la disponibilité en Côte d'Ivoire et les prix localisés réellement affichés par Google Play.

### Android Publisher et variables API

1. Activer la Google Play Android Developer API dans le projet Google Cloud retenu.
2. Créer un compte de service dédié au backend.
3. L'inviter dans **Play Console > Utilisateurs et autorisations** avec les droits nécessaires à la lecture des données financières/commandes et à la gestion des commandes et abonnements, conformément au guide officiel [Google Play Developer API — démarrage](https://developers.google.com/android-publisher/getting_started).
4. Configurer dans l'environnement de déploiement API, jamais dans une variable `VITE_*` :
   - `REVISION_SUPABASE_URL` vers `rydnrvvmwixrkmnvpajf.supabase.co` ;
   - `REVISION_SUPABASE_PUBLISHABLE_KEY` ;
   - `REVISION_SUPABASE_SECRET_KEY` ou `REVISION_SUPABASE_SERVICE_ROLE_KEY` ;
   - `GOOGLE_PLAY_PACKAGE_NAME=ci.elima.revision` ;
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ;
   - `GOOGLE_PLAY_ACCOUNT_HASH_SECRET`, secret aléatoire stable d'au moins 32 caractères.

### Notifications RTDN

1. Créer un topic Pub/Sub dédié aux notifications Google Play.
2. Dans la configuration de monétisation Play Console, relier ce topic et envoyer une notification de test.
3. Créer une souscription push HTTPS vers l'URL publique exacte `/api/google-play-rtdn` du backend Révision.
4. Activer l'authentification OIDC de la souscription push avec un compte de service dédié.
5. Configurer `GOOGLE_PLAY_RTDN_AUDIENCE` avec l'audience exacte du jeton push et `GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL` avec l'adresse de ce compte de service.
6. Vérifier que l'endpoint répond à la notification de test. Une RTDN signale un changement ; le backend doit ensuite relire l'état complet via Android Publisher, ce que fait l'implémentation. Voir la [référence RTDN officielle](https://developer.android.com/google/play/billing/rtdn-reference).

### Piste et comptes de test

1. Publier une version signée sur la piste de test interne ou fermée, sans la promouvoir en production.
2. Ajouter les comptes QA à la piste et à la liste des testeurs de licence.
3. Accepter le lien d'inscription à la piste avec chacun des comptes.
4. Installer l'application depuis Google Play avec le même compte qui effectuera l'achat. Sur un appareil multi-comptes, Google utilise normalement le compte ayant téléchargé l'application.
5. Tester avec les moyens de paiement de test : succès, refus, paiement différé, restauration, passage Standard vers Premium, retour différé vers Standard, annulation, grâce, suspension et expiration.
6. Confirmer dans la base qu'un droit n'apparaît qu'après vérification serveur et que la restauration ne crée pas de doublon.

Google recommande les testeurs de licence et Play Billing Lab pour ces scénarios : [Tester l'intégration Google Play Billing](https://developer.android.com/google/play/billing/test).

## 7. Ordre de déploiement recommandé

Après configuration et contrôle vert :

1. exécuter `npm run billing:check:revision --workspace @elima/api` ;
2. déployer l'API contenant à la fois la remise QCM sécurisée et les corrections Billing ;
3. vérifier en lecture les endpoints abonnement et QCM ;
4. déployer immédiatement le client Web compatible ;
5. réaliser les parcours authentifiés QCM et abonnement sur Web ;
6. tester ensuite le client Android via une piste Google Play avec un testeur de licence ;
7. préparer l'AAB seulement dans une mission distincte.

Les composants API, client Web, client natif, migration QCM et schéma Supabase sont techniquement compatibles et doivent être livrés comme un ensemble cohérent.

## Décision

**NO-GO pour le déploiement de l'API et du client Web à cet instant.**

Le code, les tests et les builds sont prêts, mais le contrôle obligatoire de configuration Billing échoue : les variables explicites Supabase Révision, Android Publisher et RTDN ne sont pas configurées dans les environnements disponibles. Le passage à **GO** est possible dès que ces variables sont installées sur la cible de déploiement, que la commande de contrôle devient verte et que les produits/base plans/offres sont confirmés actifs dans Google Play Console.
