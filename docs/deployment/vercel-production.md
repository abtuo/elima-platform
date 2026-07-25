# Déploiements Vercel Production

## Web

- Root Directory : `web`
- branche : `main`
- domaine : `elima.ci`
- `APP_ENV=production`, `ELIMA_APP_MODE=saas`
- Supabase Production

## Mobile

- Root Directory : racine
- branche : `main`
- domaine : `app.elima.ci`
- build : `npm run build:mobile`
- `VITE_APP_ENV=production`, `VITE_APP_MODE=production`
- Supabase Production

Les fichiers `vercel.json` limitent les builds lorsqu'une autre application
seule change. Vérifier la commande d'ignore dans chaque projet après le premier
déploiement.

