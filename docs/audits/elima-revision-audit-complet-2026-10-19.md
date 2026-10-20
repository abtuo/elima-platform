# Audit complet — Elima Révision

Date : 19 octobre 2026  
Périmètre : application autonome `apps/revision`, packages `revision-core` et `revision-ui`, API Révision/Learning, domaine pédagogique, migrations Supabase, corpus local et tests associés.  
Nature : audit statique et exécution locale, sans modification fonctionnelle, sans migration distante et sans appel IA payant.

## 1. Verdict exécutif

Elima Révision possède déjà un socle beaucoup plus avancé qu'un simple générateur de QCM : authentification autonome, PWA et Android Capacitor, préférences de matières, QCM, fiches IA, analyse de documents, quotas/abonnements Google Play, moteur Learning, séances guidées, sujets d'examen, progression par compétence et livraison de supports enseignants.

La base technique est saine et bien testée, mais le produit visible ne reflète pas encore cette richesse. Le principal problème n'est pas l'absence de briques : c'est leur fragmentation entre trois moteurs, leur faible découvrabilité et plusieurs frontières de confiance encore adaptées à l'entraînement mais pas à l'évaluation.

Décision recommandée : **ne pas repartir de zéro**. Faire d'abord une phase de consolidation qui réactive les parcours et examens, ferme les failles de score/corrigé, unifie les modèles de progression et établit un catalogue curriculaire. Ensuite seulement étendre au primaire et enrichir l'IA.

### Les cinq constats les plus importants

1. **Régression fonctionnelle P0 : parcours et examens invisibles.** `LearningAssignmentsPanel` n'est importé ni rendu par aucune page. Le dashboard ne propose que QCM, Scanner et Fiches. Pire, `mode=parcours`, `mode=devoirs` et `mode=examens` sont explicitement convertis en mode Scanner. Le backend et les écrans de résolution existent, mais le parcours normal ne permet pas d'y entrer.
2. **Frontière d'évaluation insuffisante P0.** Les réponses correctes des QCM historiques sont lisibles par tout utilisateur authentifié (`quiz_answers.is_correct`), envoyées au client et scorées côté client. La RPC `record_quiz_attempt` accepte ensuite le score déclaré par ce même client. Un élève peut donc lire les corrigés et déclarer 100 %, ce qui modifie XP, moyenne et série.
3. **Trois domaines pédagogiques se chevauchent.** Le produit combine les QCM historiques (`quiz_*`), Learning (`learning_*`, examens et séances guidées) et le nouveau domaine pédagogique versionné (`pedagogical_*`). Chacun a son modèle de tentative, de correction et d'historique. L'architecture est raisonnable par étape, mais l'expérience et les métriques ne sont pas encore unifiées.
4. **Extension primaire non cosmétique.** L'inscription commence à la 6e, les matières et prompts sont orientés collège/lycée et le fallback est « Collège / lycée ». Ajouter CP–CM2 exige un modèle de cycles, des interactions audio/visuelles, une lecture adaptée à l'âge, un cadre parental et du contenu validé — pas seulement cinq valeurs dans une liste.
5. **Qualité locale élevée, validation terrain incomplète.** Les suites ciblées passent, mais il manque une recette authentifiée sur l'environnement réellement déployé, un appareil Android modeste, un réseau lent, un lecteur d'écran et une validation curriculaire par enseignants.

## 2. État réel du produit

### 2.1 Parcours disponibles

