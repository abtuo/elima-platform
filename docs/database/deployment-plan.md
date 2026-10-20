# Plan de déploiement Supabase — Core School et Store

## État

Aucune migration distante n’a été appliquée. Aucun historique distant n’a été réparé, aucun rôle attribué et aucune application déployée.

Le plan Core isolé contient exactement les quatre migrations Store. Le dry-run du 20 octobre 2026 les a confirmées dans le bon ordre.

## Prérequis bloquants

1. Installer Docker Desktop ou Podman, actuellement absent, ou fournir un `pg_dump` PostgreSQL 17 compatible.
2. Obtenir un backup physique Core School visible et restaurable : WAL-G est activé, PITR est désactivé et la CLI ne liste actuellement aucun backup disponible.
3. Produire une sauvegarde logique récente hors du monorepo.
4. Tester la restauration sur un projet Supabase isolé.
5. Faire valider les quatre empreintes SHA-256 affichées par `migration-plan.mjs`.
6. Obtenir une autorisation explicite distincte pour l’application.

## Sauvegarde

Le script refuse une destination située dans le dépôt :

```powershell
powershell -File database/scripts/backup-project.ps1 `
  -Target core `
  -Destination 'D:\backups\elima-core-pre-store' `
  -ConfirmRef nnsgvnjzfrcmbxfwlyow
```

Il produit structure, données `public`/`storage`, rôles et checksums. Les fichiers peuvent contenir des données privées et doivent être chiffrés, contrôlés et conservés hors Git.

La restauration doit d’abord être répétée sur un projet isolé. Le PITR Core School est actuellement désactivé ; il ne peut donc pas servir de plan de retour immédiat. Le dump logique vérifié est obligatoire tant qu’aucun backup physique n’est listé. Pour Révision, le profil CLI actuel n’a pas l’autorisation de consulter les backups physiques (`403`).

## Application Store proposée

```powershell
node database/scripts/migration-plan.mjs --target=core --dry-run
node database/scripts/migration-plan.mjs `
  --target=core `
  --apply `
  --confirm-ref=nnsgvnjzfrcmbxfwlyow
```

Interdictions maintenues :

- aucun `db reset` distant ;
- aucun `db push --include-all` ;
- aucune réparation de `schema_migrations` ;
- aucun push depuis `supabase/migrations` directement ;
- aucune commande visant Révision pendant l’intervention Store.

## Contrôles après migration

- Présence des tables `store_catalog_*`, `store_commerce_*`, stock, livraison et import.
- Absence de modification des cinq tables Store scolaires.
- Présence du bucket privé `store-product-media` et de ses politiques.
- RLS actif sur toutes les nouvelles tables.
- Droits publics limités au catalogue publié.
- RPC d’administration réservées à `store_staff`.
- Tests catalogue, kit, réservation, commande, annulation, COD et isolation client.
- Parcours Core School : connexion, classes, élèves, présences, messagerie et finance.

## Activation de `/admin`

Conditions :

1. `apps/store` doit utiliser l’URL et la clé publique de Core School.
2. Le compte doit déjà exister dans `auth.users` de Core School.
3. La Phase 2A doit être appliquée.
4. Une ligne active `store_staff(role = 'store_admin')` doit être créée.

Le fichier `database/core/admin/store-admin-template.sql` effectue une simulation transactionnelle terminée par `ROLLBACK`. Il vérifie qu’un seul compte correspond au téléphone ou à l’e-mail fourni. Le remplacement de `ROLLBACK` par `COMMIT` et son exécution nécessitent une autorisation explicite séparée.
