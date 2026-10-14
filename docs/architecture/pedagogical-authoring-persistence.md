# Domaine auteur pédagogique — proposition de persistance et publication

## Statut

Proposition pour la phase suivante. Aucun schéma SQL ni endpoint n’est créé dans la Phase 1.

Le format canonique est défini dans `packages/pedagogy`. Les tables historiques `quiz_*` et `learning_*` restent inchangées et continuent à servir les contenus existants.

## Agrégats proposés

### `pedagogical_resources`

Identité éditable et tenant-scopée d’un support :

- `id`, `school_id`, `created_by_user_id`;
- type, titre courant et visibilité;
- état éditorial courant;
- version de travail courante;
- timestamps et archivage logique.

La ressource appartient à l’établissement. L’enseignant créateur n’est pas nécessairement le seul futur éditeur; les droits doivent passer par l’appartenance et des règles explicites.

### `pedagogical_resource_versions`

Instantané immuable après validation/publication :

- `resource_id`, numéro de version et `schema_version`;
- document public JSON validé;
- secrets privés dans une colonne/table distincte chiffrable et jamais sélectionnée par les clients;
- checksum, auteur et parent éventuel;
- état `draft`, `in_review`, `validated`, `rejected` ou `superseded`.

Une publication référence toujours une version, jamais « la dernière version » implicitement.

### `pedagogical_resource_reviews`

Résultats des contrôles structurels, métier, pédagogiques et humains : type de contrôle, version du validateur, erreurs/avertissements, relecteur, décision et date. Une validation experte ne doit pas être déduite du seul succès Zod.

### `pedagogical_publications`

Publication atomique d’une version validée : canal (`revision`, `student_pdf`, `teacher_pdf`), état, dates de disponibilité/retrait et identifiants de projection Learning. Une republication après modification crée une nouvelle publication/version.

### `pedagogical_assignments`

Association entre une publication immuable et une classe ou des élèves : échéance, mode, nombre de tentatives et politique de révélation des corrigés. Les résultats élèves référencent cette affectation et la version publiée.

### `pedagogical_resource_events`

Historique append-only des changements significatifs : création, dérivation de version, soumission en revue, validation, publication, retrait et affectation.

### `pedagogical_generation_jobs` et `pedagogical_ai_events`

À introduire seulement avec la phase IA : job idempotent, état, paramètres non secrets, modèle/déploiement, version de prompt, tokens, latence, coût estimé, erreurs et remboursements de quota.

## Relations avec le domaine existant

```text
schools ── school_memberships ── users/teachers
   │
   └── pedagogical_resources ── pedagogical_resource_versions
                                   ├── reviews
                                   └── publications ── assignments ── classes/students
                                          │
                                          └── projection vers learning_exercises / exam_subjects
                                                   └── learning_attempts / learning_answers
```

`learning_*` reste le modèle d’exécution. Une projection doit enregistrer l’identifiant de publication/version afin que les tentatives ne changent jamais de sens après une nouvelle édition.

## Multi-tenant et affectations

1. `school_memberships` doit devenir l’autorité d’appartenance à un établissement.
2. Une seule relation enseignant-classe-matière devra être désignée canonique avant la migration. Aujourd’hui, Platform vérifie principalement `class_teachers`, tandis que certaines policies Learning utilisent `teacher_subject_classes`.
3. Pendant la transition, le serveur pourra exiger la présence cohérente dans les deux relations ou utiliser une vue/fonction d’autorité, mais il ne faut pas choisir silencieusement l’une dans une nouvelle policy.
4. Toute opération avec un client Supabase admin doit vérifier explicitement rôle, `school_id`, appartenance active et affectation matière/classe.
5. Le partage inter-établissements reste hors du premier périmètre.

## Séparation des corrigés

- Le JSON public et les secrets privés ne doivent jamais être retournés par la même requête élève.
- Les projections de `@elima/pedagogy` réduisent les données, mais l’autorisation reste serveur.
- La politique d’ouverture d’un corrigé appartient à l’affectation : après réussite, nombre de tentatives, remise ou échéance.
- Les PDF élève sont générés depuis la projection publique; les PDF enseignant exigent une permission spécifique.
- Les logs, caches et événements analytiques ne doivent pas recopier les réponses attendues.

## Stratégie de publication

1. Valider le bundle avec la version exacte du package de contrats.
2. Refuser les erreurs; conserver les avertissements pour décision humaine.
3. Figer la version et son checksum.
4. Transformer uniquement les questions supportées par l’adaptateur Learning.
5. Écrire contenu public et secrets dans leurs destinations séparées au sein d’une transaction.
6. Enregistrer le mapping publication → objets Learning.
7. Créer ensuite les affectations.

Un type non pris en charge doit bloquer la publication interactive de ce bloc ou rester en lecture seule; il ne doit pas être converti en réponse texte générique sans décision explicite.

## Compatibilité et déploiement

- Aucun ancien quiz ou parcours n’est migré.
- Les nouveaux supports peuvent être activés derrière une feature flag d’établissement.
- Le renderer devra vivre dans `packages/revision-ui`, mais le package de domaine demeure sans React.
- Les migrations futures doivent être additives et accompagnées de tests école A/école B, fuite de corrigés, immutabilité de version et conservation des tentatives.
