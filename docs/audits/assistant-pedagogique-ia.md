# ELIMA — Audit technique préalable à l’Assistant pédagogique IA

> Audit réalisé le 10 octobre 2026 sur l’état local du dépôt, branche `feature/public-auth-onboarding`.
>
> Périmètre : lecture du code, des migrations, des données locales et de la documentation active. Aucun appel à une base distante, aucun script de données, aucune installation, aucune migration et aucun test modifiant des données n’ont été exécutés. Les répertoires `_references` n’ont pas été inspectés, conformément à la contrainte. Le worktree comportait déjà de nombreux changements locaux, notamment la séparation de `apps/site`; ils ont été préservés.

## A. Synthèse exécutive

### Conclusion

Elima possède déjà une base technique substantielle pour afficher et exécuter des ressources pédagogiques interactives : catalogue niveaux/matières/chapitres, exercices et examens structurés, questions publiques séparées des réponses privées, indices progressifs, corrections détaillées, tentatives, scores, maîtrise par compétence, rendu Markdown/LaTeX, QCM, réponses numériques ou libres, parcours guidés et analyse GPT assistée. Ces capacités sont principalement portées par `supabase/migrations/20260719150000_learning_assignments.sql`, `apps/api/server/handlers/learning.mjs`, `packages/revision-core` et les expériences élève de `apps/mobile` / `apps/revision`.

En revanche, le futur Assistant pédagogique ne peut pas être construit comme une simple extension de la génération actuelle de QCM/fiches. Le dépôt ne contient pas encore de domaine auteur complet : pas de ressource pédagogique appartenant à un enseignant et à un établissement, pas de versions immuables, pas de workflow brouillon → validation → publication, pas d’affectation d’une version à une classe, pas de variantes élève/enseignant, pas d’export pédagogique PDF, pas de traçabilité éditoriale des validations, et pas de référentiel officiel ivoirien attesté.

La recommandation est de conserver les trois frontières existantes :

1. **Elima Platform** comme atelier enseignant et point d’entrée naturel, à proximité de « Ressources », « Cahier de textes » et « Devoirs » (`apps/platform/src/app/teacher/layout.tsx`).
2. **`apps/api`** comme frontière serveur pour l’orchestration IA, la validation, les secrets, les quotas et la publication (`apps/api/server/routes.mjs`, `apps/api/server/azureOpenAi.mjs`).
3. **Elima Révision** comme moteur d’exécution élève, en réutilisant `@elima/revision-core`, `@elima/revision-ui` et le modèle Learning existant.

Le cœur à ajouter devra être un format structuré et versionné de ressource pédagogique. Il ne faut ni stocker un unique HTML généré, ni publier directement la première sortie du modèle. Le contenu devra être généré sous forme de blocs typés, validé structurellement, scientifiquement et pédagogiquement, relu par l’enseignant, figé dans une version publiée, puis projeté vers le moteur Learning.

### Forces observées

- Monorepo npm réellement organisé en cinq applications et sept packages partagés (`package.json`, `docs/monorepo.md`).
- Base Supabase commune et identité `auth.uid()` partagée entre scolaire et Révision (`docs/architecture/unified-database.md`).
- Moteur Learning riche : exercices, parties, questions, secrets, indices, corrections, examens, tentatives, réponses et états de compétence (`supabase/migrations/20260719150000_learning_assignments.sql`).
- Protection explicite des corrigés : absence de droit direct élève sur `learning_question_secrets`, `learning_question_hints` et `learning_solution_steps`.
- Rendu partagé Markdown/GFM/LaTeX avec React Markdown et KaTeX (`packages/revision-ui/src/MarkdownContent.tsx`).
- Validation déterministe prioritaire pour les formats fermés et numériques, avec GPT réservé aux réponses sémantiques ou mathématiques complexes (`apps/api/server/handlers/learning.mjs`, symboles `validateAnswer`, `shouldUseGpt`, `assessWithGpt`).
- Azure OpenAI, Azure Document Intelligence, quotas et remboursements en cas d’échec fournisseur déjà encapsulés côté serveur (`apps/api/server/azureOpenAi.mjs`, `apps/api/server/revisionDocumentService.mjs`, `apps/api/server/revisionEntitlement.mjs`).
- Contexte enseignant existant : établissement, enseignant, classes, matières, élèves et affectations (`apps/platform/src/app/teacher/TeacherContext.tsx`, `apps/platform/src/lib/teacher/server.ts`).

### Écarts bloquants avant développement

- Absence de modèle canonique auteur/version/publication/affectation.
- Catalogue Learning global non rattaché à `school_id` ni à un auteur; il n’exprime pas les états éditoriaux attendus.
- Génération actuelle limitée à une fiche Markdown ou un QCM, avec `response_format: json_object` mais sans schéma JSON strict ni validation exhaustive (`apps/api/server/handlers/revision-generate.mjs`).
- Aucun référentiel officiel ivoirien versionné et sourcé; les fichiers locaux se déclarent « Programme ivoirien », mais cette mention ne prouve pas leur origine officielle (`data/exams/*.json`).
- Aucun contenu local SVT Terminale D comparable au démonstrateur demandé; seules une matière SVT générique et une démo « digestion » sont présentes (`packages/revision-core/src/demoData.ts`).
- Pas d’éditeur de blocs pédagogique ni de workflow de revue enseignant.
- Pas d’export PDF pédagogique élève/enseignant. `pdf-lib` existe pour des reçus et factures, pas pour du Markdown/KaTeX multipage (`apps/platform/src/lib/finance/pdf-shared.ts`).

### Recommandation MVP

Le MVP doit couvrir deux gabarits contrôlés : **Mathématiques 3e — équations du premier degré** et **SVT Terminale D — fonctionnement du tissu nerveux**. Il doit produire une ressource structurée, permettre la relecture et les corrections manuelles, publier une version figée, afficher cette version dans Révision et corriger uniquement les types déterministes fiables. Les réponses libres et démonstrations peuvent recevoir une aide IA, mais ne doivent pas être la seule base d’une note sommative au MVP.

## B. Cartographie de l’architecture existante

### B.1 Monorepo et applications

La racine utilise les workspaces npm `apps/*` et `packages/*` (`package.json`).

