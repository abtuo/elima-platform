# Elima Store — Phase 2A : catalogue persistant

## Résultat

La Phase 2A remplace le catalogue TypeScript de production par un catalogue Supabase relationnel. Le catalogue de démonstration de la Phase 1 reste disponible uniquement en développement avec `STORE_CATALOG_MODE=demo`. En production, une base vide ou indisponible produit un état vide ou une erreur explicite ; aucune offre fictive n'est injectée.

Cette phase ne crée ni commande, ni paiement, ni réservation de stock, ni logistique, ni portail vendeur.

## Audit et choix d'architecture

Les composants visuels, la navigation, l'authentification Supabase, le panier local et les favoris de la Phase 1 sont conservés. Les données statiques ont été isolées comme fixtures de démonstration. Les pages serveur et les routes API consomment désormais une couche d'accès unique dans `apps/store/src/lib/catalog-repository.ts`.

Les tables historiques `store_products`, `store_packs` et associées appartiennent au périmètre Core School et restent inchangées. Le catalogue commercial utilise volontairement le préfixe `store_catalog_*` afin d'éviter toute collision et tout couplage implicite avec les établissements.

## Schéma de données

```text
store_sellers ──< store_catalog_products >── store_categories (parent_id récursif)
      │                    │
      └──< store_seller_users
                           ├──< store_product_variants ──< store_inventory_adjustments
                           ├──< store_product_images
                           └──< store_product_grades >── store_grade_levels ──< store_academic_series

store_grade_levels ──< store_catalog_kits >── store_academic_series
                              ├──< store_kit_images
                              └──< store_kit_items >── store_catalog_products
                                                   └── store_product_variants (optionnel)

auth.users ──< store_staff
```

Tables créées :

- `store_sellers` et `store_seller_users` préparent le futur multi-vendeur sans ouvrir de portail.
- `store_staff` sépare explicitement les rôles Store (`store_admin`, `catalog_manager`, `inventory_manager`) des administrateurs d'établissement.
- `store_categories` gère une hiérarchie libre.
- `store_catalog_products`, `store_product_variants` et `store_product_images` portent le catalogue, les SKU, les attributs JSON, les prix entiers XOF, les médias et la disponibilité.
- `store_grade_levels`, `store_academic_series` et `store_product_grades` modélisent les classes et les séries facultatives.
- `store_inventory_adjustments` trace chaque correction manuelle.
- `store_catalog_kits`, `store_kit_items` et `store_kit_images` représentent les kits et leur composition.

La migration canonique est `supabase/migrations/20261020120000_store_catalog_phase_2a.sql`. Elle est additive, reproductible et ne contient aucun faux prix commercial. Elle initialise seulement le vendeur interne, la taxonomie et les niveaux scolaires.

## Prix, disponibilité et kits

Les montants sont des entiers `bigint` et la devise est contrainte à `XOF`. Un prix promotionnel doit être inférieur au prix normal. Le prix de départ et l'indicateur de promotion d'un produit sont recalculés par trigger à partir de ses variantes actives.

La publication (`draft`, `active`, `archived`) est distincte de la disponibilité commerciale (`in_stock`, `available_on_order`, `out_of_stock`, `unavailable`). Une variante à zéro unité ne peut pas être marquée `in_stock`. L'ajustement atomique `adjust_store_inventory` verrouille la variante, interdit les stocks négatifs et journalise l'auteur, le motif et le résultat.

Un kit utilise une stratégie explicite :

- `fixed` : `fixed_price_amount` est obligatoire et constitue le prix public du kit ;
- `sum_components` : aucun prix n'est stocké sur le kit. Le prix devra être calculé au moment du panier à partir des variantes choisies. La Phase 2A l'affiche donc comme « prix calculé au panier » et n'active pas son achat.

La disponibilité du kit est déclarée explicitement par l'équipe Store et n'est pas déduite automatiquement de ses composants dans cette phase. Cela évite de simuler une réservation de stock qui n'existe pas encore.

## Sécurité et médias

RLS est activé sur toutes les nouvelles tables. Les rôles `anon` et `authenticated` ne lisent que les catégories actives, vendeurs actifs, produits et kits actifs avec une date de publication, ainsi que leurs relations publiables. Les brouillons restent invisibles.

Les écritures passent par `is_store_staff(...)` et sont limitées aux rôles Store appropriés. Aucun rôle scolaire n'accorde de privilège Store. Le navigateur utilise uniquement la clé anonyme Supabase ; aucune clé `service_role` n'est présente dans `apps/store`.

Le bucket privé `store-product-media` accepte JPEG, PNG, WebP et AVIF. Les politiques Storage autorisent la lecture d'un objet seulement lorsqu'il est référencé par un produit ou kit publié. `/api/catalogue/media` génère ensuite une URL signée courte. Les URL externes restent possibles pour des médias dont la licence et l'hébergement sont maîtrisés.

## Accès aux données et interfaces

La couche `catalog-repository.ts` expose : catégories, liste paginée, recherche plein texte, filtres catégorie/niveau/prix/promotion, tris, fiche par slug, produits associés, favoris par identifiants et kits. Les filtres, tris et fenêtres de pagination sont envoyés à Supabase ; le navigateur ne télécharge pas le catalogue complet.

Les index couvrent notamment statut/date, catégorie, vendeur, prix de départ, promotions, popularité, recherche GIN, niveaux, variantes, kits et historique de stock.

Routes HTTP :

- `GET /api/catalogue/products`
- `GET /api/catalogue/products/[slug]`
- `GET /api/catalogue/kits`
- `GET /api/catalogue/media?path=...`

La homepage, le catalogue, les fiches, les nouveautés, promotions, kits et favoris utilisent ces services. Le panier reste local, mais ses lignes contiennent désormais les identifiants produit et variante ainsi qu'un instantané d'affichage. Les anciennes lignes Phase 1 incompatibles sont écartées proprement au chargement.

## Configuration locale

1. Copier les variables utiles de `apps/store/.env.example` vers l'environnement local et renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Conserver `STORE_CATALOG_MODE=database` pour tester le comportement réel.
3. Générer le bundle SQL avec `npm run db:bundle`, puis appliquer les migrations sur une base locale selon le flux Supabase du dépôt (`npm run db:reset` pour une base locale jetable).
4. Démarrer avec `npm run dev:store`.
5. Pour revoir uniquement les fixtures UI, utiliser `STORE_CATALOG_MODE=demo` en développement. Cette valeur est ignorée en production.

La migration n'est pas appliquée automatiquement à la production.

## Phase 2B

Restent à réaliser : back-office CRUD, téléversement et classement des images, workflows de publication, gestion interactive des variantes/prix/stocks/kits, affectation des membres Store, calcul dynamique et personnalisation des kits, puis tests d'administration de bout en bout. Les commandes, paiements, réservations, livraisons et le portail vendeur restent hors du périmètre 2B tant qu'une phase dédiée ne les autorise pas.
