# Proposition de base canonique

## Principes

- le projet mobile `rydnrvvmwixrkmnvpajf` devient la Demo physique ;
- les migrations de ce dépôt deviennent la seule source de vérité ;
- `students` reste l'identité scolaire unique ;
- les profils et tentatives pédagogiques pointent vers le même compte/élève ;
- les requêtes web et mobile restent distinctes ;
- `users.school_id` reste temporairement compatible, mais
  `school_memberships` devient la relation d'autorité multi-tenant ;
- la Production reçoit les migrations et `seed.base.sql`, jamais les données
  Demo.

## Noyau canonique

```text
auth.users
  └── profiles/users
      └── school_memberships ── schools

schools
  ├── terms / academic_years
  ├── classes ── subjects
  ├── teachers ── teacher_subject_classes
  ├── students ── enrollments
  │   ├── student_guardians ── guardians/parents
  │   ├── grades / attendance / reports / payments
  │   └── learning_profiles / quiz_attempts / learning_attempts
  └── school_features
```

Pour limiter le risque, les tables historiques `users`, `parents`,
`student_parents` et le `class_id` actuel de `students` restent compatibles
pendant la transition. `enrollments` et `school_memberships` sont ajoutées avant
de retirer une relation existante.

## Décisions

| Concept | Canonique | Compatibilité |
|---|---|---|
| Établissement | `schools` | aucun renommage visible |
| Profil utilisateur | `users` puis vue/type partagé `profiles` | ne pas dupliquer `auth.users` |
| Appartenance | `school_memberships` | backfill depuis `users.school_id` |
| Élève | `students` | `student_profiles` reste le profil d'apprentissage |
| Parent/responsable | `parents` + `student_parents` | évolution future vers alias guardian sans changer « Parent » |
| Classe annuelle | `enrollments` | `students.class_id` conservé jusqu'à validation |
| Évaluation scolaire | `evaluations` + `grades` | distincte des quiz |
| Révision | `quiz_*`, `learning_*`, `user_progress` | reliée à `auth.uid()` et au `students.user_id` |
| Fonctionnalités | `school_features` | remplace les décisions uniquement côté UI |

## Reprise minimale depuis le web

À migrer vers Demo parce que le code actif les appelle :

- `auth_verification_challenges` ;
- `student_prospects` ;
- `school_join_codes` et sa fonction de création ;
- buckets `documents` et `elima-files`, après décision public/privé ;
- migrations récentes du web non encore présentes dans le bundle canonique.

Ne pas reprendre sans dépendance prouvée :

- `courses`, `quizzes`, `quiz_results`, `cached_quiz_sets` historiques ;
- les neuf écoles et comptes de test de la base web ;
- les seeds historiques multi-écoles.

## Demo

`seed.demo.sql` doit créer exactement un établissement nommé
`Collège Moderne Abidjan`. Cette exigence remplace toute ancienne proposition
de seconde école de test. Un parent unique doit être lié à deux élèves de
classes distinctes, avec données scolaires et pédagogiques distinctes.

