# Elima Révision — Readiness release Android

Date de contrôle : 20 octobre 2026  
Périmètre : application Révision, API Révision, Supabase Révision et projet Android `ci.elima.revision`  
Exclus : Elima Identity, Elima Store, publication Google Play et génération d'un AAB

## Décision synthétique

Le code Révision est stable au regard des tests automatisés exécutés et la chaîne Android locale sait préparer une release signée. Le projet Supabase Révision est identifié sans ambiguïté, accessible en lecture administrative et sans divergence de migration.

La génération technique d'un AAB est prête, mais le feu vert pour produire puis téléverser une candidate de production reste **NO-GO** tant que les points suivants ne sont pas traités :

1. décider et appliquer la politique de confiance des scores des QCM historiques ;
2. traiter ou accepter formellement les vulnérabilités npm de production qui touchent Révision ;
3. terminer la recette réelle OTP, appareil Android et Google Play Billing ;
4. confirmer dans Play Console que `versionCode 5` n'a jamais été utilisé et compléter les déclarations Families/Data safety.

Aucun AAB n'a été généré et rien n'a été publié.

## 1. Fonctionnalités validées

### Onboarding primaire et compatibilité secondaire

Les contrôles statiques, unitaires et d'intégration confirment :

- sélection explicite du cycle primaire ou secondaire ;
- classes CM1 et CM2 ;
- Mathématiques et Français activés au primaire ;
- Sciences affiché comme planifié et non sélectionnable ;
- une ou plusieurs matières sauvegardées avec le profil dans une RPC atomique ;
- confirmation d'accompagnement parental obligatoire pour un profil primaire autonome ;
- retour entre les étapes sans perte du formulaire ;
- changement de cycle/classe qui retire les choix incompatibles sans supprimer l'historique ;
- modification ultérieure du profil et des matières ;
- conservation des anciens profils secondaires, y compris ceux dont `school_cycle` reste nul ;
- échec fermé lorsque la session utilisateur manque ou lorsque la configuration de production est incomplète.

Les cas CM1 Mathématiques, CM2 Français et CM2 avec deux matières sont couverts par les tests de catalogue, d'onboarding et de migration. La reconnexion réelle après inscription nécessite encore un OTP et un appareil ou navigateur réel.

### Chemins critiques de production

| Fonction | Résultat automatisé | Limite restante |
| --- | --- | --- |
| Authentification Identity + bridge Révision | cycles restore/refresh/bridge/logout web et natif validés | OTP WhatsApp réel à recetter |
| QCM générés | génération, quotas et persistance testés | confiance des scores historiques, voir P0 |
| Fiches générées | service de génération et quotas testés | appel fournisseur réel à recetter |
| Scanner PDF/JPEG/PNG | validation des signatures, OCR, quotas, erreurs fournisseur et suppression testés | caméra et document réels à recetter |
| Formules mathématiques | rendu KaTeX et ressources pédagogiques testés | contrôle visuel appareil requis |
| Figures scientifiques | SVG déclaratifs et fallbacks testés | contrôle visuel appareil requis |
| Quotas | consommation, reset, remboursement fournisseur et concurrence testés | vérifier les valeurs de production |
| Abonnements | offres, achat/restauration et vérification serveur testés | test Play Console avec licence requise |
| Historique/progression | lecture, filtrage, reprise et compatibilité testés | scores QCM historiques non certifiés |
| Suppression de compte | ownership, cascade Révision et préservation d'une identité partagée testés | recette sur compte jetable requise |

L'API de production configurée pour le build natif possède une origine HTTPS valide. Des preflights non authentifiés, sans écriture, ont répondu `204` avec `Access-Control-Allow-Origin: https://localhost` pour `elima-session`, `elima-profile`, `revision-subscription`, `revision-generate`, `revision-document-analyze`, `learning` et `account-delete`.

## 2. État Git et fichiers à versionner

Le worktree est volontairement sale. Il contient à la fois le travail Révision et des travaux indépendants Store. Aucun commit ni push n'a été effectué.

### Périmètre Révision à versionner

