# Assistant pédagogique IA - recette de préparation au pilote

Date de recette : 11 octobre 2026  
Périmètre : Phases 1 à 7, dépôt local, données synthétiques uniquement.  
Décision : **GO sous conditions pour l'étape A interne uniquement. NO-GO pour les étapes B et C à ce stade.**

Cette décision ne vaut ni validation Azure réelle, ni validation du schéma Supabase distant, ni conformité officielle au programme ivoirien. Aucune migration distante, aucun déploiement, aucun push et aucun appel Azure payant n'ont été effectués.

## Synthèse exécutive

- **Réussi.** Suite locale complète avant corrections : 300 tests sur 300.
- **Réussi.** Suite locale complète après corrections : 303 tests sur 303.
- **Réussi.** Migrations pédagogiques exécutées dans PostgreSQL isolé PGlite, dans l'ordre Phase 2, Phase 3, Phase 5.
- **Réussi.** Tests ciblés après corrections : 31 sur 31.
- **Réussi.** Typage complet du monorepo.
- **Réussi.** Quatre PDF régénérés, 18 pages rendues et inspectées visuellement : fractions LaTeX proportionnées, tableaux, graphiques, schémas, pagination et marges lisibles.
- **Réussi.** L'avis critique Next.js détecté par `npm audit` a été supprimé par passage de 16.2.0 à 16.4.0.
- **Bloqué.** Validation sur le Supabase cible : accès et autorisation absents.
- **Non exécuté.** Azure réel : secrets, autorisation et budget plafonné absents.
- **Non exécuté.** Android physique, réseau lent réel et audit d'accessibilité assistive : matériel/session indisponibles.
- **Échoué.** Audit de dépendances après correction : 33 avis restent ouverts (5 faibles, 12 modérés, 16 élevés), dont `xlsx` sans correctif npm déclaré.

## Matrice de recette

| Contrôle | Statut | Preuve / résultat |
|---|---|---|
| Schémas et projections pédagogiques | Réussi. | Fixtures Mathématiques et SVT validées; projection élève sans secrets. |
| Migration Phase 2 | Réussi. | Exécution PGlite; RLS, tables de secrets, immutabilité publiée. |
| Migration Phase 3 | Réussi. | Exécution PGlite; jobs, quotas et télémétrie créés. |
| Migration Phase 5 | Réussi. | Exécution PGlite après Phase 2; tables Learning historiques intactes. |
| Compatibilité schéma distant | Bloqué. | Aucun accès en lecture au projet Supabase cible. |
| Authentification enseignant | Réussi. | Contrats et tests auth locaux; membership active obligatoire. |
| Génération structurée simulée | Réussi. | Pipeline par étapes, reprise, idempotence, réparation et quotas testés. |
| Génération Azure réelle | Non exécuté. | Garde-fou live préparé; aucune clé/budget autorisé. |
| Brouillon, édition, verrou optimiste | Réussi. | Conflit 409 et version courante couverts. |
| Validation automatique et humaine | Réussi. | Auto-validation préalable et auto-relecture interdite. |
| Publication | Réussi. | Paramètres et publication rendus atomiques en Phase 7. |
| Affectation classe | Réussi. | Relation enseignant-classe requise. |
| Affectation élève | Réussi. | Correction Phase 7 : relation à la classe active de l'élève requise. |
| Consultation élève | Réussi. | Affectation, inscription, tenant, canal, état et dates revérifiés. |
| Tentatives et résultats | Réussi. | Idempotence, limite de tentatives, correction déterministe et suivi. |
| Retrait | Réussi. | Les nouveaux accès sont bloqués; les tentatives restent conservées. |
| Export PDF élève/enseignant | Réussi. | 4 fichiers, 18 pages, projections distinctes et contrôle visuel. |
| Web Platform / Révision | Réussi. | Builds/tests automatisés; composants responsifs contrôlés par sources. |
| Navigation réelle avec compte pilote | Non exécuté. | Aucun environnement authentifié isolé disponible. |
| Android automatisé | Réussi. | Bundle local, SDK 36, stockage/session/réseau et bouton Retour couverts. |
| Android physique modeste | Non exécuté. | Aucun appareil ni ferme de test autorisée. |
| Accessibilité clavier/lecteur d'écran | Non exécuté. | Contrôles ARIA statiques présents; recette humaine requise. |
| Non-régression historique | Réussi. | 300 tests initiaux, puis 303 tests finaux après corrections : Learning, quiz, sessions guidées, examens, Scanner, quotas, auth et portails. |
| Typage | Réussi. | `npm run typecheck`. |
| Lint | Réussi. | Erreur produit corrigée; avertissements historiques documentés. |
| Audit npm critique | Réussi. | Plus aucun avis critique après Next.js 16.4.0. |
| Audit npm global | Échoué. | 33 avis résiduels, dont 16 élevés. |

## Bilan multi-tenant et confidentialité

