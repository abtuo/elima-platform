# Core School — schéma de référence

## Cible et source

- Projet Supabase : `elima.tech` / Core School / Identity.
- Project ref : `nnsgvnjzfrcmbxfwlyow`.
- Région observée : `eu-west-3`.
- PostgreSQL observé : 17.
- Snapshot structurel : `database/core/baseline/schema.sql`.

Le snapshot a été construit en lecture seule depuis les catalogues PostgreSQL et l’API Storage. Il contient les tables et colonnes, contraintes, clés étrangères, index, vues, fonctions, triggers, RLS, types, extensions et configuration des buckets. Il exclut les lignes applicatives, utilisateurs Auth, objets Storage et secrets.

## État observé

Le schéma applicatif contient 56 tables publiques, 14 fonctions publiques et 60 politiques RLS publiques ou Storage. Les buckets visibles sont `documents` et `elima-files`.

La relation `supabase_migrations.schema_migrations` n’existe pas. Le schéma est donc réel et exploité, mais il n’est pas rattaché à un historique Supabase CLI vérifiable. Les migrations de `apps/platform/supabase/migrations/` et une partie des migrations globales expliquent de nombreux objets, sans prouver comment ils ont été exécutés.

Le lint distant Supabase n’a signalé aucune erreur de schéma.

La CLI indique `walg_enabled=true`, `pitr_enabled=false` et ne retourne aucun backup physique disponible. Une sauvegarde logique récente et testée est donc un prérequis bloquant avant migration.

## Domaines principaux

- Identité scolaire : `users`, `schools`, `teachers`, `parents`, `students`, `student_parents`.
- Pédagogie scolaire : classes, matières, évaluations, notes, présences et emplois du temps.
- Finance : frais, paiements et échéanciers.
- Communications : conversations, participants, messages et notifications.
- Ancien Store scolaire : `store_products`, `store_packs`, `store_pack_items`, `store_orders`, `store_order_items`.
- Auth applicative : challenges et tentatives OTP.

## Ancien Store

Les cinq tables historiques ont RLS activé et conservent leurs politiques parents/administrateurs. Leur modèle est lié aux établissements, classes, élèves et parents.

Audit agrégé au 20 octobre 2026 :

| Table | Lignes | Démo vérifiée | Hors démo vérifié |
|---|---:|---:|---:|
| `store_products` | 17 | 7 | 10 |
| `store_packs` | 10 | 1 | 9 |
| `store_pack_items` | 79 | non déterminé sans jointure indirecte | non déterminé |
| `store_orders` | 2 | 2 | 0 |
| `store_order_items` | 6 | dépend des commandes | dépend des commandes |

Les produits et kits ne sont donc pas tous fictifs. Aucune suppression automatique n’est acceptable.

## Objets non reliés aux migrations canoniques

L’absence d’historique empêche d’affirmer qu’un objet a été créé dans le SQL Editor plutôt que par un ancien script. Les objets suivants existent dans le schéma courant mais ne sont pas déclarés dans les migrations canoniques actuelles : `academic_metrics`, `cached_quiz_sets`, `courses`, `demo_requests`, `level_subjects`, `quiz_results`, `quizzes`, `student_term_summaries`, `teacher_memos` et `teacher_todos`.

Ils sont désormais couverts par le baseline. Leur chronologie ne doit pas être reconstruite artificiellement.

## Auth et administration Store

L’endpoint Auth public confirme :

- inscription activée ;
- téléphone activé ;
- fournisseur SMS `twilio_verify` ;
- confirmation téléphone automatique désactivée ;
- e-mail activé.

`/admin` exige une session Auth Core School puis une ligne active dans `store_staff`. Le rôle ne doit être attribué qu’après application de la Phase 2A et autorisation explicite.