| Application | Responsabilité observée | Technologies et points d’entrée |
|---|---|---|
| `apps/platform` | Portail web complet : administration scolaire, espaces enseignant/élève/parent, notes, devoirs, cahier de textes, messagerie, finance et intégration Révision. | Next.js 16, React 19, TypeScript, Tailwind 4, Supabase SSR, Zod; routes dans `apps/platform/src/app`, APIs Next dans `apps/platform/src/app/api`. |
| `apps/mobile` | PWA légère multi-rôle pour les usages quotidiens; inclut l’expérience Révision élève et des parcours enseignant simplifiés. | Vite 7, React 18, React Router 6, Tailwind 3, Supabase JS, PWA; routeur sous `apps/mobile/src/app`, services sous `apps/mobile/src/services`. |
| `apps/revision` | Application Elima Révision autonome, web et Android natif. | Même socle Vite/React que Mobile, PWA, Capacitor 8, projet Android dans `apps/revision/android`, routes dans `apps/revision/src/router.tsx`. |
| `apps/api` | Backend Node/Vercel autonome : identité, Learning, IA Révision, analyse documentaire, abonnement. | Node ESM, Supabase JS, Azure OpenAI via `fetch`; dispatch dans `apps/api/server/routes.mjs` et fonction catch-all `apps/api/api/[...route].mjs`. |
| `apps/site` | Site marketing public récemment séparé de Platform. | Next.js 16, React 19; pages marketing dans `apps/site/src/app`. L’application est présente dans l’état local actuel mais plusieurs fichiers sont encore non suivis/déplacés dans le worktree. |

Les responsabilités documentées dans `docs/monorepo.md` concordent globalement avec le code actuel. Certaines documentations plus anciennes emploient encore `web/` ou présentent Capacitor comme futur (`docs/architecture/web-and-mobile-responsibilities.md`, `README.md`), alors que l’état réel contient `apps/platform` et un Android Capacitor sous `apps/revision`. L’audit retient le code actuel comme autorité.

### B.2 Packages partagés

| Package | Rôle observé |
|---|---|
| `packages/api-client` | Résolution sécurisée de l’origine API et wrapper `fetch` (`src/apiUrl.ts`, `src/apiClient.ts`). |
| `packages/auth` | Identité, stockage de session navigateur, contrats WhatsApp (`src/identity.ts`, `src/storage.ts`). |
| `packages/branding` | Logos et tokens CSS partagés; copie d’assets lors des builds Platform/Site. |
| `packages/revision-core` | Contrats, règles, sessions, accès API et services de données Révision/Learning (`src/types.ts`, `src/learningApi.ts`, `src/revisionDataService.ts`). |
| `packages/revision-ui` | UI réutilisable : Markdown/KaTeX, lecteur de QCM, cartes, progression et scanner (`src/MarkdownContent.tsx`, `src/RevisionQuizPlayer.tsx`, `src/RevisionViews.tsx`). |
| `packages/shared-domain` | Rôles et environnement partagés (`src/roles.ts`, `src/environment.ts`). |
| `packages/supabase-client` | Configuration et création du client Supabase navigateur (`src/config.ts`, `src/browser.ts`). |

La mutualisation Révision est réelle mais incomplète. Les primitives transverses sont partagées, tandis que des pages complexes sont dupliquées entre `apps/mobile/src/features/revision` et `apps/revision/src/features/revision`. Par exemple, `GuidedSessionExperience.tsx` et `CoursesPage.tsx` sont identiques dans les deux applications au moment de l’audit, alors que `LearningSolverPage.tsx` et `QuizPage.tsx` ont déjà divergé. Toute nouvelle UI pédagogique complexe devrait donc être déplacée vers `packages/revision-ui` ou découpée en contrôleurs propres aux shells et vues partagées.

### B.3 Flux frontend/backend

Les flux observés sont de deux types :

```text
Platform (Next) ── fetch /api/teacher/* ── routes Next ── client Supabase admin ── Supabase

Mobile / Révision / Platform-Révision
  ├─ client Supabase + RLS ── lectures/écritures personnelles autorisées
  └─ @elima/api-client ── apps/api ── service role + Azure ── Supabase / fournisseurs IA
```

- Platform utilise des routes serveur dédiées pour les opérations enseignant. Exemple : `apps/platform/src/app/api/teacher/homework/route.ts` résout l’utilisateur via `resolveTeacher`, vérifie l’affectation via `assertTeacherAssignment`, puis filtre par `school_id`.
- Révision utilise `packages/revision-core/src/learningApi.ts` pour appeler `/api/learning` avec un Bearer JWT. Le backend retourne le catalogue public, garde les secrets côté serveur et enregistre les réponses.
- Les apps Vite lisent directement certaines tables via Supabase sous contrôle RLS, notamment la progression, les anciens quiz et les fiches (`packages/revision-core/src/revisionDataService.ts`).
- Platform intègre aussi Révision via `apps/platform/src/components/revision/PlatformRevision.tsx` et `apps/platform/src/lib/revision-client.ts`.

### B.4 Modèle scolaire et multi-tenant

Le schéma scolaire historique est défini dans `apps/platform/supabase/schema.sql` :

- `schools`, `users`, `teachers`, `students`, `classes`, `subjects`;
- relations d’enseignement `class_teachers` et `teacher_subject_classes`;
- `evaluations`, `grades`, `homeworks`, `lesson_logs`;
- `conversations`, `conversation_participants`, `messages`.

La fondation canonique plus récente ajoute `school_memberships`, `enrollments`, `school_features` et `documents` dans `supabase/migrations/20260725120000_unified_tenant_foundation.sql`. `docs/architecture/unified-database.md` indique explicitement que `school_memberships` doit devenir l’autorité multi-tenant, tout en conservant temporairement `users.school_id` et `students.class_id` pour compatibilité.

Deux relations enseignant-classe coexistent (`class_teachers` et `teacher_subject_classes`). Le code Platform récent vérifie `class_teachers` dans `assertTeacherAssignment`, tandis que les policies de lecture des tentatives Learning utilisent `teacher_subject_classes` (`supabase/migrations/20260719150000_learning_assignments.sql`). Cette dualité est un risque d’autorisation et doit être clarifiée avant de lier des publications pédagogiques aux classes.

### B.5 Domaine Learning / Révision

Le domaine comporte deux générations de modèles complémentaires :

1. **Révision historique** (`supabase/migrations/20260715100000_unified_revision_schema.sql`) :
   - `quiz_sets`, `quiz_questions`, `quiz_answers` pour des QCM;
   - `cached_course_summaries`, `user_course_summaries` pour des fiches Markdown;
   - `quiz_attempts`, `user_progress`, `user_daily_hints`, `scanned_exams`.
2. **Learning structuré** (`supabase/migrations/20260719150000_learning_assignments.sql`) :
   - catalogue `learning_levels`, `learning_subjects`, `learning_chapters`;
   - contenu `learning_exercises`, `learning_exercise_parts`, `learning_questions`;
   - secrets `learning_question_secrets`, indices `learning_question_hints`, corrections `learning_solution_steps`;
   - examens `exam_subjects`, `exam_subject_exercises`;
   - exécution `learning_attempts`, `learning_answers`, `student_skill_state`;
   - journal IA `learning_ai_evaluations` ajouté par `20260719160000_learning_discovery_and_ai.sql`.

