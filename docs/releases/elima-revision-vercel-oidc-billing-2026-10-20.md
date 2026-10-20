# Elima Révision — Google Play Billing avec Vercel OIDC

Date : 20 octobre 2026  
Backend : `elima-api` sur Vercel  
Package Android : `ci.elima.revision`

## Résultat

Le backend Google Play Billing prend désormais en charge Vercel OIDC et Google Workload Identity Federation. En production, aucune clé privée de compte de service n'est nécessaire ni acceptée.

Le flux exécuté au moment d'une requête est :

1. `@vercel/oidc` récupère le jeton OIDC depuis le contexte de la Function ou `VERCEL_OIDC_TOKEN` ;
2. `google-auth-library` transmet ce jeton au Security Token Service Google ;
3. le credential fédéré impersonne le compte de service Billing via IAM Credentials ;
4. Google délivre un jeton temporaire limité au scope Android Publisher ;
5. ce jeton appelle `purchases.subscriptionsv2.get`, l'acknowledgement ou le diagnostic de lecture.

Le code applicatif ne journalise, ne persiste et ne renvoie ni jeton Vercel, ni jeton STS, ni jeton Google.

## Configuration WIF verrouillée

Les valeurs attendues sont contrôlées explicitement :

- projet : `elima-production` ;
- numéro : `370984443240` ;
- pool : `elima-vercel` ;
- fournisseur : `elima-vercel-prod` ;
- émetteur attendu côté fournisseur : `https://oidc.vercel.com/elima1` ;
- compte impersonné : `elima-play-billing@elima-production.iam.gserviceaccount.com`.

Le fournisseur Google reste responsable de la validation cryptographique du jeton, de l'émetteur et de la condition :

`owner:elima1:project:elima-api:environment:production`

Le code refuse une configuration WIF qui ne correspond pas aux identifiants Elima attendus.

## Variables Vercel Production

À créer dans **Vercel > elima-api > Settings > Environment Variables**, pour l'environnement **Production** uniquement :

```text
GCP_PROJECT_ID=elima-production
GCP_PROJECT_NUMBER=370984443240
GCP_WORKLOAD_IDENTITY_POOL_ID=elima-vercel
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=elima-vercel-prod
GCP_SERVICE_ACCOUNT_EMAIL=elima-play-billing@elima-production.iam.gserviceaccount.com
GOOGLE_PLAY_PACKAGE_NAME=ci.elima.revision
GOOGLE_PLAY_ACCOUNT_HASH_SECRET=<secret aléatoire stable d'au moins 32 caractères>
GOOGLE_PLAY_RTDN_AUDIENCE=<URL/audience exacte du push RTDN>
GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL=<compte de service du push Pub/Sub>
```

Les variables Supabase Révision explicites restent nécessaires :

```text
REVISION_SUPABASE_URL=https://rydnrvvmwixrkmnvpajf.supabase.co
REVISION_SUPABASE_PUBLISHABLE_KEY=<clé publique Révision>
REVISION_SUPABASE_SECRET_KEY=<secret serveur Révision>
```

Vercel fournit automatiquement le jeton OIDC dans le contexte d'exécution. Il ne faut pas créer manuellement `VERCEL_OIDC_TOKEN` dans les secrets Production.

`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` doit être absent de Vercel Production. Le mécanisme JSON existant est conservé uniquement pour les tests ou environnements locaux historiques ; `VERCEL_ENV=production` le désactive et le contrôle de préparation échoue si cette variable est présente.

## APIs et permissions à confirmer manuellement

Sans modifier la configuration Cloud, il faut confirmer que :

- Google Play Android Developer API est activée ;
- Security Token Service API est activée ;
- IAM Service Account Credentials API est activée ;
- le principal fédéré borné au projet Vercel Production possède `roles/iam.workloadIdentityUser` sur le compte de service ciblé ;
- le compte `elima-play-billing@elima-production.iam.gserviceaccount.com` est invité dans Play Console ;
- son accès est limité à Elima Révision et lui permet de consulter les commandes/abonnements et de gérer les commandes/abonnements ;
- les produits `elima_revision_standard` et `elima_revision_premium` existent avec le base plan `monthly`.

Aucune de ces autorisations n'a été modifiée pendant cette mission.

## Contrôles réutilisables

