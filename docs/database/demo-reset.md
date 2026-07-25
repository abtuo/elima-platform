# Reset sécurisé de la Demo

Variables obligatoires :

```env
APP_ENV=demo
SUPABASE_DEMO_PROJECT_ID=
SUPABASE_PRODUCTION_PROJECT_ID=
VITE_SUPABASE_URL=
SUPABASE_SECRET_KEY=
SUPABASE_DB_URL=
SEED_AUTH_PASSWORD=
```

Contrôle sans écriture :

```bash
npm run demo:reset:dry
```

Reset interactif :

```bash
npm run demo:reset
```

Le script vérifie trois fois la cible API/DB/Project ID, refuse Production,
affiche le nombre d'écoles et comptes concernés, puis exige
`RESET DEMO <PROJECT_REF>`.

Après le seed, `scripts/verify-demo-seed.mjs` contrôle les volumes, relations,
quatre statuts financiers, le parent multi-enfant, les données scolaires de ses
deux enfants et l'absence de tenant orphelin.

