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
- `VITE_ELIMA_IDENTITY_URL`
- `ELIMA_IDENTITY_PUBLISHABLE_KEY` ou `VITE_ELIMA_IDENTITY_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL` ou `SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY` ou `SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`,
  `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_API_KEY`

Les secrets Supabase et Azure restent exclusivement côté serveur. Le CORS est
géré par `server/revisionCors.mjs` : same-origin reste autorisé, et les origines
cross-origin doivent figurer explicitement dans `REVISION_ALLOWED_ORIGINS`.