| Capacité | État code | État produit visible | Observation |
|---|---|---|---|
| Auth élève WhatsApp/mot de passe | Implémenté et testé | Visible | Session centrale séparée de la session technique Révision. |
| Profil/niveau/matières | Implémenté | Visible | Niveau autonome et préférences persistées. |
| QCM catalogue | Implémenté | Visible | Corrigé et score côté client. |
| QCM généré par IA | Implémenté, quota serveur | Visible | JSON borné, mais réponses toujours livrées au client. |
| Fiches générées | Implémenté, quota serveur | Visible | Persistées dans `user_course_summaries`. |
| Scanner PDF/photo | Implémenté, quota serveur | Visible | Extraction + structuration IA, original supprimé après analyse. |
| Quiz issu d'un document | Implémenté | Visible | Bonne chaîne document → notions → nouveau QCM. |
| Parcours guidés Learning | Implémenté et testé | **Inaccessible normalement** | Composant orphelin et `mode=parcours` redirigé vers Scanner. |
| Révision d'examens | Backend, données et solveur implémentés | **Inaccessible normalement** | Routes profondes présentes, pas de catalogue visible. |
| Supports enseignants | Implémenté | Visible via un encart | Domaine versionné, tentatives et politiques de corrigé. |
| Progression/XP/série | Implémenté | Visible | Agrégats surtout fondés sur les QCM historiques. |
| Maîtrise par compétence | Implémenté dans Learning | Peu visible | `student_skill_state` n'alimente pas une carte de maîtrise globale. |
| Abonnements Play | Implémenté et testé | Visible | Achat uniquement dans l'application Android, quotas côté serveur. |
| Offline | Shell/PWA et sessions locales partiels | Partiel | Pas de stratégie de synchronisation homogène des tentatives. |

### 2.2 Architecture

La séparation est globalement bonne :

- `apps/revision` porte le shell, le routage et les pages autonomes ;
- `packages/revision-core` contient types, services injectables, sessions et logique métier partagée ;
- `packages/revision-ui` contient le lecteur de quiz, le scanner et le renderer pédagogique ;
- `apps/api/server` porte l'auth serveur, Azure, quotas, Learning et la publication pédagogique ;
- les migrations Supabase activent RLS et séparent correctement les secrets Learning/pédagogiques des projections publiques ;
- Vite interdit les imports depuis les espaces School et le build natif exige une API HTTPS distante.

Points structurels à corriger :

- `apps/api/server/handlers/learning.mjs` concentre navigation, catalogue, profil, validation déterministe, évaluation GPT, indices, solutions et PDF en un seul fichier d'environ 500 lignes ;
- `packages/revision-core/src/revisionDataService.ts` mélange persistance locale, Supabase, génération, progression, quiz, fiches et quota d'indices ;
- des adaptateurs très fins sont dupliqués entre `apps/mobile` et `apps/revision` ;
- le domaine pédagogique versionné est mieux architecturé que le domaine QCM historique, mais son UI élève reste minimale ;
- les trois types de tentatives n'ont ni agrégateur commun ni identifiant d'activité canonique.

## 3. Audit fonctionnel et pédagogique

### 3.1 Ce qui fonctionne bien

- Les QCM donnent une rétroaction immédiate, un indice, une explication et un historique.
- Les séances guidées capturent la confiance, les étapes du raisonnement, les indices et les erreurs ; c'est pédagogiquement plus riche qu'un simple score.
- Learning sait corriger de façon déterministe les nombres, fractions, vrai/faux, choix multiples et ordonnancement, et réserve GPT aux réponses ouvertes qui le justifient.
- Le mode examen masque validation et aides avant remise.
- Le nouveau domaine pédagogique sépare document public et corrigé privé, versionne les supports et rend les réponses ouvertes `pending_review`.
- L'analyse de document signale les compléments qui ne viennent pas de la source et supprime le fichier original après traitement.
- Les corpus locaux prouvent trois cas intéressants : séances guidées de maths 6e, parcours calcul littéral 3e, sujets/corrections de BAC.

### 3.2 Lacunes produit prioritaires

#### P0 — Restaurer l'accès aux parcours et examens

Le moteur le plus différenciant est débranché de l'interface :

- `RevisionDashboardPage` limite `RevisionMode` à `qcm | scanner | fiches` ;
- `revisionMode()` transforme `parcours`, `devoirs`, `examens` et `examen` en `scanner` ;
- `LearningAssignmentsPanel` est orphelin ;
- les retours des écrans Learning pointent pourtant tous vers `?mode=parcours`.

Impact : les tests prouvent que le code existe, pas qu'un utilisateur peut atteindre la fonctionnalité. Tous les liens retour des parcours aboutissent au mauvais onglet.

Correction cible : ajouter au minimum les modes `parcours` et `examens`, monter `LearningAssignmentsPanel`, créer un `ExamCatalogPanel`, et ajouter des tests de navigation comportementaux plutôt que des tests de présence de chaînes.

#### P0 — Séparer entraînement et évaluation

