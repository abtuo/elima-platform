# Migrations Supabase automatisées

Chaque opération exige une cible explicite et vérifie la référence extraite de l'URL PostgreSQL avant toute requête. Aucun état de liaison locale de Supabase CLI n'est utilisé.

## Credentials

- Révision : `REVISION_SUPABASE_DB_URL`, avec repli temporaire sur `SUPABASE_DB_URL` uniquement si l'URL appartient à `rydnrvvmwixrkmnvpajf`.
- Identity/Core : `IDENTITY_SUPABASE_DB_URL` ou `CORE_SUPABASE_DB_URL`, obligatoirement rattachée à `nnsgvnjzfrcmbxfwlyow`.
- Authentification Management API Identity : `IDENTITY_ACCESS_TOKEN` ; le script ne journalise jamais sa valeur.

Ces variables contiennent une URL PostgreSQL d'administration. Les clés publishable, anon, secret API et `service_role` ne sont jamais utilisées comme mot de passe PostgreSQL. `.env` est ignoré par Git.

## Commandes

```powershell
npm run db:migrate:status -- --target=revision
npm run db:migrate:status -- --target=identity
npm run db:auth:status -- --target=identity
npm run db:migrate:revision
npm run db:migrate:identity
```

Le statut compare le manifeste local, l'historique officiel `supabase_migrations.schema_migrations`, le registre Elima avec checksum et, pour l'onboarding Révision, les effets réels du schéma. Une divergence partielle ou un effet sans historique bloque l'application.

L'application :

1. confirme la référence du projet dans la commande ;
2. analyse les opérations SQL et refuse toujours les risques critiques ;
3. exige que chaque risque modéré soit autorisé individuellement dans le manifeste ;
4. prend un instantané sans données personnelles des colonnes, compteurs et politiques concernés ;
5. applique sous transaction avec verrou consultatif, `lock_timeout` de 5 secondes et `statement_timeout` de 60 secondes ;
6. inscrit la migration dans le registre Elima avec checksum et, lorsque la table officielle existe déjà, dans l'historique Supabase, au sein de la même transaction ;
7. vérifie les colonnes, contraintes, fonction, permissions, RLS et conservation des lignes ;
8. écrit un rapport JSON ignoré par Git dans `database/reports/`.

Une sauvegarde logique complète nécessite `pg_dump` PostgreSQL 17, Docker ou Podman. Pour une migration additive limitée aux nouvelles colonnes, le script conserve un instantané structurel et agrégé et s'appuie sur l'atomicité de la transaction. Toute migration touchant ou supprimant des données doit disposer d'une sauvegarde restaurable et d'une validation explicite séparée.

Une migration en attente sans `backupPolicy` reconnue dans son manifeste est refusée avant toute écriture. La politique `transactional-structural-snapshot` est réservée aux changements additifs dont les invariants de lignes et de politiques sont contrôlés dans la même transaction ; elle ne remplace jamais une sauvegarde restaurable pour une transformation destructive ou irréversible.

Ne jamais utiliser `db reset`, `migration repair` ou une commande CLI reposant sur un projet implicitement lié pour une base distante.

## État constaté le 20 octobre 2026

Le projet Révision ne possédait pas de table d'historique Supabase exploitable, alors que son schéma contient de nombreux effets de migrations historiques. Ces effets restent représentés par le baseline et les sources historiques du manifeste ; ils ne sont pas marqués rétroactivement comme appliqués. La migration `20261019120000_revision_primary_onboarding.sql`, dont les effets étaient entièrement absents, a été appliquée et enregistrée dans `public.elima_migration_ledger` avec son checksum.

L'accès PostgreSQL Identity/Core n'est pas présent dans `.env`. Les commandes Identity refusent donc toute connexion au lieu de réutiliser l'URL Révision. Il faut fournir `IDENTITY_SUPABASE_DB_URL` ou `CORE_SUPABASE_DB_URL` dans l'environnement local, sans publier sa valeur.
