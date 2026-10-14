# Runbook - déploiement pilote de l'Assistant pédagogique

Ce document est une procédure; il n'autorise aucune opération distante.

## 1. Préconditions

1. Autorisation écrite précisant projet Supabase, environnement, fenêtre et responsable.
2. Comptes de test sans données personnelles réelles.
3. Version applicative immuable identifiée par commit/tag.
4. `npm test`, `npm run typecheck`, `npm run lint` et `npm run build` réussis.
5. Audit npm revu; aucun avis critique, avis élevés acceptés ou corrigés.
6. Azure : endpoint, déploiement, version API, tarifs et plafond de coût validés.
7. Activation serveur par allowlist prête; plan `ai_import` activé uniquement pour le périmètre.

## 2. Variables serveur

Ne jamais exposer ces valeurs sous un préfixe `VITE_` :

- `SUPABASE_URL` et `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`;
- `REVISION_SUPABASE_URL` et `REVISION_SUPABASE_SECRET_KEY` lorsque le bridge séparé est utilisé;
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_API_KEY`;
- `AZURE_OPENAI_INPUT_COST_PER_MILLION`, `AZURE_OPENAI_OUTPUT_COST_PER_MILLION`;
- pour la recette live seulement : `ELIMA_ALLOW_PAID_AZURE_TESTS`, `PEDAGOGICAL_AZURE_LIVE_MAX_COST`.

Vérifier présence et portée sans afficher les valeurs. Faire tourner les secrets après toute suspicion d'exposition.

## 3. Sauvegarde et contrôle de cible

Statut actuel : **Bloqué.** Non exécuté faute d'accès distant.

1. Vérifier l'identifiant exact du projet et l'environnement depuis deux sources indépendantes.
2. Interdire explicitement la production pendant la répétition.
3. Créer un backup natif Supabase/PostgreSQL et relever son identifiant, heure, taille et rétention.
4. Réaliser en plus un export de schéma et un export des tables concernées.
5. Tester la restauration vers une base isolée; une sauvegarde non restaurée ne constitue pas une preuve.
6. Capturer les comptages des tables `learning_*`, quiz, tentatives et identités avant migration.

## 4. Ordre des migrations

Après le socle écoles/utilisateurs/memberships/classes/élèves/enseignants et les fonctions `current_user_school_id()` / `current_user_role()` :

1. `20261010120000_pedagogical_authoring_backend.sql`;
2. `20261010130000_pedagogical_generation_jobs.sql`;
3. `20261010140000_pedagogical_revision_delivery.sql`.

Ne pas réordonner. La Phase 3 dépend des ressources/versions de Phase 2. La Phase 5 dépend des publications/affectations de Phase 2 et ajoute la RPC de publication configurée.

## 5. Répétition préproduction

1. Appliquer les migrations dans une transaction contrôlée lorsque l'outil le permet.
2. Vérifier tables, colonnes, contraintes, index, fonctions, grants et policies.
3. Confirmer que `authenticated` ne lit pas `pedagogical_resource_version_secrets`.
4. Confirmer que seules les fonctions prévues sont exécutables par `service_role`.
5. Rejouer les migrations sur un clone pour détecter les limites d'idempotence. Les `CREATE POLICY` de Phase 2/3 ne sont pas idempotents sur une réapplication brute : utiliser l'historique Supabase, ne pas rejouer manuellement un fichier déjà enregistré.
6. Comparer les comptages historiques; aucune table `learning_*` ne doit être modifiée.
7. Exécuter le parcours synthétique enseignant vers élève, retrait compris.

## 6. Azure réel plafonné

1. Définir un plafond financier approuvé et les tarifs par million de tokens.
2. Activer temporairement `ELIMA_ALLOW_PAID_AZURE_TESTS=true` dans une session contrôlée.
3. Exécuter `npm run test:pedagogy:azure-live --workspace=@elima/api`.
4. Archiver uniquement les métriques, jamais les secrets ni les contenus privés.
5. Repasser le drapeau à `false` immédiatement.
6. Étendre au pipeline complet seulement si les deux plans sont valides et le coût reste sous seuil.

## 7. Déploiement applicatif progressif

1. Déployer l'API avec feature flag serveur désactivé.
2. Déployer Platform, Révision Web et Mobile sans activer de tenant.
3. Smoke tests : auth, ressources historiques, quiz, Learning, Scanner, création/liste pédagogique refusée hors allowlist.
4. Étape A : allowlist comptes internes synthétiques.
5. Étape B : allowlist enseignants désignés après validation pédagogique.
6. Étape C : allowlist classes consenties, quotas réduits.
7. Étape D : extension par lots, jamais globale en une fois.

Le `DashboardPlanGate feature="ai_import"` réutilise le plan existant côté Platform. Il doit être doublé d'un contrôle API avant l'étape B.

## 8. Vérifications post-migration et fumée

- **Non exécuté.** Auth enseignant et membership active.
- **Non exécuté.** Génération Azure d'un support synthétique.
- **Non exécuté.** Brouillon, édition, validation par second enseignant.
- **Non exécuté.** Publication/affectation atomique et lecture élève.
- **Non exécuté.** Tentative, réponse, remise, suivi.
- **Non exécuté.** PDF élève sans corrigé et PDF enseignant autorisé.
- **Non exécuté.** Retrait puis refus d'accès.
- **Non exécuté.** Isolation inter-tenant avec deux écoles de test.
- **Non exécuté.** Quiz et Learning historiques inchangés.

Chaque ligne doit devenir **Réussi.** avant ouverture de l'étape concernée.

## 9. Surveillance

Surveiller sur 15 min, 1 h, 24 h puis quotidiennement : erreurs 5xx/429, p95, jobs bloqués, échecs par étape, tokens/coût, validations échouées, publications/retraits, affectations refusées, corrections en attente, exports PDF, mémoire et durée serverless.

Seuils d'arrêt proposés : fuite de corrigé ou accès inter-tenant > 0; erreur 5xx > 2 % sur 15 min; échec IA > 10 % sur 30 min; coût journalier > 80 % du plafond; job bloqué > 10 min; PDF p95 > 10 s.

## 10. Désactivation rapide

1. Retirer les établissements/utilisateurs de l'allowlist serveur.
2. Désactiver `ai_import`/accès atelier pour le périmètre.
3. Bloquer les nouvelles générations; laisser les données et tentatives en place.
4. Retirer les publications actives concernées si nécessaire.
5. Préserver journaux, événements et preuves; ne supprimer aucune table.
6. Informer les responsables pilote et ouvrir un incident.

## 11. Retour arrière données

Privilégier la désactivation fonctionnelle. Les migrations sont additives, mais les données écrites après activation rendent un `DROP TABLE` dangereux.

- Si aucune écriture pilote : restaurer le clone/backup selon la procédure DBA validée.
- Si des écritures existent : conserver les tables, désactiver l'accès, exporter les données, corriger en migration avant toute reprise.
- Ne restaurer l'ensemble de la base que si l'impact sur les écritures concurrentes historiques est accepté par le responsable métier.
- Après restauration, comparer identités, quiz, `learning_*`, paiements et tentatives avec les comptages préalables.

## 12. Responsabilités et décision

- DBA/lead backend : cible, backup/restauration, migrations, RLS.
- Responsable IA/finance : Azure, tarifs, plafond et qualité fournisseur.
- Sécurité : dépendances et revue multi-tenant.
- QA/mobile : navigateurs, réseau lent, Android physique, accessibilité.
- Référent pédagogique : Mathématiques/SVT et conformité documentaire.
- Produit : allowlist, cohortes, consentement et KPI.

La décision actuelle reste : **GO sous conditions pour A; NO-GO pour B/C**.