Le format public d’une question est souple (`question_type`, `skills`, `public_metadata`), mais n’est pas contraint par un enum SQL. Les types effectivement pris en charge se répartissent en :

- ancien QCM : quatre options et une réponse correcte (`RevisionQuizPlayer`);
- Learning déterministe : `numeric`, `integer`, `rational`, `boolean`, `choice`, `multiple_choice`, `ordering`, `acknowledgement` (`validateAnswer`);
- Learning assisté : sémantique, preuve, symbolique, équation équivalente, droite/plan, variation, arbre de probabilité, code, etc. (`shouldUseGpt`);
- parcours guidé v3 : `statement`, `lesson`, `orientation`, `paper_work`, `single_choice`, `multiple_choice`, `ordering`, `self_validation`, `self_assessment`, `guided_solution` (`apps/revision/src/features/revision/GuidedSessionExperience.tsx`).

Les réponses Learning sont enregistrées dans `learning_answers` avec réponse brute, réponse structurée, score, confiance, nombre de tentatives, indices, type d’erreur et feedback. `student_skill_state` agrège maîtrise et confiance par `skill_key`. La session locale/autosauvegardée est définie par `LearningSession` dans `packages/revision-core/src/types.ts` et pilotée par `LearningSolverPage.tsx`.

### B.6 IA existante

#### Fournisseurs et usages

- **Azure OpenAI Chat Completions** : wrapper `azureChat` dans `apps/api/server/azureOpenAi.mjs`.
- **Azure Document Intelligence `prebuilt-layout`** : extraction texte, paragraphes, tables et pages dans `apps/api/server/revisionDocumentService.mjs`.
- Aucun autre fournisseur LLM, framework RAG, base vectorielle ou mécanisme d’embeddings n’a été trouvé dans le périmètre actif.

Les usages sont :

- génération d’un QCM ou d’une fiche Markdown (`apps/api/server/handlers/revision-generate.mjs`);
- analyse pédagogique d’un document scanné (`createPedagogicalAnalysis`);
- évaluation GPT d’une réponse mathématique complexe (`assessWithGpt` dans `learning.mjs`).

#### Sorties, validation et robustesse

- `azureChat` peut demander `response_format: { type: "json_object" }`, avec repli sans ce paramètre si le déploiement ne le supporte pas.
- Le JSON est ensuite parsé et normalisé manuellement. `generateQuiz` vérifie notamment quatre options uniques, un index valide et au moins cinq questions exploitables.
- Aucun schéma JSON strict, aucun validateur partagé de la ressource complète et aucune validation de références croisées/barème total n’existent actuellement.
- Le transport impose un timeout de 60 secondes (`apps/api/server/azureTransport.mjs`). Il n’existe pas de stratégie générique de retry/backoff pour Azure OpenAI; le polling Document Intelligence effectue au plus vingt lectures espacées de 750 ms.
- Les erreurs fournisseurs 408, 429 et 5xx sont marquées remboursables. `revisionEntitlement.mjs` réserve puis rembourse les quotas en cas d’échec admissible.
- `revision_ai_quota_events`, `revision_usage` et `revision_quota_reservations` apportent du suivi d’usage, mais aucun stockage du nombre réel de tokens, du coût monétaire, de la latence ou de l’identifiant de requête fournisseur n’a été observé.
- `learning_ai_evaluations` journalise fournisseur, modèle, version de prompt et résultat pour l’évaluation des réponses, mais pas les générations de fiches/QCM.

Les prompts sont aujourd’hui codés directement dans les handlers/services, sans registre versionné commun. Seul le prompt d’évaluation enregistre explicitement `learning-assessment-v1` lors de l’écriture de `learning_ai_evaluations`.

#### Configuration

Le code serveur attend notamment `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION`, `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` et `AZURE_DOCUMENT_INTELLIGENCE_KEY`. Aucune valeur de secret n’a été lue ou reproduite.

Un écart documentaire existe : `docs/env.md` mentionne `AZURE_DOCUMENT_INTELLIGENCE_API_KEY`, alors que `revisionDocumentService.mjs` lit `AZURE_DOCUMENT_INTELLIGENCE_KEY`. Ce point doit être corrigé avant toute extension du pipeline documentaire.

### B.7 Espace enseignant

La navigation Platform expose actuellement : Vue d’ensemble, Emploi du temps, Notes, Moyennes, Présences, Devoirs, Fournitures, Cahier de textes, Messagerie, Todo, Ressources et Paramètres (`apps/platform/src/app/teacher/layout.tsx`).

- **Cahier de textes** : création de séances avec date, contenu texte et URL de ressource; table `lesson_logs`; UI et API dans `teacher/lessons`.
- **Devoirs** : CRUD de devoirs par classe/matière, date et pièce jointe URL; table `homeworks`; UI/API dans `teacher/homework`.
- **Évaluations/notes** : `evaluations` et `grades`; saisie et historique dans `teacher/grades` et `/api/teacher/grades`.
- **Classes/matières** : chargées dans `TeacherContext` depuis `/api/teacher/context` avec les affectations de l’enseignant.
- **Documents** : upload de devoir limité à 10 Mo vers le bucket `documents` (`teacher/homework/upload/route.ts`). Le chemin contient `school_id`; le code retourne néanmoins une URL publique via `getPublicUrl`.
- **Ressources Platform** : page de démonstration non branchée à Supabase (`apps/platform/src/app/teacher/resources/page.tsx`).
- **Ressources Mobile** : formulaire d’upload réel/démo dans `TeacherResourcesPage.tsx`, mais `resourceService.publishTeacherResource` réutilise l’endpoint d’upload des devoirs sans créer clairement un enregistrement de ressource publié. Le recouvrement est donc partiel et incohérent.
- **Communication** : messagerie enseignant active via `teacher/messages` et le domaine conversations/messages.

Le parcours actuel est fragmenté : une séance du cahier de textes, un devoir, une évaluation et une ressource ne partagent pas d’objet pédagogique commun. Il n’existe pas d’action « créer depuis ce cours », « joindre cette ressource au devoir » ou « publier dans Révision ».

Le point d’intégration recommandé est un atelier **Assistant pédagogique** accessible depuis la page **Ressources**, avec des actions contextuelles secondaires depuis **Cahier de textes** et **Devoirs**. Ajouter un treizième item principal dès le MVP alourdirait une navigation déjà dense. Le vocabulaire « Ressources » est établi; l’assistant peut d’abord être une capacité de cet espace, puis devenir un item principal si les usages le justifient.

