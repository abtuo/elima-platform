# Elima Révision — Validation Google Play Billing sur Vercel

Date : 20 octobre 2026  
Cible : `elima-api` Production  
Package : `ci.elima.revision`

## État vérifié localement

Le `.env` racine a été inspecté sans afficher de valeur. Les cinq variables `GCP_*`
correspondent exactement au projet, au pool, au fournisseur
`elima-vercel-prod` et au compte de service attendus. Le package Android et le
secret de hachage passent aussi leurs contrôles. `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
est absent et Billing reste désactivé.

Les deux noms RTDN sont présents, mais leurs valeurs ne passent pas encore les
contrôles minimaux (audience HTTPS et adresse de compte de service). Les trois
variables serveur Supabase Révision attendues par l'API sont absentes. Le contrôle
local complet échoue donc correctement en mode fermé, tandis que
`initialGooglePlayCheckReady` est vrai : RTDN ne bloque plus le diagnostic Google
initial.

Ce découplage a été vérifié en exécutant le contrôle avec une cible Supabase
Révision factice mais correctement identifiée : la commande termine avec succès
alors que `googlePlayRtdnLifecycle` reste faux et que l'activation Billing reste
fausse. Aucun appel réseau Supabase ou Google n'est effectué par ce contrôle statique.

Le workspace n'est pas lié à Vercel, aucune CLI Vercel et aucune session navigateur
Vercel exploitable n'étaient disponibles. La présence distante des variables
Production ne peut donc pas être attestée depuis cette machine sans déploiement ou
accès au projet. Les valeurs attendues restent verrouillées dans le code, notamment
le fournisseur exact `elima-vercel-prod`.

## Séparation des états Billing

- Le contrôle initial exige Supabase Révision, le package Android, WIF et le secret
  de hachage. RTDN est rapporté séparément et ne bloque plus le test Google en lecture.
- L'activation commerciale exige en plus RTDN complet et
  `GOOGLE_PLAY_BILLING_ENABLED=true`.
- La valeur par défaut documentée est `false`. Sans activation explicite,
  `billingAvailable` reste faux et les actions `verify`/`restore` sont refusées.
- Le diagnostic Production refuse de s'exécuter si Billing est déjà activé.

## Variables Production

Vérifier dans Vercel, sans copier leurs valeurs dans des logs :

```text
REVISION_SUPABASE_URL
REVISION_SUPABASE_PUBLISHABLE_KEY
REVISION_SUPABASE_SECRET_KEY
GCP_PROJECT_ID
GCP_PROJECT_NUMBER
GCP_WORKLOAD_IDENTITY_POOL_ID
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
GCP_SERVICE_ACCOUNT_EMAIL
GOOGLE_PLAY_PACKAGE_NAME
GOOGLE_PLAY_ACCOUNT_HASH_SECRET
GOOGLE_PLAY_RTDN_AUDIENCE
GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL
GOOGLE_PLAY_BILLING_ENABLED=false
GOOGLE_PLAY_DIAGNOSTIC_ENABLED=true
GOOGLE_PLAY_DIAGNOSTIC_SECRET=<secret aléatoire temporaire de 32 caractères minimum>
```

`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` doit être absent de Production. Vercel fournit
`VERCEL` et `VERCEL_ENV`; ne pas créer manuellement `VERCEL_OIDC_TOKEN`.

## Procédure exacte de déploiement et de test

1. Authentifier la CLI puis cibler explicitement le projet existant. La liaison
   locale est facultative puisque les commandes ci-dessous donnent le projet et le
   scope :

   ```powershell
   npx vercel login
   ```

2. Vérifier le diff et lancer localement :

   ```powershell
   npm run test:api
   npm run build:api
   npm run billing:check:revision --workspace @elima/api
   ```

   Le troisième contrôle ne peut être vert localement que si les variables serveur
   Révision et WIF sont réellement présentes dans `.env`.

3. Afficher les fichiers qui seraient envoyés, sans déployer :

   ```powershell
   git status --short
   git diff -- apps/api package.json package-lock.json
   ```

4. Après validation manuelle, créer un déploiement de type Production **sans lui
   attribuer le domaine Production**. Il reçoit bien les variables et le claim OIDC
   `environment:production`, mais aucun trafic courant ne lui est envoyé :

   ```powershell
   $deploymentUrl = npx vercel deploy --prod --skip-domain --scope elima1 --project elima-api
   ```

   Ne pas utiliser `--prebuilt` pour cette validation : un build local n'est pas le
   contexte OIDC de la Function Production et obligerait à rapatrier les secrets.

5. Depuis une machine sûre, appeler une seule fois la Function protégée :

   ```powershell
   npx vercel curl /api/google-play-billing-diagnostic --deployment $deploymentUrl --scope elima1 -X POST -H "Authorization: Bearer $env:GOOGLE_PLAY_DIAGNOSTIC_SECRET"
   ```

   La réponse attendue contient uniquement `ok`, `target`,
   `oidcProductionAccess`, `expectedCatalogReady`, `rtdnConfigured` et
   `billingActivationEnabled`. Aucun jeton, secret, produit brut ou abonnement
   utilisateur n'est renvoyé.

6. Après un résultat `ok: true`, laisser ce premier déploiement sans domaine.
   Désactiver `GOOGLE_PLAY_DIAGNOSTIC_ENABLED` et supprimer
   `GOOGLE_PLAY_DIAGNOSTIC_SECRET`. Activer `GOOGLE_PLAY_BILLING_ENABLED=true`
   uniquement lorsque RTDN a également été confirmé. Créer ensuite un **second**
   déploiement Production avec `--skip-domain`, vérifier ses endpoints ordinaires,
   puis seulement le promouvoir avec `npx vercel promote <seconde-url> --scope
   elima1`. Un changement de variable Vercel exige un nouveau déploiement pour être
   appliqué aux Functions.

## Limites de cette mission

Aucun déploiement, appel Google réel, changement IAM ou modification Play Console
n'a été effectué. La preuve finale de l'accès Android Publisher reste donc à obtenir
dans la Function Vercel Production.

## Validation du code

| Contrôle | Résultat |
| --- | --- |
| Tests API complets | 144/144 réussis |
| Tests ciblés Billing et routage | 17/17 réussis |
| Typecheck API | réussi |
| Build API | réussi, 26 routes dont 16 Révision |
| Lint API | 0 erreur, 2 avertissements préexistants dans `learning.mjs` |
| Contrôle local des variables | WIF exact et accès initial prêts ; RTDN invalide/incomplet et Supabase Révision absent |
| Appel Android Publisher Production | non exécuté avant déploiement autorisé |
