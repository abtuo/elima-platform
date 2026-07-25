# Audit Git et sauvegardes préalables

Date de l'audit : 25 juillet 2026.

## Dépôts identifiés

| Périmètre | Dépôt | Branche de travail | Remote | État initial |
|---|---|---|---|---|
| Mobile, racine | `abtuo/elima.mobile.git` | `feature/public-auth-onboarding` à `4c91170` | `origin` | `.env.example` modifié localement |
| Web historique | `abtuo/elima.git` | `feature/mobile-school-code` à `496c408` | `origin` | propre |

`_references/elima.tech` était un dépôt Git imbriqué et ignoré par le dépôt
mobile. `_references/elima.app` n'est pas un dépôt actif et reste isolé.

## Sauvegardes Git créées et poussées

| Dépôt | Branche | Commit | Contenu |
|---|---|---|---|
| Mobile | `backup/pre-unified-elima-architecture-20260725` | `c416dea` | état courant et modification locale de `.env.example` |
| Web | `backup/pre-unified-elima-architecture-20260725` | `a91a5a9` | point de sauvegarde de l'état web |

Après le push, les deux branches de travail ont été restaurées. La modification
locale de `.env.example` est de nouveau non indexée dans le dépôt mobile.

## Sauvegardes Supabase

Les snapshots sont locaux, potentiellement sensibles et exclus de Git par
`supabase/backups/`.

| Projet | Project ref | Sauvegarde | Résultat |
|---|---|---|---|
| Mobile / cible Demo | `rydnrvvmwixrkmnvpajf` | `supabase/backups/2026-07-25/mobile-demo-rydnrvvmwixrkmnvpajf/` | 76 ressources PostgREST, données, bucket, catalogue PostgreSQL public et schéma SQL de secours |
| Web historique | `nnsgvnjzfrcmbxfwlyow` | `supabase/backups/2026-07-25/web-nnsgvnjzfrcmbxfwlyow/` | 54 ressources PostgREST, 116 comptes Auth, 2 buckets, schéma et migrations suivis |

Limites connues :

- la CLI Supabase `2.109.1` ne peut pas exécuter `db dump` sans Docker ;
- la clé serveur locale du mobile utilise un format non accepté par l'API Auth
  Admin : les utilisateurs Auth mobiles ne sont donc pas dans le snapshot ;
- le web ne fournit pas d'URL PostgreSQL locale : son snapshot de schéma repose
  sur `schema.sql`, les migrations et le contrat OpenAPI ;
- les paramètres Auth du dashboard, Edge Functions, webhooks et cron nécessitent
  un export Dashboard ou Management API. Aucun dossier Edge Function ni cron SQL
  n'a été trouvé dans le code.

Avant une bascule Production, compléter ces deux sauvegardes par des dumps
officiels Supabase/`pg_dump` et exporter la configuration Auth depuis le
Dashboard.

## Restauration Git

```bash
git fetch origin
git switch backup/pre-unified-elima-architecture-20260725
```

Pour restaurer uniquement le fichier local sauvegardé du mobile :

```bash
git restore --source c416dea -- .env.example
```

Pour le web historique :

```bash
git clone git@github.com:abtuo/elima.git
git switch backup/pre-unified-elima-architecture-20260725
```

