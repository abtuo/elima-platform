# Audit de la base elima.tech

Projet historique : `nnsgvnjzfrcmbxfwlyow`.

## État constaté

- 54 tables ou ressources exposées ;
- 42 792 lignes exportées via PostgREST ;
- 116 utilisateurs exportés via Auth Admin ;
- buckets publics `documents` et `elima-files` ;
- schéma initial et 24 migrations suivis dans Git ;
- aucune Edge Function versionnée et aucun cron/webhook SQL détecté.

La base contient neuf établissements, dont plusieurs variantes de données de
test. Ces données ne doivent pas être copiées dans la nouvelle Demo.

## Éléments réellement utilisés par le web

| Domaine | Tables principales | Décision |
|---|---|---|
| Tenant et identité | `schools`, `users` | fusionner avec le modèle déjà présent en Demo |
| Scolarité | `classes`, `subjects`, `teachers`, `students`, `parents`, `student_parents` | canonique commun |
| Pédagogie scolaire | `terms`, `evaluations`, `grades`, `attendance`, `homeworks`, `lesson_logs`, `timetable_events` | reprendre/conserver |
| Finance | `student_fees`, `payments`, `student_payments` | conserver |
| Documents | `documents`, buckets `documents`, `elima-files` | reprendre buckets et politiques nécessaires |
| Communication | `conversations`, `conversation_participants`, `messages`, `notifications` | fusionner avec les RPC et RLS mobiles |
| Fournitures et boutique | `supply_*`, `store_*` | conserver car routes actives |
| Onboarding | `student_prospects`, `student_activation_codes`, `auth_verification_challenges`, `school_join_codes` | reprendre les éléments réellement appelés |
| Pilotage | `academic_metrics`, `student_learning_profiles`, `ai_insights`, `reports` | conserver séparé des profils d'apprentissage mobiles |

Écarts vérifiés avec la Demo :

- `auth_verification_challenges` et `student_prospects` sont absents de la Demo ;
- `school_join_codes` est référencé par le web mais absent des contrats
  PostgREST exportés des deux projets : sa migration doit être consolidée ;
- les tables web historiques `courses`, `quizzes`, `quiz_results` et
  `cached_quiz_sets` ne sont pas utilisées par le mobile canonique ; elles
  restent historiques tant qu'aucune route active ne les exige ;
- `classes.default_room`, présent en Demo, doit être conservé.

## Risques

- plusieurs routes web utilisent une clé serveur après avoir vérifié l'acteur :
  chaque route doit conserver un filtre explicite `school_id` ;
- les buckets web sont publics ; les documents privés nécessitent un bucket
  privé ou des chemins et politiques stricts ;
- l'état Dashboard (Auth URLs, SMTP/WhatsApp, webhooks) n'est pas reconstructible
  à partir du dépôt seul ;
- les seeds historiques créent plusieurs écoles et ne doivent pas devenir le
  seed Demo canonique.