### B.8 Capacités de rendu

- Markdown, GFM et LaTeX : existants dans `packages/revision-ui/src/MarkdownContent.tsx` via `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex` et `katex`.
- Tableaux : Markdown GFM et tableaux structurés dans `GuidedSessionExperience.StatementDisplay` / `StructuredSolution`.
- Graphiques simples : barres construites en CSS dans `StructuredSolution`; pas de bibliothèque de graphiques scientifique générique.
- Images : affichage générique possible dans Markdown; uploads/scans existants. Aucun bloc image légendé et sourcé n’est défini dans le modèle Learning.
- Diagrammes scientifiques : absent en tant que moteur; certains types de `display` produisent seulement une description textuelle.
- QCM : existant dans l’ancien moteur et dans les sessions guidées.
- Réponse numérique : validée côté serveur mais rendue actuellement par un `textarea`, pas par un champ numérique spécialisé (`LearningSolverPage.tsx`).
- Réponse libre et démarche : existantes avec réponse finale, jusqu’à huit étapes, confiance et feedback détaillé.
- Progression/score/tentatives/historique : existants dans les deux générations de moteur.
- Éditeur riche/blocs : absent. Les formulaires enseignant utilisent `input`/`textarea`.
- Impression/export pédagogique : absent. Les PDF présents concernent finance et bulletins; l’iframe de Révision affiche un PDF source déjà existant.

### B.9 Référentiels et contenus scolaires

Les ressources locales se limitent à cinq fichiers dans `data/exams` :

- `3eme-maths-calcul-litteral-path-v1.json` : parcours Mathématiques 3e, calcul littéral, 8 sessions + diagnostic + évaluation selon ses métadonnées;
- `6eme-maths-guided-sessions-v3.json` : sessions guidées Mathématiques 6e;
- `elima_bac_c_2026_correction_interactive.json`;
- `elima_bac_francais_2026_jour1_correction_interactive.json`;
- `elima_terminale_c_demo_bank.json`.

L’import vers `learning_levels`, `learning_subjects` et `learning_chapters` est assuré par `scripts/import-learning-content.ts`. Ce script normalise le pays et déduit `education_system`, mais ne stocke pas la source officielle, l’URL, l’autorité, la date d’effet, la version du programme ni la preuve de conformité.

**Fait observé :** certains fichiers déclarent « Programme ivoirien » ou « Côte d’Ivoire ».

**Limite :** aucun document officiel ivoirien, référentiel BEPC/BAC versionné ou catalogue complet compétences/objectifs n’a été identifié. Les `skills` sont des clés internes libres, pas un référentiel officiel vérifié.

**Conséquence :** le futur moteur ne doit pas présenter une génération comme « conforme au programme ivoirien » sur la seule base de ces fichiers. Un corpus officiel ou éditorialement validé doit être intégré et tracé avant cette promesse.

## C. Inventaire des fonctionnalités réutilisables

| Fonctionnalité | État actuel | Localisation | Réutilisation possible | Adaptations nécessaires |
|---|---|---|---|---|
| Identité commune scolaire/Révision | Existant | `packages/auth`, `packages/supabase-client`, `docs/architecture/unified-database.md` | Authentifier auteur et élève avec le même UUID | Faire de `school_memberships` l’autorité et gérer les auteurs multi-établissements |
| Contexte enseignant classe/matière | Existant | `TeacherContext.tsx`, `lib/teacher/server.ts` | Préremplir niveau, classe et matière | Unifier `class_teachers` et `teacher_subject_classes` |
| Catalogue niveaux/matières/chapitres | Partiel | `learning_levels`, `learning_subjects`, `learning_chapters` | Cibler et filtrer les générations | Ajouter versions, sources officielles, objectifs et liens avec les matières scolaires tenant |
| Ressource/exercice structuré | Existant | `learning_exercises`, `learning_exercise_parts`, `learning_questions` | Projection d’une version publiée dans Révision | Ne pas l’utiliser comme brouillon auteur; ajouter une couche auteur/version canonique |
| Secrets de correction séparés | Existant | `learning_question_secrets`, policies/revokes | Protéger réponses et barèmes | Lier les secrets à une version publiée immuable et auditer les accès serveur |
| Indices et correction étape par étape | Existant | `learning_question_hints`, `learning_solution_steps` | Réutilisation directe dans le lecteur | Étendre le nombre/type d’indices selon le format; versionner avec la ressource |
| QCM | Existant | `RevisionQuizPlayer.tsx`, parcours guidés | Exercices autocorrigés | Unifier ancien QCM et Learning; éviter deux modèles concurrents |
| Réponses numériques/rationnelles | Existant | `validateAnswer` dans `learning.mjs` | Correction déterministe fiable | Ajouter champs UI spécialisés, unités, intervalles et tests de tolérance |
| Réponses libres/démonstrations | Partiel | `LearningSolverPage.tsx`, `assessWithGpt` | Feedback formatif | Rubriques explicites, revue humaine et interdiction d’une note sommative purement LLM au MVP |
| Démarche en étapes | Existant | `StepEditor`, `ValidationResult.stepFeedback` | Mathématiques et sciences | Formaliser le contrat de chaque étape et les limites de longueur |
| Sessions, tentatives, scores | Existant | `learning_attempts`, `learning_answers`, `quiz_attempts`, `user_progress` | Suivi élève et historique | Choisir Learning comme cible canonique; rattacher à une affectation/version |
| Maîtrise par compétence | Partiel | `student_skill_state`, `recommendExercises` | Remédiation ultérieure | Référentiel stable de compétences, calcul transparent et validation pédagogique |
| Parcours diagnostic/session/évaluation | Existant | métadonnées `pathKind`, `learningRules.ts` | Construire des séquences progressives | Remplacer les conventions JSON libres par des contrats validés |
| Markdown/GFM/LaTeX | Existant | `packages/revision-ui/src/MarkdownContent.tsx` | Cours, énoncés, corrections, formules | Politique d’assets/liens, accessibilité et tests d’impression |
| Tableaux structurés | Existant | `StatementDisplay`, `StructuredSolution` | SVT, données expérimentales | Définir un bloc tableau canonique et éditable |
| Graphiques scientifiques | Partiel | barres CSS dans `StructuredSolution` | Petits diagrammes de valeurs | Ajouter un modèle de séries/axes; moteur SVG/Canvas à arbitrer |
| Schémas scientifiques | Absent | Aucun moteur identifié | — | Bloc image/schéma, légende, alt, source, annotation et validation des droits |
| Éditeur pédagogique | Absent | Formulaires `textarea` uniquement | — | Atelier par blocs avec formulaires typés; éviter HTML libre |
| Génération IA QCM | Existant | `revision-generate.mjs#generateQuiz` | Sous-service de génération de questions | Schéma strict, traçabilité, contrôles de barème/cohérence et relecture |
| Génération IA fiche | Partiel | `revision-generate.mjs#generateSheet` | Brouillon textuel initial | Produire des blocs structurés plutôt qu’un Markdown monolithique |
| Évaluation IA | Existant | `learning.mjs#assessWithGpt` | Feedback sur démarches complexes | Versionner rubric/prompt, mesurer coût/latence, tests de non-divulgation |
| Analyse de document | Existant | `revisionDocumentService.mjs` | Ingestion de sources enseignant | Permissions, rétention, provenance, correction du nom de variable et validation de corpus |
| RAG/base de connaissances | Absent | Aucun embedding/vector store trouvé | — | Ne l’ajouter qu’après constitution du référentiel; recherche filtrée par version/source |
| Quotas et abonnement IA | Existant | `revisionEntitlement.mjs`, migrations 202609/202610 | Limiter la génération et rembourser les échecs | Quotas spécifiques enseignant, budget établissement et journal tokens/coûts |
| Monitoring IA | Partiel | `learning_ai_evaluations`, logs d’erreur | Audit des évaluations | Journaliser aussi générations, validation, latence, tokens, coût et corrélation |
| Devoirs/classe | Existant | `homeworks`, `teacher/homework` | Destination d’une ressource publiée | Lier une affectation à une version, pas à une URL mutable |
| Cahier de textes | Existant | `lesson_logs`, `teacher/lessons` | Point de départ ou destination d’un support | Ajouter des liens typés vers la ressource publiée |
| Ressources enseignant | Partiel | Platform démo, Mobile upload | Point d’entrée fonctionnel | Créer un vrai domaine ressource partagé et supprimer le détournement de l’upload devoir |
| Messagerie | Existant | `conversations`, `messages` | Notifier une publication | Ne pas envoyer les corrigés; liens autorisés et révocables |
| PDF financier | Existant | `apps/platform/src/lib/finance/*pdf.ts` | Réutiliser quelques primitives branding | Inadapté seul au Markdown/KaTeX multipage; créer un pipeline pédagogique |
| PDF élève/enseignant | Absent | Aucun export pédagogique trouvé | — | Deux rendus depuis la même version, avec corrigés exclus/inclus côté serveur |
| Versionnement/publication | Absent | Statuts simples `draft/published/archived` sur Learning | — | Versions immuables, workflow, journal et mapping de publication |
| Contenu Maths 3e | Partiel | calcul littéral 3e, démo équations | Base de test proche du MVP | Produire/valider le chapitre équations du premier degré demandé |
| Contenu SVT Terminale D | Absent | Seulement sujet SVT générique/démo digestion | — | Référentiel, gabarits scientifiques et contenu validé à créer ultérieurement |