| Scénario | Statut | Conclusion |
|---|---|---|
| Lecture inter-établissements | Réussi. | Réponse 404 logique; `school_id` contrôlé côté service. |
| Membership inactive | Réussi. | Refus par `requireStaffActor`; inscription élève active revérifiée. |
| Élève sur routes d'édition | Réussi. | Rôle staff obligatoire. |
| Secret/corrigé dans projection élève | Réussi. | Aucun marqueur `secrets`, `answerKey`, `correctionMarkdown` ou `privateContent`. |
| PDF enseignant par élève | Réussi. | Audience enseignant refusée. |
| Version non publiée | Réussi. | Livraison élève limitée aux publications actives/planifiées et affectées. |
| Publication retirée | Réussi. | Retrait retiré de la liste autorisée à chaque requête. |
| Fenêtre temporelle | Réussi. | `available_from` et `available_until` appliqués côté serveur. |
| Limite de tentatives | Réussi. | Erreur stable `attempt_limit_reached`. |
| Corrigés différés | Réussi. | Politique calculée côté serveur; `teacher_only` et `never` ne révèlent rien. |
| RLS tables pédagogiques | Réussi. | RLS activée; secrets révoqués à `authenticated`; écritures serveur. |
| `service_role` côté client | Réussi. | Aucun secret serveur dans les packages client; API seule. |
| Déconnexion et caches réels | Non exécuté. | Cycle de logout testé en unité; navigateur réel à confirmer. |
| URL privée temporaire | Non exécuté. | Aucun stockage PDF ni URL signée n'est utilisé actuellement. |

Point résiduel : le plan `ai_import` masque désormais l'atelier via le mécanisme existant, mais l'API pédagogique ne vérifie pas encore le plan commercial. Avant l'étape B, ajouter un contrôle serveur ou une allowlist d'établissements; le masquage UI seul ne constitue pas une frontière de sécurité.

## Azure : vérifié et restant

**Réussi.** En local simulé : JSON Schema strict avec repli `json_object`, parsing strict, sorties tronquées refusées, erreurs 408/429/5xx reprises, télémétrie tokens/coût, quotas par job/utilisateur/établissement, reprise bornée et absence de persistance après échec.

**Réussi.** Une suite live distincte est fournie par `npm run test:pedagogy:azure-live --workspace=@elima/api`. Elle refuse de démarrer sans `ELIMA_ALLOW_PAID_AZURE_TESTS=true`, tarifs configurés et `PEDAGOGICAL_AZURE_LIVE_MAX_COST` positif. Le garde-fou a été testé avec l'autorisation forcée à `false`.

**Non exécuté.** Appels Azure réels, modèle/déploiement réels, qualité des réponses, temps fournisseur, tokens et coût réels, quotas Azure et reprise réseau réelle. L'étape `plan` des deux démonstrateurs est prête; le pipeline live complet doit ensuite être exécuté dans une session plafonnée et observée.

## Qualité pédagogique des démonstrateurs

### Mathématiques 3e - équations du premier degré

- **Réussi.** Schéma, objectifs, méthodes, progressivité, huit exercices, réponses numériques, solutions et barème technique.
- **Réussi.** Formule principale composée par MathJax; fraction lisible et proportionnée dans le PDF.
- **Réussi.** Interaction fermée corrigée par le validateur déterministe Learning.
- **Non exécuté.** Validation par un enseignant ivoirien et rapprochement documentaire avec le programme officiel.

### SVT Terminale D - tissu nerveux

- **Réussi.** Définitions, tableau expérimental, données/unités, graphique, diagrammes, situations-problèmes, corrigés et barèmes présents et cohérents structurellement.
- **Réussi.** Les réponses ouvertes restent `pending_review`; aucune pseudo-correction automatique.
- **Non exécuté.** Validation scientifique et curriculaire par un expert habilité.

Les références des démonstrateurs restent `unverified`. Le bandeau de validation enseignant doit être conservé.

## Mesures locales de performance

Machine de recette : Node 24.18.0, Windows x64. Mesures reproductibles avec `npm run audit:pedagogy:performance --workspace=@elima/api`.

| Opération | Statut | Médiane | p95 / maximum observé |
|---|---|---:|---:|
| Validation bundle SVT, 30 itérations | Réussi. | 0,67 ms | 2,66 ms / 28,78 ms |
| Projection élève, 100 itérations | Réussi. | 0,35 ms | 1,08 ms / 5,82 ms |
| PDF SVT élève, 3 itérations | Réussi. | 129,76 ms | 173,56 ms |
| PDF SVT enseignant, 3 itérations | Réussi. | 126,13 ms | 130,01 ms |
| PDF enseignant brut | Réussi. | 174 881 octets | base64 233 176 octets |
| Surcharge base64 | Réussi. | 33,33 % | conforme à l'attendu |
| Mémoire en fin de benchmark | Réussi. | RSS 164,87 MiB | heap 41,98 MiB |
| Latence Supabase distante | Non exécuté. | - | cible indisponible |
| Génération IA complète | Non exécuté. | - | Azure non autorisé |
| Charge concurrente serverless | Non exécuté. | - | environnement cible indisponible |