- `apps/revision/src/RevisionStudentProfilePage.tsx`
- `apps/revision/src/constants/studentClasses.ts`
- `apps/revision/src/features/auth/RegistrationPage.tsx`
- `apps/revision/src/features/legal/LegalPage.tsx`
- `apps/revision/src/lib/revisionSubjects.ts`
- `apps/revision/src/revisionDemoAuth.ts`
- `apps/revision/src/services/profileService.ts`
- `apps/revision/src/services/studentAccountService.ts`
- `apps/revision/src/types/roles.ts`
- `packages/revision-core/src/educationCatalog.ts`
- `packages/revision-core/src/onboardingService.ts`
- `packages/revision-core/src/index.ts`
- `supabase/migrations/20261019120000_revision_primary_onboarding.sql`
- `tests/api/revision-onboarding.test.ts`
- `tests/revision/primary-onboarding.test.ts`
- `tests/revision/revision-build.test.ts`
- `tests/packages/revision-core.test.ts`
- `docs/revision-primary-onboarding.md`

### Automatisation Supabase à versionner

- scripts pertinents sous `database/scripts/` ;
- manifestes et configuration Révision sous `database/` ;
- `tests/api/supabase-migration-automation.test.ts` ;
- `docs/database/automated-migrations.md` et documentation de schéma Révision ;
- les hunks `db:*` de `package.json` ;
- la règle `database/reports/*.json` de `.gitignore`.

Les rapports JSON produits sous `database/reports/` restent locaux et ignorés.

### Stabilisation Android à versionner

- `apps/revision/android/app/src/main/AndroidManifest.xml` : `allowBackup` passe à `false` afin de ne pas sauvegarder les sessions locales ;
- `tests/revision/native-preparation.test.ts` : assertion de non-régression ;
- le présent rapport.

### À exclure explicitement

- `apps/store/`, les migrations `20261020*_store_*`, les tests et documents Store ;
- les hunks Store de `package.json` et `package-lock.json` ;
- `packages/branding/copy-assets.mjs` si son changement appartient au Store ;
- `assets/`, `output/` et `tmp/` ;
- les fichiers `.env`, le keystore et `keystore.properties`.

`package.json` et `package-lock.json` mélangent actuellement plusieurs sujets. Ils doivent être indexés hunk par hunk, sans staging global.

### Découpage de commits proposé

1. `feat(revision): add primary onboarding and profile preferences`
2. `test(revision): cover primary onboarding and secondary compatibility`
3. `chore(database): add guarded Supabase revision migration automation`
4. `fix(revision-android): disable app data backup`
5. `docs(revision): document Android release readiness`

Avant chaque commit : utiliser `git diff --cached --stat` et `git diff --cached`, puis vérifier qu'aucun chemin Store, secret, asset utilisateur ou sortie temporaire n'est inclus.

## 3. Résultats des tests et builds

| Commande/contrôle | Résultat |
| --- | --- |
| `npm run test:revision` | 71/71 réussis, après la correction Android |
| `npm run test:api` | 136/136 réussis |
| `npm run test:packages` | 44/44 réussis |
| `npm run typecheck:revision` | réussi |
| `npm run typecheck:packages` | réussi |
| `npm run lint:revision` | 0 erreur, 7 avertissements |
| `npm run build:revision:web` | réussi, 2 133 modules |
| `npm run build:revision:native` | réussi, configuration API HTTPS validée |
| `:app:lintRelease` | 0 erreur, 18 avertissements |
| `:app:testReleaseUnitTest` | 1/1 réussi |
| `:app:checkReleaseSigning` | réussi sans exposer les propriétés |
| `:app:processReleaseMainManifest` | réussi ; backup désactivé, permission et métadonnée Billing présentes |

Le bundle JavaScript principal fait environ 1,18 Mo minifié, 343 Ko gzip. Le découpage de code est un P2, pas un blocage fonctionnel.

Les 7 avertissements ESLint comprennent trois avertissements Fast Refresh, un import inutilisé, deux dépendances de hooks et une affectation inutile. Les dépendances de hooks doivent être revues avant une maintenance importante, mais aucun échec de test n'a été observé.

Android Lint remonte 18 avertissements, principalement : icônes legacy qui remplissent le carré, absence de variante monochrome pour l'icône adaptative, tailles DIP incohérentes du splash, bitmap dans `drawable` et ressources inutilisées. Ils sont classés P1/P2 visuels.

## 4. État Supabase Révision

- cible : `revision` ;
- project ref confirmé : `rydnrvvmwixrkmnvpajf` ;
- variable utilisée : `REVISION_ACCESS_TOKEN` ;
- projet visible par le token : oui ;
- accès SQL administratif en lecture seule : oui ;
- migration primaire `20261019120000` : appliquée ;
- checksum local/distant : concordant ;
- divergences : aucune ;
- migrations manquantes : aucune ;
- migrations appliquées pendant cet audit : aucune ;
- ledger de migration : RLS actif, aucun accès `anon` ou `authenticated` ;
- données constatées : 12 profils et 37 préférences ;
- audit de cycles : 0 primaire, 2 secondaire, 10 historiques sans cycle, aucune incohérence reconnue ;
- politiques RLS : ownership sur profils et préférences ;
- RPC onboarding : présente, `search_path=public`, exécutable par `authenticated`, non exécutable par `public`.