## D. Analyse des écarts

### D.1 Critiques

1. **Modèle auteur et versionnement absent.** Les tables Learning décrivent un catalogue exécutable, pas un document éditorial multi-tenant. Ajouter `school_id` directement partout créerait du couplage et rendrait les publications mutables. Il faut une ressource auteur et des versions immuables distinctes de la projection Learning.
2. **Référentiel fiable absent.** Aucune génération conforme au programme ivoirien ne peut être garantie sans sources officielles ou validation éditoriale tracée.
3. **Validation scientifique/pédagogique insuffisante.** Les sorties actuelles sont parsées, mais pas validées par schéma complet, invariants de barème, références d’assets, cohérence question/correction ni double contrôle humain.
4. **Sécurité de publication/corrigés à concevoir.** La séparation Learning existante est bonne, mais elle n’est pas reliée à des versions, des fenêtres de publication, des affectations ni des variantes élève/enseignant.
5. **Deux domaines de quiz concurrents.** `quiz_*` et `learning_*` se chevauchent. Le nouveau moteur doit publier vers Learning; étendre encore le modèle `quiz_*` aggraverait la divergence.
6. **Autorité d’affectation enseignant ambiguë.** `class_teachers` et `teacher_subject_classes` sont toutes deux actives selon les zones du code.

### D.2 Importants

1. **Édition structurée absente.** Le professeur ne peut ni réordonner des blocs, ni modifier une question/correction/barème de façon typée.
2. **PDF pédagogique absent.** La génération de deux versions nécessite un rendu reproductible côté serveur et des tests de pagination/LaTeX.
3. **Blocs scientifiques incomplets.** Images, sources, schémas, graphiques à axes, légendes et documents à analyser n’ont pas de contrat canonique.
4. **Observabilité IA partielle.** Pas de suivi token/coût/latence pour les générations, ni registre central de prompts.
5. **Pas de traitement asynchrone durable.** Les appels actuels sont synchrones avec un timeout 60 s; une ressource riche multi-section peut dépasser cette fenêtre et nécessite un job relançable/idempotent.
6. **Duplication Mobile/Révision.** Les vues complexes risquent de diverger si le nouveau renderer est copié dans deux apps.
7. **Lien matière scolaire/catalogue global absent.** `subjects` est tenant-scopé, `learning_subjects` est global et fondé sur des libellés; un mapping stable est nécessaire.
8. **Configuration documentaire incohérente.** Nom de clé Azure Document Intelligence différent entre code et documentation.

### D.3 Secondaires

1. Champs de réponse spécialisés et meilleure accessibilité des contenus scientifiques.
2. Bibliothèque de gabarits au-delà des deux matières MVP.
3. Collaboration entre enseignants, commentaires et bibliothèque inter-établissements.
4. Remédiation adaptative avancée; `student_skill_state` permet une phase ultérieure mais le modèle pédagogique doit d’abord être stabilisé.
5. Génération d’illustrations; elle ne doit pas précéder la provenance, les droits et la validation scientifique.

## E. Architecture cible recommandée

### E.1 Principes

- **Source canonique structurée** : une ressource est un document JSON composé de blocs typés, jamais un HTML arbitraire.
- **Séparation auteur/exécution** : le brouillon enseignant reste dans le domaine auteur; une version publiée est projetée vers Learning.
- **Immutabilité des publications** : toute modification après publication crée une nouvelle version; les tentatives restent liées à l’ancienne.
- **Secrets séparés** : corrigés, réponses attendues et rubriques privées restent hors du payload élève.
- **Validation en couches** : schéma → invariants métier → contrôles déterministes → revue éditoriale → validation enseignant.
- **Réutilisation** : Azure, quotas, auth, contexte enseignant, Markdown/KaTeX, Learning et ses lecteurs restent les fondations.

