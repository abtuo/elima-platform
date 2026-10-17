# `@elima/pedagogy`

Fondations pures du nouveau moteur pédagogique Elima. Le package ne dépend ni de React, ni de Next.js, ni de Supabase, ni d’un fournisseur IA.

## Responsabilités

- contrat canonique `PedagogicalResourceDocument`;
- schémas Zod stricts et types TypeScript associés;
- séparation entre document public et `PedagogicalResourceSecrets`;
- validation structurelle, métier et contrôles pédagogiques extensibles;
- projections élève, enseignant et imprimables;
- adaptation sans écriture vers les contrats actuellement compris par Learning;
- ressources de référence Mathématiques 3e et SVT Terminale D.

Le package ne rend pas les blocs, ne persiste rien et n’accorde aucune autorisation. Ces responsabilités appartiendront respectivement à `revision-ui`, aux services serveur et aux contrôles d’accès.

## Modèle canonique

Un bundle auteur contient deux objets indépendants :

```ts
type PedagogicalResourceBundle = {
  document: PedagogicalResourceDocument; // contenu public potentiel
  secrets: PedagogicalResourceSecrets;   // réponses, corrigés, indices, grilles
};
```

`PedagogicalResourceDocument` contient des métadonnées versionnées et une liste ordonnée de blocs discriminés. Le schéma `1.0.0` prend en charge :

- cours : `heading`, `rich_text`, `definition`, `callout`, `formula`, `worked_example`, `summary`;
- sciences/documents : `image`, `table`, `chart`, `diagram`, `document_analysis`;
- activités : `question`, `exercise_group`, `guided_activity`, `assessment`.

Le texte riche est du Markdown. Les formules utilisent du LaTeX. Aucun HTML n’est un format canonique.

Les questions définissent un contrat public de réponse et un mode de correction. La réponse attendue reste exclusivement dans la correction privée. Les types sont : QCM simple/multiple, vrai-faux, numérique, fraction, texte court/long, résolution par étapes, analyse de tableau, interprétation d’expérience et analyse de document scientifique.

## Validation

```ts
import { validatePedagogicalBundle } from "@elima/pedagogy";

const result = validatePedagogicalBundle(input);
if (!result.success) console.error(result.errors);
```

Les erreurs portent un niveau, un code stable, un chemin et un message. La validation est organisée ainsi :

1. **structurelle** : Zod strict, types, bornes et formats;
2. **métier** : identifiants uniques, références, correspondance question/réponse, barèmes, tables, graphiques, LaTeX et présence des corrigés;
3. **pédagogique/scientifique** : avertissements par défaut et fonctions de contrôle injectables (`PedagogicalCheck`).

Le contrôle LaTeX inclus détecte les déséquilibres et commandes dangereuses évidentes. Il ne remplace pas un parseur/rendu KaTeX ni une validation mathématique experte.

## Projections

- `projectStudentView` : document public uniquement;
- `projectTeacherView` : document et secrets;
- `projectPrintableStudentView` : document public et options d’espace de réponse;
- `projectPrintableTeacherView` : document, secrets et options de grille/commentaires.

Ces fonctions valident d’abord le bundle et empêchent la présence de champs privés dans le document public. Elles ne constituent pas un mécanisme d’autorisation : le serveur devra vérifier le rôle, le tenant et la politique de diffusion avant de les appeler.

## Compatibilité Learning

`adaptResourceToLearning` ne touche ni l’API ni la base. Il produit deux contrats séparés :

- `publicQuestion`, compatible avec les champs publics de `learning_questions`;
- `privateQuestion`, destiné aux secrets, indices et étapes de solution côté serveur.

Compatibilité initiale :

| Type canonique | Learning | Statut |
|---|---|---|
| `single_choice` | `choice` | pris en charge |
| `multiple_choice` | `multiple_choice` | pris en charge |
| `true_false` | `boolean` | pris en charge |
| `numeric` | `numeric` | pris en charge |
| `fraction` | `rational` | pris en charge |
| `step_resolution` | `math_expression` + validation `semantic` | pris en charge, évaluation assistée |
| autres types | — | explicitement signalés dans `unsupported` |

Les formats scientifiques ne sont pas aplatis artificiellement vers un ancien type.

## Persistance serveur

La Phase 2 conserve le package indépendant de Supabase. Le backend et le cycle de vie sont documentés dans `docs/architecture/pedagogical-backend.md`. La persistance stocke le document public et les secrets dans des tables distinctes, puis appelle les validateurs et projections de ce package à la frontière serveur.

Le contrat pur `PedagogicalGenerationRequestSchema` borne les demandes de génération de la Phase 3 sans introduire Azure ou Supabase dans ce package. Le pipeline serveur est décrit dans `docs/architecture/pedagogical-generation.md`.

## Ressources de référence

- `resources/mathematiques-3e-equations-premier-degre.json`;
- `resources/svt-terminale-d-tissu-nerveux.json`.

Elles sont marquées `pending_expert_review`; les références de programme ivoirien restent `unverified`. Elles servent de démonstrateurs techniques et de fixtures, pas de contenus officiels prêts à publier.

## Commandes

```bash
npm run typecheck --workspace @elima/pedagogy
npm test --workspace @elima/pedagogy
```