Le projet Identity `nnsgvnjzfrcmbxfwlyow` n'a été ni interrogé pour une migration, ni modifié.

## 5. Configuration Android détectée

- identifiant/namespace : `ci.elima.revision` ;
- `versionCode` : `5` ;
- `versionName` : `1.0.4` ;
- Capacitor core/android/CLI : `8.5.2` ;
- Android Gradle Plugin : `8.13.0` ;
- Gradle Wrapper : `8.14.3` ;
- Java : JBR/OpenJDK 21.0.10 ;
- `minSdk` : 24 ;
- `compileSdk` : 36 ;
- `targetSdk` : 36 ;
- trafic HTTP en clair : interdit ;
- sauvegarde applicative : désactivée ;
- permission explicite applicative : `INTERNET` ;
- permission Billing fusionnée : présente ;
- activité exportée : seulement l'activité launcher ;
- deep links : aucun intent filter de deep link ;
- OAuth natif : volontairement désactivé ; authentification via API/WhatsApp et bridge ;
- bundle web embarqué localement par Capacitor, sans serveur distant ;
- signature : quatre paramètres présents, fichier keystore existant et contrôle Gradle réussi ;
- fallback vers une clé debug : absent ;
- minification release : désactivée.

Le `targetSdk 36` satisfait l'exigence Google Play applicable depuis le 31 août 2026 pour les nouvelles apps et mises à jour. Référence : <https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-en>.

## 6. Google Play Billing

La dépendance Android est `com.android.billingclient:billing:8.0.0`. La version 8 reste acceptée pour les nouvelles publications et mises à jour jusqu'au 31 août 2027, avec extension possible jusqu'au 1er novembre 2027. Référence : <https://developer.android.com/google/play/billing/deprecation-faq?hl=en>.

La conception détectée est correcte :

- tarifs et offres viennent de Google Play ;
- aucun paiement simulé sur le web ;
- achat et restauration ne donnent pas de droit localement ;
- le token d'achat est vérifié côté serveur ;
- l'identité d'achat est liée à un identifiant de compte obscurci ;
- l'accusé de réception et les états Google autoritaires sont traités ;
- les notifications RTDN possèdent une route serveur dédiée.

La version 8.0.0 est supportée mais n'est pas le dernier correctif de la branche 8. Une montée au dernier 8.x, puis la préparation de Billing 9, est recommandée en P2 après la candidate. Le manifeste fusionné contient la permission Billing et `com.google.android.play.billingclient.version`.

## 7. Problèmes P0, P1 et P2

### P0 — bloquant selon l'usage

**Scores QCM historiques falsifiables par le client.** `QuizPage.tsx` calcule le score et `revisionDataService.ts` transmet `p_score`, `p_total_questions` et `p_correct_answers` à `record_quiz_attempt`. La RPC vérifie les bornes et l'ownership, mais ne recalcule pas les bonnes réponses. Un utilisateur authentifié peut donc forger son propre score, son XP et sa moyenne via un appel direct.

Conséquence : ces résultats ne doivent pas servir de note, certification, classement fiable, contrôle parental probant ou déblocage évalué. Le problème est **P0 pour tout usage évalué**. Il peut être accepté temporairement pour un produit strictement d'entraînement personnel si l'interface et les conditions indiquent clairement que le score est indicatif et non certifié.

Correction minimale proposée, sans refonte du moteur :

1. créer une route serveur `revision-quiz-submit` recevant l'identifiant de tentative et les réponses, jamais un score ;
2. conserver côté serveur un snapshot immuable des questions et corrigés lors de la création du QCM ;
3. recalculer bonnes réponses, score et XP côté serveur dans une transaction idempotente ;
4. retirer `EXECUTE` à `authenticated` sur la RPC historique et réserver l'écriture au backend ;
5. marquer les anciennes tentatives `score_trust = 'client_reported'` et les nouvelles `server_verified` ;
6. afficher « entraînement non certifié » pour les anciennes tentatives et exclure celles-ci de tout usage évalué.

Tests minimaux associés : score forgé ignoré, réponses rejouées idempotentes, tentative d'un autre utilisateur refusée, snapshot introuvable refusé, XP/moyenne calculés côté serveur, historique legacy conservé et correctement étiqueté.

### P1 — à résoudre avant mise en production publique

