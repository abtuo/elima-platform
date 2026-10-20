# Elima Révision — rapport de passation et prochaines étapes

Date de référence : 20 octobre 2026  
Périmètre : application Révision, onboarding primaire et secondaire, modèle de profil, préférences, migrations Supabase et préparation Android.

## Conclusion opérationnelle

L’onboarding primaire et secondaire est implémenté dans le worktree et sa migration est appliquée sur le projet Supabase Révision `rydnrvvmwixrkmnvpajf`. Les contrôles distants du 20 octobre 2026 ne montrent aucune migration en attente ni divergence. Les profils et préférences existants sont conservés, les politiques RLS sont inchangées et le nouvel enregistrement atomique est limité à l’utilisateur authentifié.

La prochaine priorité n’est pas d’ajouter immédiatement davantage de fonctionnalités pédagogiques. Il faut d’abord isoler et versionner les changements Révision actuellement non commités, effectuer un test fonctionnel complet sur un vrai compte et un appareil Android, puis préparer une version candidate. L’extension des contenus primaires, la révision d’examens et l’amélioration des modèles peuvent ensuite être engagées sur cette base stabilisée.

## État vérifié

| Élément | État au 20 octobre 2026 | Preuve ou remarque |
|---|---|---|
| Projet Supabase Révision | `rydnrvvmwixrkmnvpajf` | Référence contrôlée depuis le token et la connexion PostgreSQL |
| Token Management API Révision | Valide | `REVISION_ACCESS_TOKEN`, projet visible, SQL read-only autorisé |
| Projet Supabase Identity | `nnsgvnjzfrcmbxfwlyow` | Non modifié pendant le déploiement Révision |
| Migration primaire | Appliquée | `20261019120000_revision_primary_onboarding.sql` |
| Migrations Révision en attente | Aucune | Dernier statut distant sans divergence |
| Historique officiel Supabase | Absent historiquement | Aucun rattrapage arbitraire effectué |
| Registre Elima | Une migration avec checksum | Table protégée par RLS, aucun accès `anon` ou `authenticated` |
| Profils distants | 12 conservés | Aucun ajout ni retrait pendant la migration |
| Préférences distantes | 37 conservées | Aucun ajout ni retrait pendant la migration |
| Profils secondaires reconnus | 2 correctement rétrocompatibles | Zéro incohérence de cycle |
| Profils sans niveau reconnu | 10 laissés sans cycle | Aucune déduction arbitraire |
| Build Révision | Réussi | Avertissement préexistant sur la taille du bundle |
| AAB Android | Non généré | Hors périmètre jusqu’à validation fonctionnelle finale |

Rapports d’exécution locaux, ignorés par Git :

- `database/reports/2026-10-20T15-29-11-587Z-revision-apply.json` : application initiale ;
- `database/reports/2026-10-20T15-50-51-395Z-revision-status.json` : dernier statut distant ;
- `database/reports/2026-10-20T15-50-55-644Z-revision-apply.json` : dernière vérification idempotente, sans migration rejouée.

## Fonctionnalités livrées

### Onboarding

Le parcours suit désormais : Bienvenue → Cycle → Classe → Matières → Confirmation → Tableau de bord.

- Cycle primaire : CM1 et CM2.
- Cycle secondaire : toutes les classes et séries antérieures sont conservées.
- Primaire actif : Mathématiques et Français.
- Primaire planifié : Sciences et technologie, visible mais non sélectionnable.
- Domaines pédagogiques primaires structurés dans le catalogue central.
- Navigation Retour et Retour Android sans perte des choix.
- Résumé modifiable avant validation.
- États de chargement, erreurs compréhensibles et nouvelle tentative après erreur réseau.
- Confirmation d’accompagnement par un parent ou responsable légal pour le primaire.

### Profil et préférences

- Cycle, classe, matières, établissement déclaré et ville modifiables depuis le profil autonome.
- Les choix incompatibles sont retirés du formulaire lors d’un changement de cycle ou de classe.
- Aucun historique de QCM, fiche, document, parcours ou progression n’est supprimé.
- Pour un profil autonome, profil et matières sont enregistrés dans une seule transaction.
- Les profils rattachés à un établissement restent soumis à leurs règles antérieures.

### Données et sécurité

Les colonnes suivantes sont présentes dans `public.student_profiles` :

- `school_cycle` ;
- `onboarding_completed_at` ;
- `guardian_acknowledged_at`.

La fonction `public.save_revision_onboarding` :