### E.2 Format canonique proposé

Un `PedagogicalResourceDocument` versionné devrait contenir : métadonnées (titre, langue, pays, système, niveau, série, matière, chapitre, objectifs, compétences, durée), audience, barème, et une liste ordonnée de blocs.

Blocs MVP recommandés :

- `heading`, `rich_text`, `callout`, `formula`;
- `image` avec alt, légende, source et droits;
- `table`;
- `question` avec sous-types `single_choice`, `multiple_choice`, `numeric`, `short_text`, `long_text`, `guided_steps`;
- `correction`/rubrique privée référencée par identifiant de question;
- `score_summary`.

Pour la SVT : ajouter ensuite `chart`, `diagram`, `document_analysis` et `experiment`. Chaque bloc doit être validé, rendu web/mobile et transformable en PDF. Les chaînes riches peuvent rester en Markdown sécurisé pour réutiliser `MarkdownContent`; la structure et les relations ne doivent pas être encodées dans ce Markdown.

### E.3 Services

```text
Atelier enseignant (Platform)
  → API Assistant (apps/api)
    → job de génération + Azure OpenAI
    → validateur de schéma/invariants
    → contrôles disciplinaires
  → brouillon versionné
  → revue/édition/validation enseignant
  → publication atomique
    ├→ projection Learning pour Révision
    ├→ affectation classe/élèves
    └→ rendu PDF élève / enseignant
```

Services recommandés :

- `resource-authoring-service` : CRUD tenant-scopé des ressources et versions.
- `pedagogical-generation-service` : orchestration par étapes, prompts versionnés et reprise sur erreur.
- `resource-validation-service` : schéma, barème, cohérence des références, absence de correction dans le contenu public, règles par discipline.
- `resource-publication-service` : transaction de publication et projection vers `learning_*`.
- `pedagogical-pdf-service` : deux rendus depuis la même version.
- `ai-observability-service` : requête, modèle/déploiement, prompt, latence, tokens, coût estimé, statut, sans contenu sensible excessif.

Ces services doivent vivre côté serveur, préférentiellement dans `apps/api/server`, avec leurs contrats purs extraits dans un package partagé. Les routes Next de Platform peuvent servir de BFF/session, mais la logique IA ne doit pas être dupliquée dans `apps/platform`.

### E.4 Modèles à créer ou étendre lors du développement

Noms indicatifs, à finaliser avant migration :

- `pedagogical_resources` : `school_id`, `created_by`, type, visibilité, état courant, métadonnées de recherche.
- `pedagogical_resource_versions` : numéro/version, document public structuré, secrets/corrigés séparés ou références, auteur, date, checksum, statut de validation.
- `pedagogical_resource_reviews` : contrôles automatiques, revue humaine, décisions et commentaires.
- `pedagogical_resource_publications` : version publiée, canal Révision/PDF, mapping vers `learning_exercise`/`exam_subject`, dates de disponibilité.
- `pedagogical_assignments` : publication/version, classe ou élève, dates, mode, règles d’accès aux corrigés.
- `pedagogical_generation_jobs` et `pedagogical_ai_events` : état idempotent, prompt/model, mesures d’usage et erreurs.
- `curriculum_sources`, `curriculum_versions`, `curriculum_nodes`, `curriculum_competencies` : sources et référentiels versionnés.
- table de mapping entre `subjects`/niveau scolaire tenant et catalogue pédagogique global.

À étendre : `learning_attempts` doit référencer la publication/version ou l’affectation. Les tables `learning_exercises` peuvent recevoir un identifiant de projection/version, sans devenir le stockage du brouillon. `homeworks` et `lesson_logs` devraient recevoir un lien typé optionnel vers une publication au lieu d’une simple URL.

### E.5 Autorisations recommandées

- Toute ressource auteur porte un `school_id` et `created_by`; les droits passent par `school_memberships` et l’affectation enseignant.
- Visibilités minimales : `private`, `school`, `assigned`, `published_revision`; le partage inter-écoles est hors MVP.
- Le document public et les secrets privés sont stockés séparément. Les clients élèves n’obtiennent jamais les secrets par requête directe.
- Une affectation contient `solution_release_policy` : après validation, après N tentatives, après échéance ou jamais.
- La publication est serveur seulement et atomique. Un élève ne lit qu’une version publiée et autorisée.
- Une nouvelle version ne modifie pas les tentatives existantes.
- Les PDF enseignants ne doivent être générés/téléchargés que par un rôle autorisé; les PDF élèves ne contiennent ni réponse attendue ni métadonnée privée.

### E.6 Interfaces

Dans Platform :

1. entrée « Assistant pédagogique » à l’intérieur de **Ressources**;
2. écran de cadrage : niveau/série, matière, chapitre, objectifs, type de support, durée, difficulté, pièces sources;
3. génération asynchrone avec état et reprise;
4. atelier de blocs : navigation, édition, réordonnancement, barème, aperçu élève/enseignant;
5. panneau de contrôles : schéma, total de points, réponses manquantes, conformité référentiel, alertes scientifiques;
6. validation explicite enseignant;
7. publication : classe/élèves, dates, correction, PDF et Révision.

Dans Révision/Mobile :

- un renderer partagé dans `packages/revision-ui`;
- réutilisation de `LearningSolverPage` pour l’exécution;
- nouveaux blocs scientifiques accessibles;
- historique et résultats liés à l’affectation/version;
- aucune capacité d’édition auteur dans le client élève.

### E.7 Comparaison des options

| Sujet | Options | Recommandation |
|---|---|---|
| Stockage contenu | HTML; Markdown monolithique; JSON par blocs | JSON par blocs + Markdown dans les champs riches. HTML est difficile à valider/versionner; Markdown seul ne porte pas les relations pédagogiques. |
| Persistance | Tables entièrement normalisées; document JSONB; hybride | Hybride : colonnes relationnelles pour ownership/workflow/indexation, document versionné JSONB validé pour les blocs, projections normalisées Learning pour l’exécution. |
| Éditeur | WYSIWYG riche générique; éditeur de blocs spécialisé | Éditeur de blocs spécialisé au MVP. Un WYSIWYG complet ajoute des dépendances et rend les secrets/barèmes moins sûrs. |
| Publication | Utiliser directement `learning_*`; couche auteur séparée | Couche auteur séparée puis projection. Learning est optimisé pour l’élève, pas pour le brouillon. |
| PDF | `pdf-lib`; impression navigateur; rendu HTML serveur/headless | Pour le prototype, impression contrôlée; pour la production, rendu HTML/KaTeX côté serveur. `pdf-lib` seul demanderait de reconstruire mise en page, Unicode et formules. Évaluer l’impact d’une dépendance headless avant choix final. |
| Graphiques | images; SVG déclaratif; bibliothèque charts | Modèle de données déclaratif rendu en SVG partagé. Les images seules ne sont ni adaptatives ni éditables. |
| Validation maths | LLM seul; moteur symbolique; déterministe + LLM | Conserver déterministe d’abord, tests de cas et LLM seulement pour démarche/équivalence non couverte. Un moteur symbolique pourra être évalué après le MVP. |
| Génération | appel unique; pipeline multi-étapes | Pipeline multi-étapes : plan → contenu → exercices/corrections → validation → réparation ciblée. Plus traçable et relançable. |
| Référentiel | prompt statique; RAG immédiat; catalogue versionné puis recherche | Catalogue officiel/versionné d’abord; recherche filtrée ensuite. Ne pas construire un RAG sur des sources non qualifiées. |

