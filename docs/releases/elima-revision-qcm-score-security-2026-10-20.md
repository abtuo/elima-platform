# Elima Révision — Rapport de sécurisation des scores QCM

Date : 20 octobre 2026  
Périmètre : Elima Révision uniquement  
Projet Supabase : `rydnrvvmwixrkmnvpajf`

## Résultat

La chaîne historique qui permettait au client de déclarer un score, des XP et des statistiques a été remplacée par des tentatives identifiées et évaluées côté serveur.

Le client transmet désormais uniquement les réponses choisies. Le serveur conserve un instantané immuable des questions, recalcule le score, le nombre de bonnes réponses et les XP, puis enregistre une tentative marquée `server_verified`. Une remise répétée renvoie le premier résultat et ne crédite pas de nouveaux XP.

La migration de sécurité a été appliquée sur le projet Révision. Elima Identity n'a pas été modifié. Aucun test d'écriture artificiel n'a été exécuté en production.

## Architecture mise en place

1. Le serveur crée une session de tentative appartenant à l'utilisateur authentifié.
2. Il y attache un instantané privé et immuable des questions, options, bonnes réponses et explications.
3. Le client ne reçoit que les données nécessaires pour répondre, sans corrigé.
4. À la remise, le client envoie `attemptId` et les couples `questionId` / `answerId`.
5. La fonction Supabase verrouille la tentative, vérifie son propriétaire et les identifiants de réponses, puis calcule le résultat.
6. La tentative vérifiée et les agrégats vérifiés sont enregistrés une seule fois.
7. Le corrigé n'est retourné qu'après une remise autorisée.

## Migration Supabase

Migration appliquée :

- `20261020180000_revision_verified_quiz_attempts.sql`
- empreinte SHA-256 : `9e5e3174c129f51a6f86272cc64f15df74f3963ba13d135573c1b6dab738f1f1`
- dépendance : migration d'onboarding primaire déjà appliquée
- divergence locale/distante : aucune après application

Éléments ajoutés ou durcis :

- table privée `quiz_attempt_sessions` contenant les instantanés et l'état des remises ;
- colonnes `score_trust` et `server_attempt_id` sur `quiz_attempts` ;
- agrégats séparés `verified_*` sur `user_progress` ;
- RPC `submit_revision_quiz_attempt` réservée au rôle serveur ;
- retrait de l'exécution cliente de l'ancienne RPC `record_quiz_attempt` ;
- retrait de la lecture directe des questions et corrigés pour `anon` et `authenticated` ;
- politiques RLS explicites et privilèges limités au rôle serveur.

La première tentative d'application a été arrêtée automatiquement avant toute modification : l'analyseur avait classé la formulation initiale de deux opérations comme critique. La migration a été reformulée en politique additive et restrictive, puis réanalysée avant son application.

## Sauvegarde et conservation des données

Une sauvegarde logique ciblée a été créée et contrôlée avant l'application :

`C:\Users\tuoab\.codex\backups\elima-revision-20261020-quiz-security`

Elle contient les tentatives QCM, la progression concernée, les politiques, les privilèges et la définition de la fonction historique. Son empreinte a été vérifiée après écriture.

Contrôles de conservation :

- 40 tentatives avant migration ;
- 40 tentatives après migration ;
- les 40 tentatives historiques sont conservées et marquées `legacy_client_reported` ;
- 6 lignes de progression existantes conservées ;
- aucun score ou XP historique supprimé ou réécrit ;
- les nouveaux agrégats vérifiés sont séparés des données historiques ;
- aucune session artificielle créée en production.

## Vérifications de sécurité

Les contrôles automatisés confirment que :

- un score fourni ou forgé par le client n'entre pas dans le calcul serveur ;
- une tentative appartenant à un autre utilisateur est refusée ;
- une seconde remise retourne le même résultat sans doubler les XP ;
- une option inexistante ou ne faisant pas partie de la question est refusée ;
- le corrigé et les explications ne figurent pas dans la charge utile avant remise ;
- `authenticated` ne peut lire ni les sessions privées, ni les questions, ni les réponses ;
- `authenticated` ne peut exécuter ni la nouvelle RPC ni l'ancienne RPC de score ;
- `service_role` est le seul rôle applicatif autorisé à exécuter la remise ;
- le `search_path` de la fonction de sécurité est fixé explicitement ;
- les tentatives historiques restent consultables et distinguables des résultats vérifiés.

