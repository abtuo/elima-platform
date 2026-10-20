# Elima Store — Phase 2C : catalogue initial et import en masse

## Résultat

La Phase 2C ajoute un assistant d’import CSV/XLSX à `/admin/produits/importer`, un classeur Excel à sept onglets, 100 références candidates, 15 kits candidats et un tableau de qualité à `/admin/qualite`. Aucun produit candidat n’est inséré ou publié automatiquement. Aucune commande, aucun paiement et aucun déploiement ne font partie de cette phase.

La migration additive canonique est `supabase/migrations/20261020140000_store_catalog_import_phase_2c.sql`. Elle n’est pas appliquée automatiquement à une base distante ou à la production.

## Parcours d’import

1. Ouvrir **Administration > Produits > Importer des produits**.
2. Télécharger `modele-catalogue-elima.xlsx` depuis l’assistant.
3. Compléter les données réelles, en particulier prix public, stock et disponibilité. Les cellules commerciales du catalogue candidat sont volontairement vides.
4. Téléverser un `.csv` ou `.xlsx` de 5 Mo maximum et 500 lignes maximum.
5. Vérifier la lecture, la correspondance des colonnes, l’aperçu et les erreurs.
6. Choisir explicitement la stratégie pour les SKU existants : **ignorer** ou **mettre à jour**.
7. Confirmer l’import et conserver l’identifiant du rapport.
8. Corriger les alertes de `/admin/qualite`, puis publier individuellement les références validées.

Les fichiers XLSX utilisent les onglets `Instructions`, `Produits`, `Variantes`, `Catégories`, `Compatibilités scolaires`, `Kits` et `Composition des kits`. Un CSV représente une ligne par variante et utilise les colonnes associées dans l’étape 3.

## Sécurité et intégrité

- Les routes de modèle, prévisualisation et confirmation exigent un rôle `store_admin` ou `catalog_manager`. Elles utilisent la session Supabase de l’utilisateur et les politiques RLS existantes, jamais une clé `service_role`.
- Les extensions, tailles, colonnes, nombres entiers, statuts, disponibilités, niveaux, images et compositions sont validés côté serveur. Les formules sont refusées et les chaînes dangereuses sont neutralisées lors des exports tableur.
- Le fichier est relu lors de la confirmation et son empreinte SHA-256 est journalisée. `store_catalog_imports` et `store_catalog_import_rows` conservent auteur, stratégie, actions, erreurs et résultat.
- Les mises à jour de stock passent par `adjust_store_inventory` et créent un mouvement d’inventaire. Les prix et stocks ne sont modifiés que lorsque la stratégie `update` a été explicitement confirmée.
- Les coûts d’achat sont stockés dans `store_variant_commercial_costs`, table privée sans droit `anon`. Ils ne sont jamais ajoutés aux lignes de variantes publiquement lisibles.
- Toutes les créations de produits et de kits restent en statut `draft`. Une valeur `active` présente dans un fichier est ignorée et signalée.
- Les références image acceptées sont un chemin maîtrisé du bucket `products/` ou une URL HTTPS. L’import ne télécharge et ne copie aucune image tierce.

## Catalogue candidat

`apps/store/src/data/initial-catalog.ts` contient exactement 100 références génériques couvrant cahiers et papiers, écriture, géométrie, calculatrices, dessin, classement, sacs, trousses, manuels et annales. Les niveaux vont du CP1 à la Terminale. Les références `CAND-001` à `CAND-100` sont des identifiants de travail remplaçables avant validation.

Le même fichier contient 15 kits génériques couvrant primaire, collège, lycée, géométrie, écriture, dessin et préparation aux examens. Leurs compositions réutilisent les SKU candidats ; elles ne dupliquent pas les produits. Les noms et descriptions ne revendiquent aucune approbation officielle d’un établissement.

Il n’existe dans ces données candidates aucune marque, aucun prix, coût fournisseur, stock, remise, disponibilité commerciale ou image inventés. Le classeur les laisse explicitement vides afin d’obliger leur qualification avant import.

## Contrôle qualité et préparation commerciale

Le rapport `store_catalog_quality_report()` identifie les produits sans image, sans prix/variante valide, sans approvisionnement validé, les kits sans composition, les SKU dupliqués et les incohérences publiées. L’absence de catégorie, de disponibilité ou de prix sur une variante est également bloquée par les contraintes relationnelles `NOT NULL`, clés étrangères et contrôles existants ; ces cas ne peuvent donc pas être enregistrés silencieusement.

La préparation commerciale réutilise les états existants :

| Lecture métier | Statut et disponibilité |
| --- | --- |
| Référence en préparation | `draft` |
| Produit prêt à publier | `draft` sans alerte de qualité |
| Publié mais non achetable | `active` + `unavailable` ou `out_of_stock` |
| Disponible à la vente | `active` + `in_stock` ou `available_on_order`, avec prix et variante valides |

La publication reste une action individuelle contrôlée par `set_store_product_publication`. Le catalogue public continue de masquer tous les brouillons.

## Informations commerciales restant à renseigner

- SKU définitif si les références candidates ne sont pas conservées ;
- marque réelle et autorisée, le cas échéant ;
- variante/conditionnement exact ;
- prix public FCFA et éventuel prix promotionnel validé ;
- coût d’achat facultatif et confidentiel ;
- quantité réellement disponible et seuil de stock faible ;
- disponibilité et conditions d’approvisionnement ;
- photographie originale ou fournie avec droits d’utilisation, texte alternatif et images secondaires ;
- édition et droits des manuels/annales ;
- prix commercial des kits, après validation de tous les composants ;
- compatibilités de classes et séries à confirmer par l’équipe catalogue.

## Validation attendue

Exécuter depuis la racine :

```text
npm run lint --workspace @elima/store
npm run typecheck --workspace @elima/store
npm run test --workspace @elima/store
node --import tsx --test tests/api/store-admin.test.ts tests/api/store-catalog.test.ts
npm run db:bundle
npm run build --workspace @elima/store
```

Les tests couvrent CSV, XLSX, colonnes, erreurs, formules, SKU dupliqués, niveaux scolaires, 100 références, 15 kits, autorisations, RLS, journal d’import, coûts privés, qualité et invisibilité publique des brouillons.