## F. Plan de développement progressif

> Ce plan est une recommandation d’exécution future. Aucune phase n’a été commencée dans cet audit.

### Phase 0 — Décisions et référentiels

- **Objectifs :** trancher le modèle de publication, l’autorité d’affectation enseignant, les sources officielles et les règles de validation des deux matières.
- **Périmètre :** contrats, ADR, corpus, jeux de tests pédagogiques; aucune UI finale.
- **Modules concernés :** `docs/architecture`, `data/` ou un futur espace de référentiels, `supabase/migrations` ultérieurement.
- **Dépendances :** accès légal aux programmes ivoiriens et experts Mathématiques 3e/SVT Terminale D.
- **Risques :** automatiser sur un corpus non officiel; confusion 3e/3ème ou Terminale D/C.
- **Validation :** sources datées et approuvées; mapping niveau/matière/chapitre; exemples de sortie et rubriques signés par les experts.

### Phase 1 — Contrat structuré et stockage auteur

- **Objectifs :** définir les blocs, versions, ownership, visibilité et workflow.
- **Périmètre :** contrats TypeScript/JSON Schema, validateurs purs, futures migrations auteur, policies RLS et tests.
- **Modules concernés :** nouveau package de contrats, `apps/api/server`, `supabase/migrations`, tests Learning/API.
- **Dépendances :** décisions Phase 0.
- **Risques :** modèle trop générique ou trop lié aux deux démonstrateurs.
- **Validation :** les deux supports de référence sont représentables sans HTML libre; toute ressource invalide est rejetée; test de fuite des corrigés négatif.

### Phase 2 — Génération et validation MVP

- **Objectifs :** générer des brouillons structurés pour équations du premier degré en 3e et tissu nerveux en Terminale D.
- **Périmètre :** jobs, prompts versionnés, sorties strictes, validation barème/contenu, quotas enseignant, observabilité.
- **Modules concernés :** `apps/api/server/azureOpenAi.mjs`, nouveaux services/handlers, `revisionEntitlement.mjs`, tables d’événements IA.
- **Dépendances :** contrat Phase 1, référentiels validés.
- **Risques :** hallucinations, latence, dépassement de contexte/coût, incohérence énoncé-correction.
- **Validation :** corpus de tests fixe; 100 % des sorties conformes au schéma après éventuelle réparation; total exact sur 20 pour les évaluations; revue experte sans erreur critique; mesure de coût/latence.

### Phase 3 — Atelier enseignant Platform

- **Objectifs :** cadrer, générer, éditer, prévisualiser, valider et versionner.
- **Périmètre :** intégration dans Ressources, éditeur de blocs MVP, aperçu élève/enseignant et workflow.
- **Modules concernés :** `apps/platform/src/app/teacher/resources`, nouveaux composants Platform, `TeacherContext`, routes BFF éventuelles.
- **Dépendances :** API et modèle auteur.
- **Risques :** éditeur trop complexe, perte de brouillon, navigation enseignant surchargée.
- **Validation :** un enseignant affecté peut créer/éditer; un autre établissement ne peut ni voir ni modifier; reprise après rafraîchissement; validation explicite obligatoire.

### Phase 4 — Publication Révision et affectations

- **Objectifs :** publier une version figée vers Learning, l’affecter et enregistrer les résultats.
- **Périmètre :** projection, renderer partagé, politiques de correction, tentatives liées à la version.
- **Modules concernés :** `packages/revision-core`, `packages/revision-ui`, `apps/api/server/handlers/learning.mjs`, apps Mobile/Révision, migrations Learning.
- **Dépendances :** phases 1 à 3.
- **Risques :** rupture des contenus existants, divergence Mobile/Révision, divulgation de correction.
- **Validation :** anciens quiz/parcours inchangés; même rendu fonctionnel web/mobile; tentative toujours rattachée à sa version; tests RLS et publication atomique.

### Phase 5 — PDF élève/enseignant

- **Objectifs :** produire deux documents imprimables à partir de la même version.
- **Périmètre :** pagination A4, branding, KaTeX, tableaux/images, en-têtes, corrigés/barèmes.
- **Modules concernés :** service PDF serveur, stockage documents privé, UI de téléchargement.
- **Dépendances :** renderer stable et stratégie technique PDF arbitrée.
- **Risques :** formules coupées, polices, grands tableaux, coût mémoire, fuite de corrigé.
- **Validation :** tests visuels sur les deux supports MVP; aucune réponse dans la version élève; PDF enseignant complet; impression A4 stable.

### Phase 6 — Élargissement scientifique et remédiation

- **Objectifs :** graphiques/schémas avancés, autres disciplines, recommandations fondées sur résultats.
- **Périmètre :** blocs scientifiques, référentiels supplémentaires, exploitation prudente de `student_skill_state`.
- **Modules concernés :** contrats/blocs, renderer, Learning Rules, analytics.
- **Dépendances :** données de qualité issues du MVP.
- **Risques :** recommandations opaques, biais, explosion du nombre de formats.
- **Validation :** règles explicables, tests par discipline, possibilité pour l’enseignant de corriger/désactiver une recommandation.

## G. Risques techniques et recommandations

### Qualité scientifique et pédagogique

Risque majeur : une sortie syntaxiquement valide peut être fausse ou hors programme. Exiger provenance du référentiel, contrôles déterministes, revue experte des gabarits et validation finale enseignant. Les avertissements automatiques ne doivent pas être masqués par une réparation LLM silencieuse.

### Fiabilité des corrections mathématiques

Le comparateur actuel normalise surtout des chaînes et des nombres; il ne prouve pas l’équivalence symbolique. Conserver `validateAnswer` pour les formats fermés, enrichir les tests (fractions, virgule décimale, unités, intervalles, formes équivalentes) et ne jamais confier seul au LLM l’attribution d’une note sommative. La priorité déterministe de `shouldUseGpt` est une bonne base.

