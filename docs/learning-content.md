# Contenus pédagogiques — Devoirs

## Installation

1. Appliquer uniquement la migration incrémentale avec `npm run db:migrate:learning`. Ne pas rejouer `npm run db:migrate` sur une base déjà initialisée : cette commande est réservée au premier déploiement du schéma unifié.
2. Appliquer la migration de découverte et d’évaluation GPT avec `npm run db:migrate:learning-ai`.
2. Placer les sources dans `data/exams/`. L’import cherche d’abord les noms contractuels :
   - `bac-france-2026-maths-j1.json`
   - `bac-ci-2026-maths-serie-c.json`
   - `terminale-c-demo-bank.json`
3. Les noms actuellement fournis (`elima_…_correction_interactive.json`) sont aussi reconnus automatiquement.
4. Lancer `npm run import:learning-content`. La commande utilise `SUPABASE_DB_URL`, travaille dans une transaction et fait des upserts par identifiant externe.

## PDF originaux

La migration crée le bucket privé `exam-sources`. Charger les fichiers aux chemins suivants :

- `france/bac-2026-mathematiques-jour-1.pdf`
- `cote-divoire/bac-2026-mathematiques-serie-c.pdf`

L’API `/api/learning` produit une URL signée valable cinq minutes. Le bucket ne doit jamais être rendu public.

## Vérification fonctionnelle

- Ouvrir `/student/reviser?mode=devoirs` avec un profil Terminale C.
- Choisir la matière, le type puis le chapitre. L’appel initial ne renvoie que les filtres ; une proposition est chargée avec `suggest`, puis les questions avec `content` uniquement à l’ouverture.
- Vérifier que « Sujet d’examen » est visible et que ses chapitres sont limités à ceux réellement présents dans un sujet compatible.
- Commencer un exercice guidé, répondre, choisir un niveau de confiance, demander successivement deux indices et terminer le bilan.
- Lancer un sujet en « Conditions d’examen » : les aides restent masquées avant la remise, le chronomètre et la reprise sont actifs.
- Lancer le même sujet en « Entraînement accompagné » pour valider question par question.
- Avec un niveau dont `learning_levels.is_exam_level` vaut `false`, le sous-onglet « Sujets d’examen » doit disparaître sans laisser d’espace vide.
- En mode démo local, utiliser l’élève Kader (Terminale C).

## Validation et limites

Les validateurs `numeric`, `integer`, `rational`, `boolean` et `choice` restent déterministes. Ils acceptent notamment virgule/point, tolérances et fractions équivalentes. Pour les réponses ouvertes, démonstrations, expressions et démarches en plusieurs étapes, Azure OpenAI intervient ensuite côté serveur et renvoie `validator: gpt_assisted`, un statut, un score borné, les points corrects et un feedback par étape. Le déploiement est fourni par `AZURE_OPENAI_DEPLOYMENT`; aucune clé IA n’est exposée au navigateur.

Les évaluations GPT authentifiées sont journalisées dans `learning_ai_evaluations`. Cette table est lisible uniquement par l’élève propriétaire et inscriptible uniquement côté serveur. GPT ne remplace pas le calcul déterministe et ne peut jamais rendre les réponses attendues ou la correction complète dans son feedback.

Les réponses attendues, validateurs secrets, indices et corrections restent dans des tables sans droit direct pour `authenticated`. Ils sont servis uniquement par l’API après contrôle de la tentative. Les PDF doivent être chargés manuellement dans Storage.