Le mode démonstration conserve son calcul local et son retour immédiat. En mode connecté, la correction est différée jusqu'à la remise serveur.

## Fichiers concernés

Base et automatisation :

- `supabase/migrations/20261020180000_revision_verified_quiz_attempts.sql`
- `database/revision/migrations/manifest.json`
- `database/scripts/supabase-migrate.mjs`
- `database/scripts/backup-revision-quiz-security.mjs`

API :

- `apps/api/server/revisionQuizAttempts.mjs`
- `apps/api/server/handlers/revision-quiz-attempt.mjs`
- `apps/api/server/handlers/revision-generate.mjs`
- `apps/api/server/routes.mjs`
- `apps/api/server/validate.mjs`

Application et packages Révision :

- `apps/revision/src/features/revision/QuizPage.tsx`
- `apps/revision/src/features/home/StudentHomePage.tsx`
- `apps/revision/src/RevisionDashboardPage.tsx`
- `apps/revision/src/RevisionStudentProfilePage.tsx`
- `apps/revision/src/services/revisionDataService.ts`
- `packages/revision-core/src/revisionApi.ts`
- `packages/revision-core/src/revisionDataService.ts`
- `packages/revision-core/src/types.ts`
- `packages/revision-ui/src/RevisionDocumentScanner.tsx`

Tests :

- `tests/api/revision-verified-quiz.test.ts`
- `tests/api/database-separation.test.ts`
- `tests/api/workspace.test.ts`

## Résultats de validation

| Contrôle | Résultat |
| --- | --- |
| Tests Révision | 71/71 réussis |
| Tests packages | 44/44 réussis |
| Tests API | 139/139 réussis |
| Tests de sécurité QCM ciblés | 3/3 réussis |
| Typecheck Révision | réussi |
| Typecheck packages | réussi |
| Typecheck API | réussi |
| Lint Révision | 0 erreur, 7 avertissements préexistants |
| Lint API | 0 erreur, 2 avertissements préexistants |
| Build Web Révision | réussi |
| Build natif Révision | réussi |
| Vérification des espaces Git | aucune erreur |
| Statut final des migrations Révision | à jour, aucune divergence |

Les builds signalent uniquement l'avertissement existant sur la taille du principal chunk JavaScript, sans échec.

Rapports d'automatisation :

- application : `database/reports/2026-10-20T16-20-06-400Z-revision-apply.json` ;
- contrôle final : `database/reports/2026-10-20T16-22-05-856Z-revision-status.json`.

## État de déploiement et blocage opérationnel

La protection de la base est active, mais le nouveau code API et client est encore local : il n'a pas été publié dans cette mission.

Comme la lecture directe des questions et l'ancienne RPC ont été fermées, l'ancienne version déployée de l'application ne peut plus utiliser ce chemin historique. C'est un comportement de sécurité volontaire, mais cela impose de déployer rapidement le nouvel endpoint API et le nouveau client avant toute reprise de diffusion Android.

État de release recommandé : **NO-GO Android tant que le backend et le client correspondants ne sont pas déployés et vérifiés ensemble**.

## Suite recommandée

1. Relire les changements et isoler un commit Révision sans inclure les modifications Elima Store déjà présentes dans l'arbre de travail.
2. Déployer l'API contenant `/api/revision-quiz-attempt` et la version mise à jour de `/api/revision-generate`.
3. Déployer le client Web Révision compatible.
4. Réaliser un parcours authentifié contrôlé : démarrage, absence de corrigé, remise, résultat, répétition idempotente et affichage de l'historique legacy.
5. Vérifier les journaux API et Supabase, sans écrire de score directement dans la base.
6. Seulement après cette validation, reprendre la préparation de la release Android et générer l'AAB dans une mission distincte.

Aucun AAB n'a été généré et aucune publication Google Play n'a été effectuée.
