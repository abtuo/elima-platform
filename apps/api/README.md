# Elima API

Backend Node autonome des clients Mobile et Révision. Vercel expose un unique
routeur `api/[...route].mjs`; les handlers HTTP internes vivent dans
`server/handlers/` tout en conservant exactement les routes publiques `/api/*`.

## Développement et validation

Depuis la racine du monorepo :

```sh
npm run dev:api
npm run typecheck:api
npm run test:api
npm run build:api
```

Le serveur local écoute par défaut `http://127.0.0.1:3001`. Les adaptateurs Vite
Mobile et Révision chargent directement les mêmes handlers pendant leur propre
mode développement.

## Projet Vercel indépendant (préparation uniquement)

- Root Directory : `apps/api`
- Framework Preset : Other
- Install Command : valeur automatique (`npm install`)
- Build Command : `npm run build`
- Output Directory : aucune ; Vercel découvre les fonctions dans `api/`
- Option monorepo : activer **Include source files outside of the Root Directory**
  afin d’inclure le lockfile racine et `data/exams`.

`vercel.json` applique une durée maximale de 60 secondes au routeur mutualisé et
force l’inclusion du corpus `../../data/exams/**` pour `/api/learning`. Aucun
rewrite n’est requis.

Variables serveur utilisées :

- `REVISION_ALLOWED_ORIGINS`
- `VITE_WEB_BASE_URL`
- `ELIMA_IDENTITY_URL`
- `ELIMA_IDENTITY_PUBLISHABLE_KEY`
- `ELIMA_IDENTITY_SECRET_KEY` ou `ELIMA_IDENTITY_SERVICE_ROLE_KEY` ; cette clé
  doit appartenir exactement au projet indiqué par `ELIMA_IDENTITY_URL`
- `REVISION_SUPABASE_URL`
- `REVISION_SUPABASE_PUBLISHABLE_KEY` ou `REVISION_SUPABASE_ANON_KEY`
- `REVISION_SUPABASE_SECRET_KEY` ou `REVISION_SUPABASE_SERVICE_ROLE_KEY` ; cette
  clé cible exclusivement le projet de données Révision utilisé par le bridge
- `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`,
  `TWILIO_VERIFY_SERVICE_SID`
- `VITE_SUPABASE_URL` ou `SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY` ou `SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`,
  `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_API_KEY`
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, `AZURE_DOCUMENT_INTELLIGENCE_KEY`

Le signup, la vérification WhatsApp et la réinitialisation de mot de passe sont
traités directement par `apps/api`, sans relais par Platform. La migration
`supabase/migrations/20260927090000_twilio_verify_auth_flows.sql`
doit être appliquée au projet Supabase d’identité avant activation.

La migration `supabase/migrations/20260928120000_revision_subject_preferences_and_documents.sql`
doit être appliquée au projet Supabase Révision avant d’activer les préférences
de matières et le Scanner. Les fichiers originaux ne sont pas conservés : seule
l’analyse pédagogique structurée est stockée.

`identity-bridge` valide la session auprès de `ELIMA_IDENTITY_URL`, puis crée la
session technique et les liens RLS dans `REVISION_SUPABASE_URL`. Ces deux URLs et
leurs clés ne doivent jamais pointer vers le même projet.
`POST /api/elima-session` échange un refresh token avec le grant Supabase
`refresh_token` du projet Identity, sans OAuth. `DELETE /api/elima-session`
révoque la session Identity courante. Ces opérations utilisent uniquement
`ELIMA_IDENTITY_URL` et `ELIMA_IDENTITY_PUBLISHABLE_KEY`, et leurs réponses
ne sont jamais mises en cache. Le routeur Vercel reste une seule fonction.
La liaison canonique est `identity_links(issuer, external_subject)`, où
`external_subject` contient l’UUID Identity ; sa contrainte unique garantit qu’une
identité centrale ne possède qu’un seul profil technique Révision.

Les secrets Supabase, Twilio et Azure restent exclusivement côté serveur. Le CORS est
géré par `server/revisionCors.mjs` : same-origin reste autorisé, et les origines
cross-origin doivent figurer explicitement dans `REVISION_ALLOWED_ORIGINS`.
## Monétisation Révision / Google Play

Migration `supabase/migrations/20261003160000_revision_monetization.sql` à appliquer
uniquement à Révision **rydnrvvmwixrkmnvpajf**. Ne pas l'appliquer à Identity.
Les trois tables de facturation sont inaccessibles aux clients (RLS, droits serveur
uniquement). La liaison utilise `identity_links` et l'UUID central, jamais le téléphone.

