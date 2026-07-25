# Décisions de schéma

| Concept | Décision | Compatibilité |
|---|---|---|
| Élève | `students` unique | `student_profiles` reste pédagogique |
| Compte | `auth.users` + `public.users` | aucun second Auth |
| Tenant | `school_memberships` | `users.school_id` conservé |
| Classe annuelle | `enrollments` | `students.class_id` conservé |
| Parent | `parents` + `student_parents` | libellé « Parent » inchangé |
| Scolaire | `evaluations`, `grades`, `attendance` | distinct des quiz |
| Révision | `quiz_*`, `learning_*`, `user_progress` | même UUID utilisateur |
| Recommandation | profils et `ai_insights`, règles web | pas de doublon artificiel |
| Documents | métadonnées `documents`, objets Storage privés | chemins préfixés par `school_id` |

Les tables web historiques `courses`, `quizzes`, `quiz_results` et
`cached_quiz_sets` ne sont pas copiées sans dépendance active.

