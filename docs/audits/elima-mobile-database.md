# Audit de la base elima.mobile / Demo

Projet : `rydnrvvmwixrkmnvpajf`.

## État constaté

La base mobile est déjà une fusion partielle : elle contient le socle scolaire
de `elima.tech` et les modules pédagogiques propres au mobile.

- 76 tables ou ressources exposées ;
- 26 fonctions publiques ;
- 17 triggers publics ;
- 86 politiques RLS sur 55 tables ;
- 7 enums ;
- 1 bucket privé, `exam-sources` ;
- aucun cron `pg_cron` détecté ;
- aucune Edge Function versionnée.

La Demo ne respecte pas encore la nouvelle règle de données :

- elle contient deux établissements de démonstration ;
- le nom actuel est `Collège Moderne d'Abidjan` au lieu de
  `Collège Moderne Abidjan` ;
- des textes stockés présentent des traces de mauvais encodage ;
- elle contient 584 élèves mais seulement 29 profils `users`, ce qui impose de
  distinguer personne scolaire et compte Auth ;
- l'export Auth mobile reste à compléter.

## Classification

| Élément | Origine | Usage | Décision | Risque |
|---|---|---|---|---|
| `schools`, `users`, `classes`, `subjects`, `teachers` | web, déjà repris | socle partagé | C — canonique commun | moyen, RLS tenant |
| `students`, `parents`, `student_parents` | web, déjà repris | identité scolaire et famille | C — canonique commun | élevé, identité et accès parent |
| `terms`, `evaluations`, `grades`, `attendance` | web, déjà repris | suivi scolaire | C — canonique commun | élevé, données historiques |
| `homeworks`, `lesson_logs`, `timetable_events` | web, déjà repris | enseignant, élève, parent | C — canonique commun | moyen |
| `payments`, `student_fees`, `store_*`, `supply_*` | web, déjà repris | finance et fournitures | B/C — conserver | élevé, montants et autorisations |
| `conversations`, `messages`, `notifications` | commun | communication | C — conserver avec RPC mobiles | élevé, confidentialité |
| `student_profiles`, `user_progress`, `quiz_*` | mobile | révision légère | A/D — conserver séparé du scolaire, relié au même élève | moyen |
| `learning_*`, `exam_subjects`, `student_skill_state` | mobile | exercices guidés et recommandations | A/D — conserver | moyen |
| `identity_links` | mobile | compatibilité identité historique | D — temporaire et documenté | élevé |
| `elima_*_migrations` | infrastructure actuelle | suivi des bundles ad hoc | E — ne pas prendre comme modèle canonique | faible |
| `cached_course_summaries` | mobile, vide | cache pédagogique | D — conserver si le service reste actif | faible |

Une table vide n'est pas déclarée obsolète lorsque le code ou les migrations
l'utilisent.

## Sécurité

Les fonctions `current_user_school_id`, `user_can_access_student`,
`mobile_teacher_has_class`, `mobile_family_has_student` et
`mobile_can_access_conversation` structurent déjà l'isolation. Les index et les
86 politiques devront être rejoués et testés depuis des sessions authentifiées,
pas uniquement avec une clé serveur.

Points à corriger :

- `users.school_id` ne représente qu'une appartenance ; ajouter
  `school_memberships` avant d'envisager plusieurs établissements par compte ;
- les tables de contenu pédagogique lisibles par tout utilisateur authentifié
  sont acceptables seulement si elles ne contiennent aucune donnée privée ;
- la clé secrète serveur ne doit jamais entrer dans Vite ;
- les données Demo doivent être nettoyées uniquement par identifiants et après
  contrôle du Project ref.

