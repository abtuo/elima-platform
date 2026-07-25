# Migrations

Source de vérité :

1. `web/supabase/schema.sql`, base historique ;
2. `web/supabase/migrations/`, historique web importé ;
3. `supabase/migrations/`, migrations communes et mobiles.

`npm run db:bundle` produit le bundle initial dans `supabase/generated/`.
Une nouvelle base vide reçoit ce bundle une seule fois. Les changements suivants
passent par une migration incrémentale.

La migration `20260725120000_unified_tenant_foundation.sql` ajoute :

- memberships, inscriptions, feature flags et documents ;
- onboarding manquant ;
- index et RLS tenant ;
- buckets privés et politiques Storage.

Elle a été appliquée transactionnellement sur Demo le 25 juillet 2026.

Local :

```bash
npx supabase start
npm run db:reset
```

Docker/Supabase local n'était pas disponible sur la machine de réalisation.

