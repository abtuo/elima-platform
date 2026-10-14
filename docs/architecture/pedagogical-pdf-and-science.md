# Export PDF pédagogique et contenus scientifiques

## Décision d’architecture

La Phase 6 utilise `pdf-lib` côté API. Ce choix évite un navigateur Chromium dans les fonctions Node/Vercel et garde les corrigés hors du navigateur. Le service compose directement un document A4 depuis les projections imprimables de `@elima/pedagogy`. Les blocs de formule sont composés par MathJax 4 depuis leur LaTeX canonique, convertis en SVG puis rasterisés localement par Resvg avant leur incorporation au PDF; les fractions, opérateurs et symboles conservent ainsi une vraie mise en page mathématique.

Les deux PDF ne sont pas des documents indépendants : `student_print` contient uniquement le document public, tandis que `teacher_print` ajoute les secrets autorisés. L’endpoint exige une version UUID précise et repasse par les contrôles d’établissement, d’auteur et de rôle du service pédagogique. La réponse est générée à la demande, sans bucket public ni URL permanente.

## Flux

1. L’atelier demande `student` ou `teacher` pour un `versionId` précis.
2. L’API authentifie l’utilisateur et résout son acteur pédagogique.
3. Le service charge la version avec ou sans contenu privé selon l’audience.
4. La projection canonique autorisée est validée.
5. Le compositeur PDF produit les octets, les métadonnées neutres, le hash SHA-256 et un nom sûr.
6. L’atelier ouvre une prévisualisation locale via une URL Blob éphémère, ou télécharge le fichier.

## Rendu scientifique partagé

`packages/pedagogy/src/scientific.ts` calcule une géométrie pure et déterministe pour les graphiques et schémas. Les composants SVG de `@elima/revision-ui` et le compositeur PDF consomment cette même géométrie. Les données restent du JSON validé, sans HTML ni JavaScript injecté.

Les graphiques gèrent axes, unités, graduations, séries multiples, courbes, barres et nuages de points. Les schémas affichent les nœuds, connexions, repères, annotations, texte alternatif et références. L’atelier modifie les données structurées avec le verrouillage optimiste existant. Une image sans URI autorisée reste enregistrable en brouillon, déclenche un avertissement et bloque la publication.

## Sécurité

- La projection élève est construite sans demander les secrets au dépôt.
- La projection enseignant dépend de l’autorisation privée existante.
- Aucun corrigé n’est placé dans le HTML ou le bundle de l’aperçu élève.
- Les métadonnées PDF ne contiennent que titre, matière, niveau et identité Elima.
- Aucun fichier privé n’est persisté par l’endpoint et aucun lien public n’est créé.
- Les tests injectent un générateur espion pour contrôler exactement la projection transmise avant sérialisation.

## Limites de production

- La réponse JSON en base64 ajoute environ 33 % de volume. Pour des supports très volumineux, une évolution pourra employer un job durable et un stockage privé avec URL signée courte.
- Les formules dédiées bénéficient du rendu MathJax complet. Les petites expressions LaTeX incluses au milieu d’un paragraphe restent converties en notation textuelle sûre dans le PDF; le Web continue à les rendre avec KaTeX.
- Les URI d’images distantes ne sont volontairement pas téléchargées par le service afin d’éviter SSRF et fuite de jetons. Une future résolution d’assets devra accepter uniquement des identifiants privés contrôlés et fournir les octets après autorisation.
- Les références scientifiques de démonstration restent marquées `unverified`; le PDF et l’atelier conservent cet avertissement.

## Démonstrateurs et vérification

`npm run demo:pdf --workspace=@elima/api` produit quatre fichiers dans `output/pdf/` pour Mathématiques 3e et SVT Terminale D. Les PDF doivent être rendus en images avec Poppler avant livraison afin de vérifier pagination, débordements, tableaux, graphique et schémas.