- utilise `auth.uid()` comme propriétaire effectif ;
- refuse les profils non autonomes ;
- valide les combinaisons cycle, classe et matières ;
- exige l’accompagnement adulte pour le primaire ;
- remplace les préférences dans la même transaction ;
- fixe `search_path=public` ;
- n’est pas exécutable par `public` ;
- est exécutable par `authenticated`.

Les quatre politiques RLS existantes sur `student_profiles` et `student_revision_subject_preferences` sont restées identiques.

## Architecture retenue

- `packages/revision-core/src/educationCatalog.ts` : référentiel canonique du système éducatif, cycles, classes, matières, domaines et disponibilité.
- `packages/revision-core/src/onboardingService.ts` : contrat applicatif de sauvegarde atomique.
- `apps/revision/src/features/auth/RegistrationPage.tsx` : parcours d’inscription et d’onboarding.
- `apps/revision/src/RevisionStudentProfilePage.tsx` : modification post-inscription.
- `supabase/migrations/20261019120000_revision_primary_onboarding.sql` : migration additive et RPC.
- `database/scripts/supabase-migrate.mjs` : statut, comparaison, analyse de sécurité, application et vérification.
- `database/scripts/verify-supabase-token.mjs` : validation explicite des tokens Identity ou Révision.
- `database/scripts/lib/migration-safety.mjs` : association cible/référence, validation des URLs et classification des risques SQL.

## Commandes durables

```powershell
npm run db:auth:status -- --target=revision
npm run db:migrate:status -- --target=revision
npm run db:migrate:revision
```

Garanties :

- cible et référence de projet obligatoires ;
- aucun repli vers `IDENTITY_ACCESS_TOKEN` pour Révision ;
- aucun secret dans les logs ou rapports ;
- refus des opérations destructrices ;
- refus d’une migration divergente ou partiellement appliquée ;
- refus d’une migration sans politique de sauvegarde reconnue ;
- aucune écriture lorsque toutes les migrations sont déjà appliquées ;
- vérification des colonnes, contraintes, fonctions, permissions, RLS et compteurs après application.

## Résultats de validation

- Tests Révision : 71 réussis.
- Tests API complets : 136 réussis.
- Tests packages : 44 réussis.
- Tests ciblés migration et automatisation : 4 réussis lors de la validation finale.
- Typecheck Révision et packages : réussi.
- Build Révision : réussi.
- Lint : aucune erreur ; avertissements préexistants uniquement.
- `git diff --check` : aucune erreur de contenu.

## Risques et limites encore ouverts

### Worktree non isolé

Les changements Révision ne sont pas encore commités et cohabitent avec des travaux Store et des ressources non suivies. Le prochain agent doit préserver les modifications existantes et ne pas inclure automatiquement `apps/store`, les migrations Store, `output`, `tmp` ou les images sans rapport avec Révision.

### Historique Supabase historique

Le projet Révision ne possédait pas de table officielle `supabase_migrations.schema_migrations` exploitable alors que plusieurs effets historiques sont présents. Le baseline et le manifeste décrivent cet héritage. Il ne faut pas utiliser `migration repair` ni marquer rétroactivement des versions sans preuve migration par migration.

### Sauvegarde logique

`pg_dump`, Docker et Podman ne sont pas disponibles sur la machine. La migration onboarding était additive, transactionnelle et limitée à de nouvelles colonnes ; elle a utilisé un instantané structurel et agrégé. Toute future transformation irréversible doit être bloquée jusqu’à disponibilité d’une sauvegarde restaurable ou d’une preuve de PITR adaptée.

### Validation fonctionnelle réelle

Les validations automatisées sont complètes, mais un parcours réel avec OTP, compte neuf CM1/CM2, reconnexion et appareil Android doit encore être documenté avant publication.

### Mineurs

L’attestation d’accompagnement adulte est un garde-fou produit, pas une preuve juridique universelle de consentement parental. Une revue juridique par pays reste nécessaire avant un déploiement commercial large au primaire.

### Performance frontend

Le build réussit mais signale un bundle JavaScript supérieur au seuil recommandé. Ce point n’empêche pas la livraison fonctionnelle, mais doit être traité avant une extension importante des écrans ou modèles.

## Feuille de route recommandée

### Priorité 0 — Stabiliser et préparer une version candidate

Objectif : rendre la livraison actuelle reproductible et testable sans ajouter de périmètre.

1. Isoler les fichiers Révision et automatisation Supabase des changements Store.
2. Rejouer typecheck, tests Révision, tests API et build depuis un worktree propre.
3. Tester sur un compte neuf : CM1/Mathématiques, CM2/Français et CM2/deux matières.
4. Tester un compte secondaire historique et un changement de classe.
5. Tester l’échec réseau puis la reprise de sauvegarde.
6. Tester l’installation PWA et un appareil Android réel.
7. Vérifier les textes légaux et le parcours responsable légal avec le responsable produit.
8. Produire ensuite seulement une version candidate Android ; ne pas publier directement en production.