### SVT et supports scientifiques

Les schémas et expériences exigent sources, légendes, unités et relations explicites. Les images générées ne doivent pas être utilisées comme vérité scientifique sans revue. Préférer au MVP des illustrations validées et des diagrammes structurés plutôt qu’une génération d’image libre.

### Sécurité multi-tenant

Les APIs enseignant Platform utilisent un client admin : chaque route doit conserver une vérification explicite de rôle, établissement et affectation. Les futures policies doivent se fonder sur `school_memberships`; le double modèle `class_teachers`/`teacher_subject_classes` doit être résolu. Tester systématiquement les accès croisés école A/école B.

### Confidentialité des corrigés

Réutiliser le principe de tables privées et routes serveur. Interdire les corrigés dans le document public, les métadonnées, les logs client, les PDF élève et les réponses de prévisualisation élève. Appliquer des tests automatiques de non-divulgation avant publication.

### Compatibilité web/mobile

React 18/Vite côté Mobile/Révision et React 19/Next côté Platform imposent de garder les packages UI sans dépendance au runtime Next. Tester petits écrans, tactile, clavier, KaTeX débordant, tableaux horizontaux et mode Android Capacitor. Centraliser le renderer pour éviter la duplication déjà constatée.

### Performance et disponibilité

Une génération riche doit devenir un job asynchrone idempotent, avec statut consultable, reprise ciblée et annulation. Ne pas conserver une requête HTTP unique de 60 secondes pour tout le support. Mettre en cache par checksum de paramètres/référentiel/prompt seulement si l’isolation tenant et les droits le permettent.

### Coût IA

Étendre les quotas actuels aux enseignants/établissements. Journaliser tokens entrée/sortie, modèle, latence, coût estimé, nombre de réparations et cache hit. Fixer des plafonds par type de ressource; éviter de régénérer tout le document lorsqu’un seul bloc change.

### Évolutivité des données

Versionner le schéma du document et prévoir des migrations applicatives de JSON. Les identifiants de blocs/questions doivent rester stables dans une version dérivée. Les tentatives référencent une publication immuable. Ne pas multiplier des colonnes spécialisées par discipline dans `learning_questions`; utiliser des contrats de blocs versionnés et des projections contrôlées.

### Conservation de l’existant

Ajouter le nouveau flux derrière une feature flag établissement et publier vers les tables Learning sans changer les anciens `quiz_*` au départ. Construire des tests de non-régression pour QCM, parcours guidés, fiches, scans, quotas et applications Mobile/Révision avant le premier déploiement.

### Sécurité documentaire

Le bucket `exam-sources` est privé, mais l’upload de devoir actuel utilise `getPublicUrl` sur `documents`. Auditer la visibilité réelle du bucket avant d’y placer des supports ou corrigés. Appliquer antivirus/type réel, limites, noms non prédictibles, rétention et suppression. Harmoniser `AZURE_DOCUMENT_INTELLIGENCE_KEY` avec la documentation.

## H. Questions à trancher

| Décision | Option recommandée | Justification |
|---|---|---|
| Où placer l’Assistant dans la navigation ? | Dans **Ressources** au MVP, avec raccourcis depuis Cahier de textes/Devoirs | Respecte le vocabulaire existant et évite un menu enseignant supplémentaire avant validation de l’usage. |
| Quel modèle est canonique ? | Nouveau domaine auteur/version; `learning_*` comme projection d’exécution | Évite d’exposer les brouillons et préserve les tentatives sur versions immuables. |
| Quel format de contenu ? | JSON de blocs versionné, Markdown sécurisé dans les champs riches | Éditable, validable, portable web/mobile/PDF et indépendant du HTML. |
| Quelle autorité pour les affectations enseignant ? | `school_memberships` pour le tenant et une seule relation canonique enseignant-classe-matière | Le dépôt utilise actuellement deux tables concurrentes; la sécurité dépend de ce choix. |
| Peut-on déclarer la conformité au programme ivoirien ? | Seulement après intégration d’un référentiel officiel/versionné et validation éditoriale | Les fichiers locaux auto-déclarés ne suffisent pas à établir cette conformité. |
| Quel degré d’autocorrection au MVP ? | Déterministe pour fermé/numérique; IA formative pour libre; validation humaine pour note sommative complexe | Réduit le risque de notation incorrecte tout en réutilisant l’existant. |
| Quand révéler les corrigés ? | Politique explicite par affectation, par défaut après remise ou échéance | Évite la divulgation prématurée et s’aligne sur la séparation des secrets existante. |
| Comment produire les PDF ? | Prototype par rendu imprimable, cible serveur HTML/KaTeX après benchmark | Maximise la fidélité au renderer existant; le choix headless doit être validé pour le déploiement et le coût. |
| Quelle portée du partage ? | Privé enseignant et établissement/affectation au MVP; pas de bibliothèque inter-écoles | Limite les risques de droits, qualité et propriété intellectuelle. |
| Faut-il un RAG dès le MVP ? | Non; catalogue versionné et recherche filtrée d’abord | Un RAG sans corpus officiel qualifié amplifierait les erreurs et la complexité. |
| Comment traiter l’ancien domaine `quiz_*` ? | Le maintenir pour compatibilité, mais publier tout nouveau support riche dans Learning | Évite une migration risquée immédiate et empêche une troisième représentation. |
| Quelle priorité disciplinaire ? | Deux gabarits bornés : Maths 3e équations et SVT Terminale D tissu nerveux | Correspond au résultat attendu et permet de valider à la fois formules/correction et documents/schémas scientifiques. |

## Limites de vérification

- L’état réel des bases Supabase distantes, des buckets, des policies effectivement déployées et des contenus importés n’a pas été interrogé. Les conclusions data reposent sur les schémas/migrations/scripts versionnés.
- Les déploiements Azure, modèles exacts, quotas de compte et coûts réels n’ont pas été vérifiés; le code ne révèle que le nom de variable du déploiement.
- Aucun programme officiel externe n’a été recherché ou ajouté; la présence locale seulement a été auditée.
- Le worktree étant en cours de réorganisation, `apps/site` et la documentation associée peuvent ne pas encore représenter un commit stabilisé.
- Aucun script de vérification connecté (`verify-learning-content.ts`, imports, seeds) n’a été exécuté afin de respecter l’audit sans modification de données.

---

**Arrêt de l’audit :** ce document propose une cible et un plan, mais n’implémente aucune fonctionnalité, migration, configuration, dépendance, refactorisation ou changement d’interface.