Le QCM historique est un lecteur d'entraînement : `correctIndex` est présent dans le modèle public, `is_correct` est sélectionné via Supabase et le score est calculé dans React. Cela ne doit jamais être utilisé pour une note, un classement, un badge fiable ou un examen.

Correction cible :

- conserver éventuellement ce flux pour le mode `practice` clairement étiqueté ;
- créer un endpoint serveur `start-attempt / answer / submit` pour tout mode évalué ;
- ne jamais exposer `is_correct`, explication ou corrigé avant la politique prévue ;
- calculer score, XP, série et maîtrise à partir des réponses enregistrées côté serveur ;
- rendre la RPC de résultat inaccessible au client ou la remplacer par une RPC qui vérifie les réponses.

#### P1 — Unifier la progression

Aujourd'hui :

- `user_progress` agrège surtout QCM/XP/série ;
- `quiz_attempts` suit les QCM historiques ;
- `learning_attempts` et `student_skill_state` suivent les parcours/examens ;
- `pedagogical_revision_attempts` suit les supports enseignants ;
- l'accueil reconstruit une vue partielle en combinant quelques listes.

Cible recommandée : une projection de lecture `revision_activity_feed` et une projection `student_mastery_summary`, alimentées par les trois moteurs. Ne pas migrer brutalement les historiques ; introduire un contrat canonique de projection : `activity_id`, `source_kind`, `subject_id`, `level_id`, `skills`, `mode`, `status`, `score`, `max_score`, `assistance`, `started_at`, `completed_at`.

#### P1 — Passer d'un générateur à un coach adaptatif

Les signaux existent (score, confiance, indices, erreurs, compétences), mais les recommandations sont surtout heuristiques et locales. Le prochain modèle devrait produire un plan de révision :

- diagnostic initial ;
- carte de maîtrise par compétence ;
- répétition espacée ;
- choix de la prochaine activité selon maîtrise, oubli, confiance et temps disponible ;
- explication « pourquoi cette activité » ;
- objectifs hebdomadaires réalistes ;
- distinction entre réussite autonome et réussite assistée.

L'algorithme de sélection doit rester déterministe et auditable. L'IA peut générer ou reformuler du contenu, mais ne doit pas être l'autorité unique de planification ou de notation.

#### P1 — Construire un vrai mode examen

Le code sait ouvrir un sujet et chronométrer une session, mais le produit examen doit ajouter :

- catalogue filtrable par pays, diplôme, série, matière, année, session et chapitre ;
- sujets complets et exercices isolés ;
- téléchargement/préchargement sécurisé du PDF ;
- minuterie robuste avec reprise et heure serveur ;
- brouillon, marque-pages, navigation et remise explicite ;
- barème `/20`, coefficient et analyse par compétence ;
- correction différée et politique anti-divulgation ;
- mode blanc planifié, historique de tentatives et comparaison dans le temps ;
- correction des réponses ouvertes par grille, avec relecture humaine pour tout enjeu réel.

### 3.3 Extension au primaire

#### Portée minimale recommandée

Commencer par **CM1–CM2**, puis CE1–CE2, avant CP. Le moteur actuel est textuel et convient beaucoup mieux aux élèves lecteurs autonomes. CP requiert audio, reconnaissance vocale éventuelle, consignes illustrées et médiation adulte.

#### Changements de modèle

- Remplacer les libellés libres par un référentiel `education_system / cycle / grade / track` versionné.
- Ajouter CP, CE1, CE2, CM1, CM2 et leurs équivalences locales sans supposer qu'un niveau français est universel.
- Définir des compétences atomiques et des prérequis par programme/version.
- Rattacher chaque contenu à une preuve de source curriculaire et à une validation éditoriale.
- Ajouter les types d'interaction : association image-mot, ordre, glisser-déposer, saisie courte, lecture audio, manipulation de nombres, géométrie visuelle.
- Prévoir un profil enfant, le consentement/contrôle parental approprié, des données minimales et une communication adaptée à l'âge.

#### UX primaire

- phrases et écrans plus courts, zones tactiles plus grandes ;
- lecture audio des consignes et alternatives texte ;
- feedback positif sans mécanique punitive de série ;
- séances de 5–10 minutes ;
- moins de navigation et aucune dépendance à la saisie de longs prompts ;
- mode adulte pour choisir le niveau, gérer l'abonnement et consulter la progression.