Contrôle statique, sans récupération de jeton :

```powershell
npm run billing:check:revision --workspace @elima/api
```

Il vérifie la cible Supabase Révision, le package, les identifiants WIF, l'absence de JSON en Production, RTDN et le mode d'authentification, sans afficher leurs valeurs sensibles.

Contrôle Google Play réel en lecture seule :

```powershell
npm run billing:check:revision:live --workspace @elima/api
```

Ce second contrôle refuse de s'exécuter hors de Vercel Production OIDC. Il appelle uniquement :

`GET /androidpublisher/v3/applications/ci.elima.revision/subscriptions`

Il résume la présence des deux produits et de leur base plan `monthly`. Il n'effectue aucun achat, aucune modification de produit et aucune attribution de droit.

Le contrôle live n'a pas été exécuté durant cette mission : le workspace local n'est pas lié à Vercel, la CLI n'est pas installée et aucun contexte ou jeton Vercel n'est disponible. Les permissions réelles Google Play restent donc à confirmer depuis une exécution Vercel Production explicitement autorisée.

## Compatibilité serveur

- `@vercel/oidc` : 4.0.1 ;
- `google-auth-library` : 11.1.0 ;
- runtime déclaré : Node.js 24 ;
- récupération du jeton différée jusqu'à l'appel Android Publisher dans la requête ;
- durée demandée du jeton impersonné : 900 secondes ;
- renouvellement anticipé du jeton OIDC demandé avec une marge de 5 minutes ;
- aucun import WIF dans le bundle navigateur ou Android.

La bibliothèque Google gère l'échange STS et l'impersonation. Le code ne met pas en cache le jeton OIDC ; la bibliothèque peut réutiliser son jeton Google temporaire dans la durée de vie de l'instance.

## Fichiers modifiés

- `apps/api/server/googlePlayBilling.mjs`
- `apps/api/scripts/check-revision-billing-config.mjs`
- `apps/api/package.json`
- `apps/api/.env.example`
- `apps/api/README.md`
- `apps/revision/vite.base.ts`
- `tests/api/revision-monetization.test.ts`
- `package-lock.json`

## Validation

| Contrôle | Résultat |
| --- | --- |
| Tests API | 143/143 réussis |
| Tests Révision | 72/72 réussis |
| Tests packages | 44/44 réussis |
| Test construction External Account WIF | réussi |
| Test récupération différée du jeton OIDC | réussi |
| Refus du JSON en Vercel Production | réussi |
| Diagnostic Android Publisher en lecture seule | testé avec client simulé |
| Build API | réussi |
| Build Web Révision | réussi |
| Build natif Révision | réussi |
| Lint API | 0 erreur, 2 avertissements préexistants |
| Lint Révision | 0 erreur, 7 avertissements préexistants |
| Appel Google réel depuis Vercel | non exécuté, contexte autorisé absent |

## Audit des dépendances

L'audit de production limité au workspace `@elima/api` signale une vulnérabilité
haute dans `brace-expansion@5.0.7`. La chaîne exacte est
`@mathjax/src > mj-context-menu > rimraf > glob > minimatch > brace-expansion` :
elle existait dans les dépendances API avant l'ajout d'OIDC et ne provient ni de
`@vercel/oidc` ni de `google-auth-library`.

`@vercel/oidc@4.0.1` dépend directement de `jose`, `@vercel/cli-config` et
`@vercel/cli-exec`. L'audit limité à l'API n'a associé aucune alerte à cette chaîne.
Aucun `npm audit fix` n'a été lancé, afin de ne pas réécrire globalement le lockfile
du monorepo ni mélanger cette mission avec Elima Store. La vulnérabilité MathJax
doit faire l'objet d'une mise à niveau ciblée et de tests PDF dans une tâche séparée.

## État de préparation

Le code OIDC/WIF est prêt à être déployé avec l'API et ne requiert aucune clé JSON en production. Le GO Billing reste conditionné à trois preuves externes : variables Production installées, contrôle statique vert dans cet environnement, puis contrôle live en lecture seule réussi depuis Vercel Production. Le nettoyage de la vulnérabilité transitive MathJax est recommandé avant la release publique, mais il est indépendant du flux d'authentification Google Play.

Aucun déploiement, changement IAM, achat ou AAB n'a été effectué.