La fonction `revision_entitlement` verrouille la ligne de l'identité avant lecture
et incrément. Les compteurs journaliers UTC sont additionnés du lundi au dimanche
pour les quotas hebdomadaires Free. Changer de plan ne remet pas les compteurs à zéro.
Les requêtes IA admises sont réservées avant Azure. Appliquer aussi la migration
`supabase/migrations/20261003170000_revision_quota_refunds.sql` sur Révision :
les erreurs fournisseur (HTTP 408/429/5xx), réseau et timeout restituent une seule
fois le quota métier dans son bucket initial. Les erreurs de requête/contenu,
réponses IA produites et limites anti-abus ne sont pas remboursées.
Les quiz catalogue ne consomment rien. Les indices et évaluations
ouvertes assistées par IA utilisent `ai_hint` ; la validation déterministe reste libre.

Configurer exclusivement côté API les variables `GOOGLE_PLAY_*` du `.env.example`.
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` contient les credentials du compte de service
autorisé dans Play Console. Ne jamais envoyer ce JSON au frontend ni le committer.
`GOOGLE_PLAY_ACCOUNT_HASH_SECRET` est un secret aléatoire stable (au moins 32 octets) :
sa rotation exige une stratégie de migration des identifiants obfusqués existants.
Les `REVISION_SUPABASE_*` existantes restent nécessaires. Aucun nouveau secret VITE.

Endpoints dans le catch-all unique :
- GET `/api/revision-subscription` : droits et compteurs, sans purchaseToken.
- POST `/api/revision-subscription` : `action: verify|restore`, `purchaseToken` ;
  `action: hint` consomme un indice. Session Révision obligatoire.
- POST `/api/google-play-rtdn` : push Pub/Sub authentifié par JWT Google (audience,
  email de compte de service et email_verified vérifiés), puis nouvelle lecture
  `purchases.subscriptionsv2.get`. Aucun droit accordé d'après le seul message RTDN.

Les achats sont relus chez Google lors des consultations/consommations, y compris
sans RTDN. Expiration => Free dans la même transaction ; annulation => accès conservé
jusqu'à l'échéance ; hold => Free ; grace period => accès conservé. Les anciennes
notifications d'un token remplacé ne réactivent pas l'ancien plan. L'acknowledgement
est effectué côté serveur après persistance, et retenté à la restauration.

### Configuration Play Console (manuelle)

1. Pour `ci.elima.revision`, créer `elima_revision_standard` et
   `elima_revision_premium`. Pour chacun, créer/activer le base plan `monthly`,
   mensuel et à renouvellement automatique. Fixer les tarifs locaux souhaités :
   Standard 1 500 FCFA et Premium 3 000 FCFA (adapter les régions/devise dans Play).
2. Créer l'offre `trial-1-month` sur chacun : phase gratuite P1M puis tarif du base
   plan. Choisir l'éligibilité nouveaux clients n'ayant jamais eu d'abonnement dans
   l'application (pas seulement ce produit). Elima masque aussi les essais si
   `trial_used_at` est renseigné et refuse un second essai pour une autre transaction.
3. Activer Google Play Android Developer API dans le projet Cloud. Inviter le compte
   de service dans Play Console avec les permissions nécessaires pour consulter les
   commandes/abonnements et gérer les commandes/abonnements de cette application.
4. RTDN : créer un topic Pub/Sub, autoriser
   `google-play-developer-notifications@system.gserviceaccount.com` à publier,
   configurer ce topic dans Play Console. Créer une souscription push authentifiée
   vers `/api/google-play-rtdn`. Audience exacte = `GOOGLE_PLAY_RTDN_AUDIENCE`,
   compte de service push = `GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL`. Autoriser
   l'agent de service Pub/Sub à générer les jetons OIDC de ce compte si nécessaire.
5. Ajouter les comptes de testeurs de licence et de test interne. Installer depuis
   le lien Google Play (pas l'APK debug) et tester achats, paiement en attente,
   restauration, annulation, expiration accélérée, upgrade et downgrade.

Les prix et phases affichés sur Android proviennent de ProductDetails. Sur PWA,
les droits sont consultables mais aucun achat n'est simulé et aucun essai n'est promis.
Upgrade vers Premium : WITH_TIME_PRORATION. Downgrade vers Standard : DEFERRED.
Le plugin interroge les achats possédés et fournit l'ancien token à Google ; il ne
crée pas délibérément un second abonnement concurrent.

Références : https://developer.android.com/google/play/billing/subscriptions
et https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2.