#### Contenu pilote recommandé

CM2 Mathématiques : numération, quatre opérations, fractions simples et problèmes courts. C'est un périmètre borné, déterministe, mesurable, compatible avec le renderer existant et moins risqué qu'une extension simultanée à toutes les matières.

## 4. Audit IA et modèles

### Points forts

- secrets Azure uniquement côté serveur ;
- sorties JSON structurées et validation stricte dans le pipeline pédagogique ;
- quotas, réservation et remboursement sur erreur fournisseur ;
- séparation entre validation déterministe et assistance GPT ;
- conservation du modèle/déploiement sur certaines évaluations ;
- génération pédagogique versionnée, réparable et soumise à validation humaine.

### Faiblesses

- le QCM/fiches élève utilise un contrat plus léger que le pipeline pédagogique versionné ;
- les prompts élève reposent surtout sur le niveau et le sujet déclarés, sans référentiel curriculaire vérifié ;
- aucun eval set métier continu n'est visible pour mesurer exactitude, difficulté, ambiguïté, biais de langue et conformité au niveau ;
- le modèle Azure est configuré par environnement, mais le produit ne porte pas une politique de routage par tâche/coût/latence ;
- les réponses générées peuvent être pédagogiquement plausibles sans être alignées sur un programme officiel ;
- les logs métier et dashboards coût/latence/échec ne couvrent pas uniformément tous les flux Révision.

### Cible recommandée

1. Un registre de tâches IA (`quiz_generation`, `sheet_generation`, `document_analysis`, `open_answer_feedback`) avec schéma, prompt version, modèle autorisé, budget tokens, timeout et politique de repli.
2. Un corpus d'évaluation versionné par niveau/matière, comprenant erreurs attendues et cas ambigus.
3. Des validations déterministes avant et après IA : unicité des réponses, cohérence du corrigé, calcul symbolique borné, unités, lisibilité et niveau lexical.
4. Une traçabilité de chaque contenu : source, modèle, prompt, date, statut de revue, version du programme.
5. Aucune auto-notation sommative d'une réponse ouverte sans grille fiable et validation humaine.

## 5. Sécurité, confidentialité et intégrité

### Critique

- `quiz_answers_read ... using (true)` expose les bonnes réponses à tout utilisateur authentifié.
- Le client sélectionne `is_correct` et calcule `correctIndex`.
- `record_quiz_attempt` fait confiance à `p_score` et `p_correct_answers`, puis attribue XP et série.

Ces trois points forment une chaîne complète de falsification. À corriger avant tout examen, concours, classement ou preuve de progression.

### Bon niveau de protection

- RLS présente sur les tables principales ;
- corrigés Learning et secrets pédagogiques séparés des documents publics ;
- contrôle d'identité et de tenant côté serveur pour les supports affectés ;
- URLs de PDF d'examen signées et courtes ;
- uploads Scanner privés, signature de fichier vérifiée et suppression de l'original ;
- CORS explicite, API native HTTPS, aucun secret serveur dans `VITE_*` ;
- suppression de compte et documents couverte par tests.

### À renforcer

- introduire un modèle explicite de consentement/rétention pour mineurs, particulièrement avant le primaire ;
- documenter les durées de conservation pour texte extrait, analyses, tentatives, évaluations IA et événements ;
- ajouter limitation de fréquence et détection d'abus sur démarrage/remise d'évaluations, pas uniquement sur l'IA ;
- vérifier le déploiement réel des migrations/RLS dans un environnement de préproduction ;
- ajouter des en-têtes CSP et une revue des URLs d'images distantes du renderer ;
- empêcher le service worker de mettre en cache toute réponse API ou ressource privée future.

### Dépendances au 19 octobre 2026

`npm audit --omit=dev --workspace @elima/revision` signale 9 paquets vulnérables dans l'arbre attribué au workspace : 2 élevés, 3 modérés et 4 faibles, aucun critique. Les éléments directs notables sont React Router DOM 6.30.0 et KaTeX 0.16.11. Les élevés (`brace-expansion`, `source-map-js`) sont transitifs et disposent d'un correctif. Il faut mettre à jour par lots avec tests de build/routage/rendu mathématique. L'audit global du monorepo reste plus large et inclut notamment `xlsx`, mais ce dernier appartient à Platform et non au bundle Révision.

