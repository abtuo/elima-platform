# Déploiements Vercel Demo

## Web

- Root Directory : `web`
- branche : `demo`
- domaine : `demo.elima.ci`
- build : `npm run build`
- framework : Next.js
- `APP_ENV=demo`, `ELIMA_APP_MODE=demo`,
  `NEXT_PUBLIC_ELIMA_APP_MODE=demo`
- URL/clé publique/clé serveur : Supabase Demo

## Mobile

- Root Directory : racine
- branche : `demo`
- domaine : `demo.app.elima.ci`
- build : `npm run build:mobile`
- output : `dist`
- `VITE_APP_ENV=demo`, `VITE_APP_MODE=demo`
- URL/clé publique : Supabase Demo

Les Preview utilisent les mêmes variables Supabase Demo. Elles ne reçoivent
jamais une clé ou URL Production.