Critère de sortie : tous les parcours réussissent sur Web, PWA et Android, aucune donnée historique ne change, et le lot Révision est versionné séparément.

### Priorité 1 — Construire le socle pédagogique primaire

Objectif : rendre Mathématiques et Français réellement adaptés à CM1/CM2 sans dupliquer le moteur secondaire.

1. Définir les compétences et objectifs par domaine, niveau et période.
2. Ajouter une banque de contenus versionnée avec provenance et niveau de difficulté.
3. Étendre les contrats d’exercices aux formats adaptés au primaire.
4. Créer des évaluations automatiques déterministes avant tout recours à l’IA.
5. Ajouter des jeux de tests pédagogiques CM1/CM2 et des évaluations humaines.
6. Activer Sciences et technologie seulement lorsque contenus, exercices et contrôles qualité sont disponibles.

Ne pas activer CP, CE1 ou CE2 dans l’interface pendant cette phase. Le catalogue est extensible, mais ces niveaux exigent un traitement UX et légal spécifique.

### Priorité 2 — Ajouter la révision d’examens

Objectif : permettre la préparation structurée aux examens sans transformer le scanner en générateur opaque.

Périmètre conseillé :

- référentiel d’examens, années, séries, matières et chapitres ;
- import de sujets avec provenance, droits et métadonnées ;
- mode entraînement chronométré ;
- barèmes et corrigés séparés de la projection élève ;
- reprise des erreurs par notion ;
- tableau de progression par examen ;
- génération de variantes seulement après validation du sujet source.

Commencer par un seul examen et une seule matière afin de valider le modèle de données, les droits sur les sujets et l’expérience utilisateur.

### Priorité 3 — Améliorer les modèles et les évaluations IA

Objectif : augmenter la qualité mesurable avant d’augmenter le volume de génération.

1. Constituer un jeu d’évaluation versionné par matière, niveau et type d’exercice.
2. Mesurer exactitude, conformité au niveau, qualité du corrigé, sécurité et coût.
3. Séparer génération, validation déterministe et réparation ciblée.
4. Journaliser version de prompt, modèle, paramètres, latence, tokens et résultat d’évaluation.
5. Comparer les modèles sur le même corpus avant toute migration.
6. Maintenir les quotas et remboursements existants ; ne pas modifier la monétisation dans ce chantier.

### Priorité 4 — Étendre progressivement le primaire

Après validation de CM1/CM2 :

1. activer Sciences et technologie ;
2. étudier CE2 ;
3. adapter l’UX pour CE1 et CP ;
4. revoir les mécanismes de compte et d’accompagnement adulte ;
5. ajouter les nouveaux niveaux par activation explicite, sans modifier les identifiants existants.

## Mission conseillée pour le prochain agent

> Stabiliser la livraison onboarding primaire d’Elima Révision et préparer une version candidate Android. Commencer par lire `docs/elima-revision-suite-2026-10-20.md`, `docs/revision-primary-onboarding.md` et `docs/database/automated-migrations.md`. Préserver tous les travaux Store et fichiers utilisateur non liés. Isoler les changements Révision, exécuter les validations complètes, réaliser les parcours fonctionnels CM1, CM2 et secondaire historique, corriger uniquement les régressions observées, puis produire un rapport de release readiness. Ne pas générer ni publier l’AAB sans instruction explicite.

Une fois cette mission terminée, le chantier recommandé est le socle pédagogique primaire, avant la révision d’examens et l’extension à d’autres niveaux.

## Checklist de reprise rapide

- [ ] Lire les trois documents de référence Révision et Supabase.
- [ ] Vérifier `git status` et identifier les changements étrangers au périmètre.
- [ ] Exécuter `npm run db:auth:status -- --target=revision`.
- [ ] Exécuter `npm run db:migrate:status -- --target=revision`.
- [ ] Ne lancer `db:migrate:revision` que si une migration locale autorisée est réellement en attente.
- [ ] Rejouer les tests, typecheck, lint et build Révision.
- [ ] Tester les parcours réels Web, PWA et Android.
- [ ] Documenter tout écart avant correction.
- [ ] Ne jamais utiliser `db reset` sur une base distante.
- [ ] Ne jamais mélanger les projets Identity et Révision.
- [ ] Ne pas générer l’AAB avant validation explicite.