## 6. Qualité, tests, performance et exploitation

### Vérifications exécutées

- `npm test --workspace @elima/revision` : **67/67** ;
- `npm test --workspace @elima/api` : **114/114** ;
- `npm run test:packages` : **42/42** ;
- total ciblé exécuté : **223 tests réussis** ;
- `npm run typecheck:revision` : réussi ;
- `npm run lint:revision` : 0 erreur, 7 avertissements ;
- `npm run build:revision` : réussi.

Le JavaScript principal produit fait environ **1 171,53 kB minifié / 341,25 kB gzip**, avec avertissement Vite au-delà de 500 kB. Il n'y a pratiquement pas de découpage par route.

### Lacunes de test

- les tests du dashboard vérifient surtout le code source et des chaînes, pas un parcours utilisateur monté ; c'est pourquoi le moteur Learning peut être « couvert » tout en étant inaccessible ;
- aucune preuve E2E récente d'un compte réel traversant inscription → accueil → parcours → examen → résultats ;
- pas de test de sécurité qui échoue si `is_correct` devient lisible ;
- pas de test d'intégrité qui tente de falsifier score/XP ;
- pas de matrice multi-niveaux, notamment primaire ;
- pas de mesure Core Web Vitals, mémoire Android ou réseau 3G ;
- pas de recette lecteur d'écran/contraste/focus ;
- pas de contrat de compatibilité offline/synchronisation pour les tentatives.

### Problèmes de qualité à corriger

- deux avertissements `useEffect` sur dépendances manquantes dans les écrans Learning peuvent produire des états périmés ;
- un import inutilisé et plusieurs avertissements Fast Refresh ;
- trop gros bundle initial : router, KaTeX, scanner, pédagogie et abonnement devraient être chargés à la demande ;
- le service worker pré-cache de nombreux assets sans stratégie explicite de version fonctionnelle/offline ;
- le fallback de niveau « Collège / lycée » masque les profils incomplets au lieu de déclencher une résolution explicite ;
- la langue, le pays et le système éducatif ne sont pas unifiés partout (`Côte d'Ivoire`, `CI`, chaînes libres).

## 7. Roadmap recommandée

### Phase 0 — Intégrité et réactivation (1–2 semaines)

1. Réintroduire `Parcours` et `Examens` dans le dashboard et corriger tous les retours `mode=parcours`.
2. Ajouter tests React/E2E des chemins réellement cliquables.
3. Fermer la lecture publique de `quiz_answers.is_correct`.
4. Déplacer correction, score, XP et série côté serveur pour les tentatives évaluées.
5. Corriger les hooks Learning et découper les routes principales.
6. Mettre à jour les dépendances Révision vulnérables avec non-régression.

Critère de sortie : un élève authentifié peut trouver un parcours et un sujet d'examen depuis l'accueil ; aucun client ne peut lire le corrigé avant autorisation ni déclarer son propre score.

### Phase 1 — Produit examen (2–4 semaines)

1. Catalogue multi-critères et page détail sujet.
2. Sessions examen robustes, reprise, minuteur, autosauvegarde, remise et correction différée.
3. Résultats `/20`, compétences, erreurs et plan de remédiation.
4. Import éditorial d'annales avec provenance/licence et workflow de validation.
5. Tableau de suivi élève ; vue enseignant uniquement via les permissions School existantes.

### Phase 2 — Progression adaptative (3–5 semaines)

1. Projections unifiées d'activité et de maîtrise.
2. Taxonomie de compétences/prérequis versionnée.
3. Planification déterministe + répétition espacée.
4. Accueil recentré sur « continuer », « à revoir aujourd'hui » et « objectif de la semaine ».
5. Evals IA et observabilité coût/qualité/latence.

### Phase 3 — Pilote primaire CM2 Maths (4–6 semaines)

