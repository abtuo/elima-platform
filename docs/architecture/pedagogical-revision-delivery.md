# Livraison des supports pédagogiques dans Révision

La Phase 5 publie une version pédagogique validée et immuable dans Elima Révision. Elle ne remplace ni les QCM historiques, ni les fiches, ni les parcours Learning.

## Frontières de données

- `pedagogical_publications` porte le canal `revision`, la fenêtre de disponibilité, le mode entraînement/évaluation, la limite d’essais et la politique de corrigé.
- `pedagogical_assignments` affecte une publication à une ou plusieurs classes, ou à un élève. Les groupes ne sont pas acceptés.
- `pedagogical_revision_attempts` et `pedagogical_revision_answers` conservent les nouvelles traces, avec un lien obligatoire vers la version publiée.
- Les tables historiques `learning_*` ne sont pas modifiées. La correction fermée appelle l’adaptateur Learning et son validateur déterministe existant.
- Les réponses ouvertes, les analyses scientifiques et les résolutions par étapes restent `pending_review`; elles ne sont pas présentées comme auto-notées.

## Contrôle d’accès élève

À chaque liste, lecture, démarrage ou réponse, l’API vérifie le lien d’identité, l’inscription active, l’établissement, l’affectation courante, l’état de publication et les dates. Un retrait bloque donc les nouveaux accès sans supprimer les tentatives passées.

La lecture du support ne charge que `public_document`. Les secrets ne sont chargés côté serveur qu’après autorisation d’une réponse. La projection HTTP ne retourne ni barème privé, ni clé de réponse, ni identifiants techniques de tenant.

## Corrigés et idempotence

Les politiques `teacher_only`, `never`, `after_due_date` et `after_submission` sont appliquées serveur. `reveal_after_attempts` complète `after_submission`. Les clés d’idempotence rendent le démarrage d’une tentative et l’enregistrement d’une réponse rejouables sans duplication.

## Exploitation

La migration `20261010140000_pedagogical_revision_delivery.sql` est additive et doit être appliquée par la procédure Supabase habituelle après sauvegarde et validation en environnement de recette. Ce changement n’exécute aucune migration distante automatiquement.

Variables et services requis :

- configuration Supabase/API déjà utilisée par Révision ;
- aucune nouvelle clé IA ;
- endpoint `POST /api/pedagogical-learning` pour l’élève ;
- endpoint `/api/pedagogical-publications` (`GET`, publication, affectation, retrait, suivi) pour les personnels autorisés.