Seuils proposés avant pilote : API hors IA p95 < 800 ms, ouverture support p95 < 1,5 s sur réseau pilote, enregistrement réponse p95 < 1 s, PDF p95 < 5 s et < 5 MiB brut, fonction < 45 s, taux d'échec IA < 5 %, coût moyen à valider et plafonner contractuellement avant l'étape B. Les PDF dépassant 5 MiB doivent passer par un job et stockage privé plutôt que JSON base64.

## Anomalies et corrections Phase 7

1. **Important - corrigé.** Affectation directe à un élève insuffisamment bornée. Cause : contrôle enseignant-classe appliqué uniquement aux cibles `class`. Correction : recherche de l'inscription active de l'élève et réutilisation du contrôle de classe. Test ajouté.
2. **Important - corrigé.** Publication et paramètres Révision non atomiques. Cause : RPC Phase 2 suivie d'un `UPDATE`. Correction : RPC Phase 5 étendue et transactionnelle. Test ajouté.
3. **Secondaire - corrigé.** Ternaire à effets de bord dans le lecteur de choix multiples. Correction explicite `if/else`; lint de non-régression.
4. **Bloquant - corrigé localement.** Next.js 16.2.0 sous avis critique. Passage à 16.4.0; aucun avis critique restant.
5. **Important - ouvert.** 33 avis npm résiduels, dont 16 élevés et `xlsx` sans correctif npm. Responsable proposé : lead technique/sécurité; analyser l'exploitabilité et remplacer/isoler `xlsx` avant exposition pilote.
6. **Important - ouvert.** Quota établissement calculé par somme sans verrou global entre utilisateurs concurrents. Responsable : backend/DB; ajouter un compteur journalier établissement atomique avant montée en charge.
7. **Important - ouvert.** Observabilité incomplète pour erreurs d'affectation, correction et export PDF. Responsable : backend/SRE; ajouter événements structurés sans contenu pédagogique.

## Observabilité

- **Réussi.** Jobs, étapes, échecs, modèle, déploiement, tokens, durée et coût sont persistés sans prompt ni corrigé.
- **Réussi.** Publications et changements de versions ont des événements métier.
- **Échoué.** Les échecs d'export PDF, d'affectation et de correction n'ont pas de compteur/événement durable dédié.
- **Non exécuté.** Alertes et tableaux de bord de l'environnement cible.

Minimum avant étape B : corrélation `request_id`, métriques succès/échec/latence par endpoint, compteur de quotas, alerte job bloqué > 10 min, taux d'échec Azure, coût journalier, aucun payload de réponse ni corrigé dans les logs.

## Risques priorisés et responsables

### Bloquants pour B/C

- Supabase distant non audité et migrations non répétées en préproduction - responsable : DBA/lead backend.
- Azure réel et budget non validés - responsable : responsable IA/finance.
- Avis npm élevés non triés, dont `xlsx` - responsable : sécurité/lead technique.
- Feature flag non imposé côté API - responsable : backend/produit.

### Importants

- Quota établissement concurrent non strictement sérialisé - backend/DB.
- Observabilité partielle et absence d'alertes - SRE/backend.
- Tests navigateur authentifiés, réseau lent et Android physique manquants - QA/mobile.
- Validation pédagogique/curriculaire manquante - référent pédagogique.

### Secondaires

- Base64 PDF +33,33 %; acceptable sur démos, à surveiller sur longues fiches.
- Images privées distantes non résolues; publication bloquée si asset absent.
- Avertissements lint historiques sur hooks Scanner et scripts d'import.

## Stratégie pilote et indicateurs

- Étape A : plan `custom`/feature `ai_import`, comptes synthétiques internes, aucune classe réelle. **GO sous conditions** après préproduction et audit des dépendances.
- Étape B : allowlist serveur d'enseignants/établissements, plafond Azure journalier, validation humaine obligatoire. **NO-GO actuel.**
- Étape C : quelques classes consenties, support et retrait testés, aucun contenu non validé. **NO-GO actuel.**
- Étape D : extension seulement après deux semaines stables et revue des KPI.

KPI : enseignants actifs, supports générés/validés, échecs IA, durée de préparation, coût/support, élèves actifs, complétion, satisfaction, incidents, fuites de corrigé (objectif zéro), p95 API/PDF et jobs bloqués.

## Checklist décisionnelle

- **Réussi.** Tests locaux, typage, lint, builds unitaires et PDF.
- **Réussi.** Correctifs multi-tenant et publication atomique.
- **Bloqué.** Sauvegarde et répétition en préproduction.
- **Non exécuté.** Azure réel plafonné.
- **Non exécuté.** Smoke tests authentifiés Web/Android sur cible.
- **Échoué.** Seuil de dépendances : 16 avis élevés restent à traiter/accepter formellement.
- **Non exécuté.** Validation pédagogique par enseignants testeurs.

Conclusion : la base locale est suffisamment robuste pour préparer l'étape A, mais les preuves critiques d'environnement réel manquent. Ne pas ouvrir l'Assistant aux enseignants ou élèves pilotes avant clôture des quatre blocages B/C.
