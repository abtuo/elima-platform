# Elima Store — Phase 2B : back-office catalogue

## Résultat

Le back-office est intégré à `apps/store` sous `/admin`. Il utilise la même session Supabase que la boutique et toutes les écritures sont exécutées avec le jeton de l'utilisateur connecté. Aucune clé `service_role` n'est envoyée au navigateur ou utilisée par les routes Store.

La migration `20261020130000_store_catalog_admin_phase_2b.sql` est additive et n'a pas été appliquée à la production.

## Architecture

```text
Pages serveur /admin
        │ vérification auth.users + store_staff
        ▼
Composants interactifs ciblés
        │ HTTPS, validation serveur
        ▼
Route Handlers /api/admin/*
        │ session Supabase de l'utilisateur
        ▼
RLS + fonctions PostgreSQL contrôlées
        │
        ├── catalogue relationnel
        ├── adjust_store_inventory (atomique)
        └── bucket privé store-product-media
```

Les pages restent des Server Components pour les lectures. Les éditeurs, confirmations, uploads et ajustements sont des Client Components limités à leurs zones interactives.

## Pages

- `/admin` : indicateurs réels et actions à effectuer.
- `/admin/produits` : recherche nom/SKU, filtres, pagination, statuts et actions rapides.
- `/admin/produits/nouveau` et `/admin/produits/[id]` : produit, variantes, prix, promotions, disponibilité, classes et médias.
- `/admin/categories` : hiérarchie, ordre, activation et nombre de produits.
- `/admin/kits`, `/admin/kits/nouveau` et `/admin/kits/[id]` : composition, variantes, quantités, image, classe, prix des composants et écart.
- `/admin/stocks` : stock, seuils, disponibilité, ajustement atomique et historique.
- `/admin/promotions` : prix réduit, début, fin et état courant.

L'interface fournit une navigation responsive, des états vides, des messages d'erreur et des confirmations pour la publication, la dépublication, l'archivage, la suppression d'image et les mouvements de stock.

## Modèle et règles ajoutés

La migration ajoute aux variantes :

- `low_stock_threshold` ;
- `promotion_starts_at` ;
- `promotion_ends_at` ;
- contraintes sur le seuil, le prix et la période promotionnelle ;
- index de stock faible et de promotions.

Elle ajoute également :

- un trigger empêchant les cycles de catégories ;
- `set_store_product_publication`, qui vérifie le rôle, la catégorie et l'existence d'une variante active valide ;
- `store_admin_dashboard`, qui calcule les indicateurs sans statistiques commerciales fictives ;
- `store_admin_products`, qui applique recherche, filtres, tri et pagination en base ;
- la lecture des médias brouillons pour le personnel catalogue ;
- la lecture produits/variantes nécessaire au rôle inventaire.

Le catalogue public tient compte des dates de promotion. Une promotion future ou expirée n'est pas utilisée comme prix public.

## Médias

Les images JPEG, PNG, WebP et AVIF sont limitées à 8 Mo et stockées dans le bucket privé existant. Les routes d'administration permettent l'import, la prévisualisation signée, le texte alternatif, l'ordre, l'image principale et la suppression. En cas d'échec de l'enregistrement SQL après un upload, l'objet est supprimé du bucket.

## Permissions

| Rôle | Accès |
| --- | --- |
| `store_admin` | Catalogue, catégories, kits, promotions et stocks |
| `catalog_manager` | Catalogue, catégories, kits, promotions et médias |
| `inventory_manager` | Tableau de bord, stocks et historique |

Un client, un parent Core School ou un administrateur scolaire sans ligne active dans `store_staff` est refusé côté serveur et par RLS. Le masquage de navigation n'est jamais le seul contrôle.

## Accès administrateur local

1. Appliquer les migrations sur une base locale ou de staging avec le flux Supabase du dépôt. Ne pas utiliser la commande de production.
2. Se connecter une première fois à Store avec le compte Elima concerné afin que son identité existe dans `auth.users`.
3. Depuis un contexte de confiance (éditeur SQL Supabase ou procédure d'exploitation), ajouter explicitement le rôle :

```sql
insert into public.store_staff (user_id, role, status)
values ('<auth.users.id>', 'store_admin', 'active')
on conflict (user_id) do update set role = excluded.role, status = 'active';
```

4. Ouvrir `/admin`. Un compte non connecté est redirigé vers `/connexion?next=/admin` ; un compte connecté non autorisé est renvoyé vers son espace client.

L'affectation initiale des administrateurs reste volontairement une opération privilégiée : aucun utilisateur ne peut s'auto-attribuer un rôle Store.

## Validation

Les tests PostgreSQL exécutent les migrations 2A et 2B dans PGlite et vérifient notamment : refus de publication sans rôle Store, publication autorisée, contraintes de promotion et prévention des cycles. Les tests unitaires couvrent aussi les prix promotionnels, stocks et compositions de kits invalides.

Le lint, le typecheck, les tests Store, le bundle de migrations et le build de production sont les contrôles attendus avant livraison.

## Limites connues

- Les migrations n'ont été appliquées ni à une base distante ni à la production.
- Les tests automatisés de stockage valident politiques et code, mais un parcours upload complet nécessite un projet Supabase local ou de staging configuré avec un utilisateur Auth réel.
- L'import CSV/Excel n'est pas implémenté. Les validateurs et routes par ressource permettent de brancher plus tard un pipeline d'import sans contourner les règles métier.
- Les commandes, ventes, revenus, paiements, réservations et logistique restent hors périmètre.

## Phase 2C proposée

- Import CSV/Excel avec prévalidation, aperçu, idempotence et rapport d'erreurs.
- Journal d'audit unifié pour les changements de catalogue hors stock.
- Affectation des membres Store depuis une console propriétaire sécurisée.
- Workflows d'approbation et publication programmée.
- Tests navigateur de bout en bout avec Supabase local, y compris upload et changement de rôle.
- Optimisation des grands catalogues : recherche de produits de kit distante, traitements par lots et observabilité.