1. Référentiel cycles/niveaux et onboarding adulte/enfant.
2. Interactions visuelles et audio accessibles.
3. Premier corpus CM2 Maths validé par enseignants.
4. Sessions courtes, diagnostic et progression sans pression de série.
5. Pilote limité, métriques et entretiens enfants/parents/enseignants.

### Phase 4 — Extension contrôlée

Étendre matière par matière et niveau par niveau à partir des preuves du pilote, puis seulement considérer CE/CP et leurs besoins vocaux/illustrés spécifiques.

## 8. Backlog priorisé

| Priorité | Sujet | Valeur | Risque/effort |
|---|---|---|---|
| P0 | Réactiver Parcours/Examens dans le dashboard | Rend visibles les meilleures briques existantes | Faible à moyen |
| P0 | Scoring/corrigés serveur | Intégrité, sécurité, prérequis examen | Moyen |
| P0 | Tests navigation et anti-falsification | Évite les régressions invisibles | Moyen |
| P1 | Catalogue d'annales | Proposition de valeur examen | Moyen |
| P1 | Activité/maîtrise unifiées | Personnalisation et analytics | Élevé |
| P1 | Code splitting | Démarrage web/Android | Faible à moyen |
| P1 | Référentiel programme/compétences | Qualité et extension primaire | Élevé |
| P1 | Evals IA continues | Maîtrise qualité/coût | Moyen |
| P2 | Pilote CM2 Maths | Nouveau marché primaire | Élevé |
| P2 | Audio/interaction visuelle | Accessibilité jeunes élèves | Élevé |
| P2 | Offline complet | Résilience réseau | Élevé |
| P2 | Observabilité produit | Pilotage et support | Moyen |

## 9. Brief prêt à donner à un agent de planification

> Tu travailles sur Elima Révision dans ce monorepo. Lis d'abord `docs/audits/elima-revision-audit-complet-2026-10-19.md`, puis vérifie chaque constat dans le code actuel. Ne code rien. Propose un plan de mise en œuvre ordonné par dépendances pour les Phases 0 et 1 seulement. Pour chaque chantier, donne : objectif utilisateur, fichiers/tables touchés, migrations additives, contrat API, stratégie de compatibilité des données, tests unitaires/intégration/E2E, risques sécurité, critères d'acceptation et estimation relative. Traite comme bloquants : (1) `LearningAssignmentsPanel` orphelin et `mode=parcours` redirigé vers Scanner ; (2) exposition de `quiz_answers.is_correct` ; (3) score/XP déclarés par le client. Préserve les données historiques et les trois moteurs existants ; propose une couche de projection commune plutôt qu'une migration destructrice. Le plan doit aboutir à un catalogue Parcours/Examens visible et à des tentatives évaluées entièrement scorées côté serveur.

## 10. Limites de cet audit

- Aucun environnement Supabase distant n'a été interrogé ; les conclusions base/RLS portent sur les migrations versionnées.
- Aucun appel Azure, Twilio ou Google Play réel n'a été effectué.
- Aucun compte authentifié réel, appareil Android physique, réseau lent ou technologie d'assistance n'a été utilisé.
- Les programmes scolaires officiels, droits/licences des annales et exigences juridiques par pays doivent être validés séparément avec les parties compétentes.
- Le worktree contenait déjà des fichiers non suivis dans `assets`, `output` et `tmp`; ils n'ont pas été modifiés.

## 11. Fichiers pivots

- `apps/revision/src/features/revision/RevisionDashboardPage.tsx`
- `apps/revision/src/features/revision/LearningAssignmentsPanel.tsx`
- `apps/revision/src/features/revision/LearningSolverPage.tsx`
- `apps/revision/src/features/revision/PedagogicalSupportsPage.tsx`
- `packages/revision-core/src/revisionDataService.ts`
- `packages/revision-core/src/learningService.ts`
- `packages/revision-core/src/types.ts`
- `apps/api/server/handlers/learning.mjs`
- `apps/api/server/handlers/revision-generate.mjs`
- `apps/api/server/handlers/revision-document-analyze.mjs`
- `apps/api/server/pedagogy/revision/service.mjs`
- `supabase/migrations/20260715100000_unified_revision_schema.sql`
- `supabase/migrations/20260719150000_learning_assignments.sql`
- `supabase/migrations/20261010140000_pedagogical_revision_delivery.sql`

