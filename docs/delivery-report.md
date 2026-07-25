# Rapport de livraison de l'architecture unifiée

| Élément | Origine | Décision | Emplacement final | Fichiers adaptés | Migration | Tests | Statut |
|---|---|---|---|---|---|---|---|
| Mobile | racine | conserver léger | `/src`, `/api` | env, scripts | commune | build, 12 tests | prêt |
| Web | dépôt elima.tech | activer avec historique | `/web` | configs, env, chemins | commune | build, 52 tests | prêt |
| elima.app | référence | isoler | `/_references/elima.app` | aucun | aucune | empreinte identique | intact |
| Identité | deux projets historiques | Auth commun par environnement | Supabase | clients centralisés | tenant foundation | schéma vérifié | Demo migrée |
| Élève | scolaire + pédagogie | `students` unique | public | services distincts | tenant foundation | relations vérifiées par script | prêt |
| Membership | `users.school_id` | ajouter sans casser | `school_memberships` | domaine partagé | `20260725120000` | backfill vérifié | appliqué Demo |
| Inscriptions | `students.class_id` | ajouter l'historique annuel | `enrollments` | aucun fetch cassé | `20260725120000` | backfill vérifié | appliqué Demo |
| Onboarding | web | reprendre | public | signup corrigé | `20260725120000` | build/typecheck | appliqué Demo |
| Documents | web/Storage | privé par tenant | table + 2 buckets | web | `20260725120000` | politiques inspectées | appliqué Demo |
| Pédagogie | mobile | conserver séparé du scolaire | `quiz_*`, `learning_*` | services mobiles | migrations existantes | catalogue vérifié | prêt |
| Seed Demo | deux écoles historiques | remplacer par une école | scripts + SQL | seed/reset/verify | aucune destructive | dry-run réussi | reset réel en attente du secret |
| Production | nouvelle | migrations seules | projet à créer | script protégé | bundle | non exécuté | action manuelle |
| Vercel | séparé | quatre projets | racine et `/web` | 2 `vercel.json` | n/a | builds locaux | configuration manuelle |

## Changements visibles

Aucun libellé de navigation ou vocabulaire métier n'a été renommé. Les seules
normalisations visibles potentielles sont le nom de l'établissement Demo
(`Collège Moderne Abidjan`) et la ponctuation ASCII des PDF, conformément aux
tests historiques.

## Actions manuelles restantes

- définir `SEED_AUTH_PASSWORD` hors Git et exécuter le reset Demo ;
- exporter Auth mobile et produire les deux `pg_dump` officiels ;
- configurer Auth URLs, secrets, webhooks et services externes Demo ;
- créer Supabase Production et ses secrets ;
- créer/configurer les quatre projets Vercel et domaines ;
- tester les parcours web/mobile authentifiés après reset.

