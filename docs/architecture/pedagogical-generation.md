# Génération pédagogique IA — Phase 3

## Périmètre et principes

Le moteur transforme une demande validée en bundle `@elima/pedagogy`, puis l’enregistre comme brouillon privé par le service de Phase 2. Il ne publie jamais automatiquement, ne projette rien vers `learning_*`, ne génère ni PDF ni interface et ne journalise pas les prompts ou contenus pédagogiques dans les événements techniques.

L’intégration réutilise `azureOpenAi.mjs` et `azureTransport.mjs`. Les clés restent exclusivement côté serveur.

## Pipeline durable

```text
Demande validée
      │
      ▼
 plan → contenu → exercices → corrigés → validation/réparation → brouillon privé
      └──────────── job persistant, verrou optimiste et reprise ─────────────┘
```

Chaque appel `process` exécute une seule étape. Cette décision tient compte du `maxDuration: 60` de l’API Vercel : aucune promesse n’est abandonnée après la réponse HTTP. Un futur ordonnanceur peut appeler le même endpoint grâce à l’idempotence et au verrou `lock_version`.

Étapes :

1. `plan` construit objectifs, sections, concepts, progression et barème;
2. `content` produit uniquement les blocs de cours canoniques;
3. `exercises` produit les questions et blocs d’activité sans réponses;
4. `corrections` produit séparément réponses, démarches, indices et rubriques;
5. `validate` assemble, applique Zod, règles métier et contrôles disciplinaires, puis effectue au plus deux réparations ciblées;
6. `persist` appelle `createResource` de Phase 2 avec une visibilité `private`.

## Contrat de demande

`PedagogicalGenerationRequestSchema`, dans `@elima/pedagogy`, limite notamment :

- 20 exercices;
- 480 minutes;
- 4 000 caractères de consignes;
- 8 références autorisées de 12 000 caractères d’extrait chacune;
- un barème maximal de 100 points.

Les valeurs par défaut ciblent une génération progressive, en français, avec huit exercices. Une répartition de difficulté fournie doit totaliser exactement le nombre d’exercices.

Les exemples de demandes sont dans `apps/api/server/pedagogy/generation/demos`. L’absence de référence vérifiée produit un contexte `curriculum_to_verify`; aucune source officielle ou URL n’est inventée.

## Azure OpenAI

Le client demande `response_format: json_schema` strict à partir des schémas Zod convertis en JSON Schema. Si le déploiement Azure refuse cette fonctionnalité, il retombe sur `json_object`, puis applique parsing JSON strict et validation Zod. Une sortie tronquée est refusée.

Les erreurs 408, 429 et fournisseur 5xx bénéficient d’au plus deux tentatives avec backoff. Les prompts sont versionnés par `pedagogy-generation-2026-10-v1`. Les extraits de référence sont explicitement traités comme données non fiables afin de réduire le risque d’injection.

## Validation et réparation

Outre les validateurs canoniques, le moteur vérifie :

- nombre exact d’exercices;
- total de points demandé;
- répartition de difficulté;
- unités des réponses numériques;
- substitution de certaines équations linéaires simples;
- légendes et traçabilité des documents scientifiques.

La réparation renvoie seulement des remplacements identifiés par ID. Un bloc non ciblé reste inchangé; l’ajout arbitraire d’un identifiant est rejeté. Après épuisement des tentatives, le job devient `failed` et conserve les erreurs de validation sans créer de ressource éditoriale.

L’absence d’erreur structurelle ne vaut jamais validation scientifique : les avertissements et le statut `pending_expert_review` sont conservés pour l’enseignant.

## Jobs, quotas et métriques

La migration `20261010130000_pedagogical_generation_jobs.sql` ajoute :

- `pedagogical_generation_jobs` : demande, étape, artefacts privés, verrou, reprise et résultat;
- `pedagogical_generation_usage` : compteurs quotidiens par enseignant et établissement;
- `pedagogical_ai_events` : modèle, déploiement, version de prompt, appels, tokens, durée, coût calculable et code d’erreur.

Plafonds MVP : 10 jobs par enseignant et par jour, 100 par établissement, 10 appels par job et 80 appels par enseignant et par jour. Ces quotas sont indépendants des quotas élèves Révision.

Le coût estimé est calculé uniquement si `AZURE_OPENAI_INPUT_COST_PER_MILLION` et `AZURE_OPENAI_OUTPUT_COST_PER_MILLION` sont configurés. Aucun secret, prompt complet ou contenu privé n’est écrit dans `pedagogical_ai_events`.

## API

`/api/pedagogical-generation` accepte :

- `POST action=submit`, avec `request` et header `Idempotency-Key`;
- `POST action=process`, pour avancer d’une étape;
- `POST action=cancel`, entre deux étapes;
- `POST action=retry`, après un échec relançable et dans la limite des tentatives;
- `GET generationId=…`, pour le statut; `includePrivate=true` restitue les artefacts uniquement au propriétaire ou à un administrateur du même établissement.

La soumission répond `202`. Les jobs appartiennent toujours à l’utilisateur authentifié et à sa membership active; un client ne choisit jamais librement l’établissement ou l’auteur.

## Cas de référence et limites

Les tests exécutent intégralement le pipeline avec un client IA simulé pour les chapitres Mathématiques 3e et SVT Terminale D. Ils valident respectivement huit exercices corrigés et une ressource scientifique avec tableaux, schémas, situation BAC et barème sur 20. Les fixtures de Phase 1 servent d’oracle de couverture; aucun appel Azure réel n’est effectué dans la suite standard.

L’annulation prend effet entre les étapes, pas pendant une requête Azure déjà engagée. Les contrôles mathématiques restent volontairement bornés aux cas déterministes simples; les faits scientifiques complexes exigent toujours une relecture humaine ou un futur référentiel vérifié. Aucun RAG n’est introduit.

