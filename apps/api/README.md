# Elima API

Backend Node autonome des clients Mobile et Révision. Les fonctions HTTP restent
dans `api/` afin de conserver exactement leurs routes Vercel `/api/*`.

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

`vercel.json` conserve les durées maximales existantes et force l’inclusion du
corpus `../../data/exams/**` pour `/api/learning`. Aucun rewrite n’est requis.

Variables serveur utilisées :

- `REVISION_ALLOWED_ORIGINS`
- `VITE_WEB_BASE_URL`
- `ELIMA_IDENTITY_URL`
- `ELIMA_IDENTITY_PUBLISHABLE_KEY`
- `ELIMA_IDENTITY_SECRET_KEY` ou `ELIMA_IDENTITY_SERVICE_ROLE_KEY` ; cette clé
  doit appartenir exactement au projet indiqué par `ELIMA_IDENTITY_URL`
- `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`,
  `TWILIO_VERIFY_SERVICE_SID`
- `VITE_SUPABASE_URL` ou `SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY` ou `SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`,
  `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_API_KEY`

Le signup, la vérification WhatsApp et la réinitialisation de mot de passe sont
traités directement par `apps/api`, sans relais par Platform. La migration
`supabase/migrations/20260927090000_twilio_verify_auth_flows.sql`
doit être appliquée au projet Supabase d’identité avant activation.

Les secrets Supabase, Twilio et Azure restent exclusivement côté serveur. Le CORS est
géré par `server/revisionCors.mjs` : same-origin reste autorisé, et les origines
cross-origin doivent figurer explicitement dans `REVISION_ALLOWED_ORIGINS`.
