# Inventaire et séparation des migrations

## Règle de fonctionnement

Les fichiers historiques restent à leur emplacement afin de préserver Git et les dépendances existantes. Les manifestes suivants définissent désormais la cible et la liste réellement déployable :

- `database/core/migrations/manifest.json`
- `database/revision/migrations/manifest.json`

Le script `database/scripts/migration-plan.mjs` vérifie la référence cible, l’ordre des dépendances, les doublons, les références croisées et les empreintes SHA-256. Il construit ensuite un workdir temporaire Supabase contenant uniquement les migrations autorisées.

Il n’utilise ni `db reset`, ni `--include-all`, ni `migration repair`, ni seeds.

## Classement

### Core School historiques

- Toutes les migrations de `apps/platform/supabase/migrations/`.
- Accès mobile, messagerie, emploi du temps et présence présents sur Core : séries `20260713*` et une partie de `20260715*`.
- Auth Twilio : `20260927090000_twilio_verify_auth_flows.sql` est déjà reflétée sur Core.

Ces migrations ne sont pas à rejouer : le baseline représente leur état résultant et l’historique distant est absent.

### Révision historiques

- `20260715100000_unified_revision_schema.sql`
- `20260715130000_quiz_feedback.sql`
- `20260715160000_standalone_students_and_school_activation.sql`
- `20260715170000_elima_identity_links.sql`
- `20260716090000_school_registration_requests.sql`
- séries Learning `20260719*`
- `20260725120000_unified_tenant_foundation.sql`
- séries Révision `20260928*`, `20260930*`, `20261003*`
- séries pédagogiques `20261010*`

Certaines migrations mobiles existent dans les deux schémas. Elles sont classées comme historiques partagées et ne sont jamais automatiquement redéployées.

### Révision future

- `20261019120000_revision_primary_onboarding.sql`

Elle est absente du distant et isolée dans le manifeste Révision. Son application n’entre pas dans le périmètre Store.

### Core School futures — Store

Ordre exact :

1. `20261020120000_store_catalog_phase_2a.sql`
2. `20261020130000_store_catalog_admin_phase_2b.sql`
3. `20261020140000_store_catalog_import_phase_2c.sql`
4. `20261020150000_store_commerce_orders_phase_3.sql`

Le dry-run distant isolé confirme que seules ces quatre migrations seraient proposées à Core School.

## Commandes sûres

Afficher le plan sans réseau :

```powershell
node database/scripts/migration-plan.mjs --target=core
node database/scripts/migration-plan.mjs --target=revision
```

Dry-run Core School :

```powershell
node database/scripts/migration-plan.mjs --target=core --dry-run
```

Une application nécessite volontairement la référence complète :

```powershell
node database/scripts/migration-plan.mjs `
  --target=core `
  --apply `
  --confirm-ref=nnsgvnjzfrcmbxfwlyow
```

Cette dernière commande est préparée mais n’a pas été exécutée.
