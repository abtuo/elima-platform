# Base de données Elima commune

> Document historique. La décision canonique actuelle est décrite dans
> `docs/architecture/unified-database.md`, avec migrations dans
> `supabase/migrations/` et déploiement dans `docs/deployment/`.

## Architecture retenue

Un seul projet Supabase contient :

- `auth.users` : identité unique ;
- le scolaire issu de `elima.tech` ;
- les modules de révision déjà présents dans l'application mobile active ;
- la messagerie et ses règles RLS ;
- un seul Storage, avec des buckets séparés par usage.

Le projet scolaire est la source d'identité. On ne copie pas les utilisateurs
Auth de l'ancien projet Révision dans `auth.users`. Les données Révision
personnelles sont remappées vers les comptes scolaires par email lors de la
migration.

## 1. Créer le nouveau projet

Dans Supabase :

1. créer un projet de production dans la région la plus proche des écoles ;
2. conserver le mot de passe PostgreSQL dans le gestionnaire de secrets ;
3. configurer les URL de redirection Auth de la PWA ;
4. désactiver l'inscription publique tant que le workflow Elima ne la contrôle pas ;
5. ne jamais placer la `service_role` dans un fichier `VITE_*` ou versionné.

## 2. Générer le schéma complet

Depuis la racine :

```bash
npm run db:bundle
```

Le fichier `supabase/generated/elima-unified-database.sql` contient, dans l'ordre :

1. le schéma scolaire de référence ;
2. toutes les migrations `elima.tech` ;
3. les migrations mobiles ;
4. le module Révision commun ;
5. les règles de messagerie v2.

Configurer `.env` avec les valeurs du nouveau projet uniquement :

```env
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_DB_URL=postgresql://postgres.PROJECT_REF:PASSWORD@HOST:5432/postgres
```

Puis appliquer le bundle dans une transaction :

```bash
npm run db:migrate
```

Le script refuse d'agir si l'URL API, la clé serveur et l'URL PostgreSQL ne
désignent pas le même projet. Une erreur SQL annule toute la transaction.

## 3. Migrer les données scolaires

Le projet `elima.tech` est la source principale. Migrer d'abord son schéma Auth
et ses données métier avec les outils de sauvegarde/restauration Supabase.
Après restauration, vérifier obligatoirement :

```sql
select count(*) from auth.users;
select count(*) from public.users;
select count(*) from auth.users a left join public.users u on u.id = a.id where u.id is null;
select role, count(*) from public.users group by role order by role;
```

La troisième requête doit retourner `0`.

## 4. Conserver les exercices générés

Les contenus suivants ne dépendent pas de `auth.users` et peuvent garder leurs UUID :

- `quiz_sets` ;
- `quiz_questions` ;
- `quiz_answers` ;
- `cached_course_summaries`.

Le corpus généré se trouve par défaut dans
`C:/Users/tuoab/OneDrive/Elima/dev/quiz_generation/data`.

Valider sans écrire :

```bash
npm run db:seed:quizzes:dry
```

Importer le catalogue validé :

```bash
npm run db:seed:quizzes
```

L'import conserve les UUID, associe la bonne réponse à un identifiant stable,
retire les mentions de lettres de réponse dans les explications et place les
packs incohérents dans `supabase/generated/quiz-import-quarantine.json`.

### Démonstration

```bash
npm run db:seed:demo
npm run db:seed:demo-history
npm run db:verify
```

Le dernier script vérifie le catalogue, les historiques et les règles RLS de
messagerie en simulant un professeur et un administrateur.

## 5. Migrer les progressions personnelles

Les UUID Auth de l'ancien projet Révision ne doivent pas être réutilisés. Exporter
les données avec l'email de l'ancien compte, puis résoudre le nouvel UUID via
`auth.users.email` avant insertion dans :

- `student_profiles` ;
- `user_progress` ;
- `quiz_attempts` ;
- `scanned_exams` ;
- `user_course_summaries`.

Les lignes sans correspondance email sont placées en quarantaine et ne doivent
pas être rattachées automatiquement à un autre élève.

## 6. Configuration de l'application

Seules ces variables Supabase client restent nécessaires :

```env
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`VITE_REVISION_SUPABASE_URL` et `VITE_REVISION_SUPABASE_ANON_KEY` sont supprimées.
Le client Révision réutilise maintenant la session du client principal.

Les scripts et Vite 8 nécessitent Node.js 22.12 ou plus récent.

## 7. Messagerie

La migration `20260715110000_messaging_access_v2.sql` impose :

- professeur : participant explicite ou classe affectée ;
- professeur : accès de classe limité aux échanges pédagogiques, annonces, emploi du temps, fournitures, notes et absences ;
- professeur : aucun accès implicite aux échanges parent-admin, paiements et commandes ;
- parent/élève : enfant, classe ou participation explicite ;
- comptable : participation explicite uniquement ;
- admin école/super admin : toute l'école, via la vue volontaire « Toute l'école » ;
- chaque ouverture admin de cette vue crée `MESSAGING_VIEW_ALL` dans `audit_logs`.

## 8. Recette avant bascule

- tester un compte de chacun des six rôles ;
- vérifier qu'un professeur A ne voit pas la conversation du professeur B ;
- vérifier qu'un professeur ne voit pas `payment_reminder` ou `store_order` sans participation ;
- vérifier que l'admin voit d'abord « Mes échanges », puis peut demander « Toute l'école » ;
- vérifier la présence de l'audit `MESSAGING_VIEW_ALL` ;
- jouer un quiz et contrôler `quiz_attempts` + `user_progress` ;
- exécuter `npm run build`.