- Audit npm Révision : 9 vulnérabilités déclarées, dont 2 `high`. Les alertes directes/transitives concernent notamment `brace-expansion`, `source-map-js`, KaTeX et React Router. KaTeX demande actuellement une mise à jour majeure proposée par npm ; ne pas appliquer `npm audit fix --force` sans tests. Faire une branche de mise à niveau, qualifier ce qui est build-only et corriger au minimum les dépendances runtime exploitées par du contenu utilisateur.
- Recette OTP/compte réel/appareil non réalisée.
- Achat, restauration, renouvellement, grâce, account hold, annulation et RTDN non testés dans une piste Play avec testeur de licence.
- Déclarations Google Play liées aux mineurs non vérifiées. Comme CM1/CM2 sont inclus, les réponses Target audience, Data safety, IARC, politique de confidentialité, SDK et monétisation doivent être cohérentes avec la politique Families : <https://support.google.com/googleplay/android-developer/answer/9893335?hl=en>.
- Confirmer que `versionCode 5` est libre dans Play Console ; sinon l'incrémenter sans changer `applicationId`.
- Corriger les icônes adaptatives/monochromes et vérifier le splash sur plusieurs densités avant diffusion publique.

### P2 — amélioration planifiée

- découper le chunk JavaScript principal ;
- traiter les 7 avertissements ESLint ;
- mettre à jour Billing vers le dernier patch supporté puis planifier Billing 9 ;
- supprimer `flatDir` lorsque les plugins le permettent ;
- activer et qualifier R8/minification sur une version ultérieure ;
- corriger les ressources Android inutilisées et les warnings Gradle avant Gradle 9 ;
- corriger l'environnement PowerShell local qui référence un ancien `conda.exe` inexistant ;
- résoudre l'incohérence `npm ls` sur `eslint@10.7.0`, sans toucher aveuglément au lockfile mêlé au Store.

## 8. Procédure de recette manuelle restante

Utiliser un téléphone Android compatible, une installation issue d'une piste de test Play pour Billing, un numéro WhatsApp réel et des comptes jetables dédiés. Ne pas utiliser un compte de production important.

### Onboarding et session

1. Installer proprement la candidate, démarrer hors ligne puis rétablir le réseau ; vérifier le message et la reprise.
2. Créer un compte avec OTP réel, cycle primaire, CM1, Mathématiques et confirmation parentale ; fermer complètement l'app puis se reconnecter.
3. Répéter avec CM2, Français.
4. Répéter avec CM2, Mathématiques + Français.
5. Vérifier que Continuer reste désactivé sans confirmation parentale.
6. À chaque étape, utiliser le bouton Retour Android ; vérifier la conservation des choix et l'absence de double navigation.
7. Dans Profil, passer de classe et de matières ; vérifier que les historiques restent présents.
8. Ouvrir un compte secondaire existant ; vérifier niveau, matières, historique et absence de demande parentale rétroactive.
9. Couper le réseau pendant l'enregistrement, vérifier l'erreur sans perte du formulaire, rétablir le réseau et réessayer une seule fois.
10. Redémarrer l'app et le téléphone ; vérifier la restauration sûre de la session puis la déconnexion complète.

### Fonctions pédagogiques et compte

1. Générer un QCM et une fiche dans chaque matière disponible ; vérifier quotas et erreurs utilisateur.
2. Scanner une photo puis un PDF ; vérifier aperçu, consentement d'analyse, OCR, fiche et suppression du document.
3. Afficher plusieurs formules KaTeX et figures scientifiques en portrait/paysage, thème clair, petites et grandes polices.
4. Vérifier l'historique et la progression. Tant que le P0 score n'est pas corrigé, confirmer l'étiquetage non certifié et l'absence d'usage évalué.
5. Supprimer un compte jetable Révision-only, puis un compte lié à plusieurs produits ; vérifier la portée attendue côté Identity sans modifier manuellement Identity.

### Billing Play

1. Installer depuis la piste interne avec un testeur de licence.
2. Vérifier les produits Standard/Premium, prix localisés et offre d'essai.
3. Acheter, annuler puis restaurer ; vérifier que le droit n'apparaît qu'après vérification serveur.
4. Tester changement Standard/Premium, achat en attente, grâce, account hold et expiration avec les outils Play.
5. Contrôler la réception RTDN et la mise à jour idempotente des droits.

Consigner pour chaque scénario : appareil, version Android, compte de test, heure UTC, résultat attendu/observé, capture et logs expurgés.

## 9. Vérifications Google Play Console

