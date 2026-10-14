# Atelier pédagogique enseignant — Phase 4

## Intégration

L’atelier remplace la démonstration de la rubrique `Ressources` de Platform sans ajouter d’entrée de navigation principale. Il utilise le contexte enseignant existant pour proposer les matières et niveaux affectés, puis communique uniquement avec les API pédagogiques authentifiées des Phases 2 et 3.

La bibliothèque charge les ressources persistées avec recherche, filtres et pagination. Les écrans distinguent explicitement les états de chargement, d’absence de données, d’erreur et d’indisponibilité des migrations pédagogiques.

## Génération durable

Le contrôleur navigateur conserve au plus vingt identifiants de jobs dans le stockage local. Une soumission possède une clé d’idempotence et chaque itération effectue, dans cet ordre, une lecture d’état puis au plus un appel `process`. Il n’existe ni traitement concurrent d’un même job, ni pourcentage artificiel, ni promesse serverless détachée. Une pause réseau arrête la boucle; l’enseignant peut reprendre, annuler ou relancer selon l’état renvoyé par le serveur. Les réponses `409` et `429` déclenchent une nouvelle lecture après un délai respectueux de `Retry-After`.

## Rendu et confidentialité

`@elima/revision-ui` expose `PedagogicalRenderer`, commun à Platform et aux futures surfaces Révision. Il couvre tous les blocs `@elima/pedagogy`, réutilise `MarkdownContent`/KaTeX et n’interprète aucun HTML arbitraire. Les URI d’images sont limitées à HTTPS et aux chemins locaux. Les graphiques et schémas sans renderer spécialisé utilisent une représentation structurée, lisible et explicite.

Le passage en vue élève déclenche une requête sans `includePrivate`; le payload renvoyé est la projection serveur élève et ne contient aucun secret. La vue enseignant utilise séparément la projection privée autorisée. La dissimulation visuelle n’est donc jamais la frontière de sécurité.

## Édition, versions et validation

L’éditeur manipule le bundle canonique sous forme de blocs. Il propose l’édition immédiate des métadonnées, textes, formules, exemples, questions, options, barèmes et corrigés, ainsi que l’ajout, le retrait et le déplacement de blocs courants. Une validation Zod précède chaque sauvegarde. Le `lockVersion` reçu est renvoyé à l’API; un conflit `409` est présenté comme tel et n’est jamais assimilé à une réussite.

Une version publiée ou autrement immuable n’est pas modifiée : l’interface appelle la création de version de Phase 2. L’historique peut maintenant consulter une version précise via `GET /api/pedagogical-versions?versionId=…`, extension compatible couverte par les mêmes projections et contrôles d’autorisation que la ressource courante.

Le panneau de validation sépare erreurs, avertissements et résultat automatique, localise les blocs à partir des chemins canoniques et conserve la décision humaine comme action distincte. La publication disponible vise uniquement le canal API interne existant; aucune affectation Learning, publication Révision, distribution élève ou génération PDF n’est amorcée.

## Limites assumées

- Les éditeurs avancés de graphiques, schémas et grands tableaux restent en lecture structurée; leurs données sont conservées sans conversion destructive.
- La liste des jobs récents est locale car l’API Phase 3 ne fournit pas encore de route de liste par auteur.
- Les actions de Phase 5 ne sont ni affichées ni simulées.
- Aucune migration n’est appliquée automatiquement et aucun appel Azure n’est requis par les tests.
