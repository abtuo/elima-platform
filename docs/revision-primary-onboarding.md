# Onboarding primaire d'Elima Révision

## Architecture

Le référentiel canonique est `packages/revision-core/src/educationCatalog.ts`. Il définit le système éducatif, les cycles, les classes, les matières, leurs domaines et leur disponibilité. Les écrans Révision ne maintiennent plus de liste primaire séparée.

La sauvegarde utilise la RPC `save_revision_onboarding`, introduite par la migration `20261019120000_revision_primary_onboarding.sql`. La classe, le cycle et le remplacement des préférences sont enregistrés dans une seule transaction. La RPC fixe l'utilisateur avec `auth.uid()`, refuse les profils rattachés gérés par un établissement et n'accepte que les combinaisons du référentiel actif.

Le parcours de création de compte conserve la vérification WhatsApp. Après vérification, il présente : Bienvenue, Cycle, Classe, Matières et Confirmation. Si la création d'identité réussit mais que la sauvegarde Révision rencontre une erreur réseau, l'écran garde l'état `accountCreated` et permet de relancer uniquement la sauvegarde, sans réutiliser l'autorisation OTP.

## Rétrocompatibilité

- CM1 et CM2 sont classés `primary`.
- Les niveaux secondaires reconnus sont classés `secondary` par backfill.
- Les comptes secondaires existants avec un niveau reconnu sont considérés comme déjà configurés et ne repassent pas par l'onboarding.
- Les identifiants et libellés secondaires existants sont conservés.
- Aucun historique, quiz, parcours, document, fiche ou état de progression n'est supprimé lors d'un changement de cycle.
- Les matières incompatibles sont décochées dans le formulaire avant sauvegarde ; l'utilisateur est averti.

## Primaire livré

- Classes actives : CM1 et CM2.
- Matières actives : Mathématiques et Français.
- Matière planifiée : Sciences et technologie, visible mais non sélectionnable.
- Les domaines pédagogiques sont structurés dans le référentiel mais n'activent encore aucun écran ni générateur primaire.

## Mineurs

Pour un profil primaire, la confirmation exige une attestation d'accompagnement par un parent ou responsable légal. Seul l'horodatage de cette confirmation est conservé ; aucun nom, numéro ou document du responsable n'est collecté.

Cette attestation est un garde-fou produit et ne constitue pas, à elle seule, une validation juridique universelle du consentement parental. Avant une ouverture commerciale aux enfants de primaire, Elima doit faire valider par conseil compétent : l'âge de consentement applicable par pays, la formulation de l'information, la preuve éventuellement requise, les responsabilités du titulaire du compte, les durées de conservation et les parcours d'exercice des droits par le représentant légal.

## Déploiement

La migration additive a été appliquée le 20 octobre 2026 au projet Révision `rydnrvvmwixrkmnvpajf`, après contrôle de la cible, du schéma, des dépendances, des politiques RLS et des effets déjà présents. Le contrôle post-migration confirme la conservation des profils et préférences, ainsi que le backfill des niveaux secondaires reconnus. Les migrations futures passent par les commandes documentées dans `docs/database/automated-migrations.md`.