- compte développeur et identité développeur vérifiés ;
- application liée exactement à `ci.elima.revision` ;
- clé Play App Signing comparée au certificat attendu ;
- `versionCode 5` disponible ;
- piste interne et testeurs de licence configurés ;
- produits et offres Standard/Premium actifs, IDs identiques à ceux du plugin ;
- API Google Play Developer, compte de service, accès à l'application et permissions minimales ;
- topic Pub/Sub et RTDN configurés, abonnement surveillé et endpoint opérationnel ;
- pays, prix, périodes, essai, remplacement d'offre et délais de grâce cohérents ;
- Target audience incluant les âges réellement visés ;
- conformité Families pour les utilisateurs CM1/CM2, y compris SDK, collecte de données et monétisation ;
- Data safety aligné avec WhatsApp/téléphone, profil scolaire, caméra/documents, OCR, progression, achats et diagnostics ;
- politique de confidentialité publique, suppression de compte et URL de support valides ;
- IARC, contenu de la fiche, captures, icône, feature graphic et coordonnées de contact ;
- formulaire App access avec un compte de revue fonctionnel si connexion obligatoire ;
- déclaration publicitaire exacte ;
- aucune permission sensible inattendue dans l'App Bundle Explorer ;
- target API 36 reconnu après téléversement.

## 10. Checklist GO / NO-GO

- [x] Projet Supabase Révision identifié sans ambiguïté.
- [x] Migration primaire appliquée sans divergence.
- [x] Tests Révision, API et packages réussis.
- [x] Typecheck et builds web/natif réussis.
- [x] Lint Android sans erreur.
- [x] Signature release existante contrôlée sans exposer de secret.
- [x] API native HTTPS et CORS des routes critiques vérifiés.
- [x] Backup Android désactivé et testé.
- [ ] Scores historiques rendus non falsifiables ou formellement limités à l'entraînement non certifié.
- [ ] Vulnérabilités npm P1 corrigées ou acceptées avec analyse d'exploitabilité documentée.
- [ ] Recette OTP/appareil terminée.
- [ ] Recette Google Play Billing terminée sur piste interne.
- [ ] Conformité Families/Data safety validée.
- [ ] `versionCode` confirmé libre et assets Play finalisés.

Verdict actuel : **NO-GO pour un AAB destiné à la production**. La toolchain est prête, mais la candidate ne doit pas être téléversée comme release publique avant fermeture des cases ci-dessus.

## 11. Commandes exactes de préparation

Depuis la racine du monorepo, dans un worktree propre et après revue du lockfile :

```powershell
npm ci
npm run db:auth:status -- --target=revision
npm run db:migrate:status -- --target=revision
npm run test:packages
npm run test:api
npm run test:revision
npm run typecheck:packages
npm run typecheck:revision
npm run lint:revision
npm run build:revision:web
npm run build:revision:native
Set-Location apps/revision
npx cap sync android
Set-Location ../..
```

Puis :

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
Set-Location apps/revision/android
.\gradlew.bat --console=plain clean checkReleaseSigning lintRelease testReleaseUnitTest
```

Ne pas exécuter `db:migrate:revision` pendant la préparation : aucune migration n'est manquante.

## 12. Procédure future de création de l'AAB signé

Cette procédure est documentée mais n'a pas été exécutée pendant la mission.

1. Fermer tous les P0/P1 retenus par la checklist et obtenir le GO produit/politique.
2. Confirmer `versionCode` dans Play Console et l'incrémenter si nécessaire ; conserver `applicationId "ci.elima.revision"`.
3. Partir d'un commit/tag revu, avec `git status --short` ne montrant aucune modification inattendue.
4. Fournir les quatre variables de signature dans l'environnement CI sécurisé, ou utiliser le `keystore.properties` local existant et ignoré. Ne jamais les afficher ou les committer.
5. Rejouer toutes les commandes de la section 11.
6. Toujours dans `apps/revision/android`, exécuter :

```powershell
.\gradlew.bat --console=plain bundleRelease
```

7. Récupérer `apps/revision/android/app/build/outputs/bundle/release/app-release.aab`.
8. Vérifier taille, hash SHA-256, certificat de signature et manifeste final sans publier :

```powershell
Get-FileHash .\app\build\outputs\bundle\release\app-release.aab -Algorithm SHA256
```

9. Archiver le hash, le commit, `versionCode`, `versionName`, résultats de tests et identité du certificat.
10. Téléverser d'abord sur une piste interne uniquement après autorisation explicite ; examiner App Bundle Explorer, permissions, target API et alertes de politique avant toute promotion.

