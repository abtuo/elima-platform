# Unification Elima Store

## Décision d’architecture

Le nouveau `apps/store` devient la source de vérité commerciale pour le catalogue, les kits, les stocks, les commandes, les livraisons et le paiement à la livraison.

L’ancien Store Core School reste temporairement un module scolaire en lecture/compatibilité. Ses données ne sont pas toutes fictives et ses tables ne peuvent pas être renommées ou supprimées sans migration métier.

## Résolution de la collision

Le catalogue moderne utilisait déjà des noms sans collision :

- `store_catalog_products`
- `store_catalog_kits`
- `store_product_variants`
- tables associées de catalogue, stock et import.

La Phase 3 entrait en collision avec `store_orders` et `store_order_items`. Le nouveau modèle commercial utilise désormais :

- `store_commerce_orders`
- `store_commerce_order_items`

Les RPC, clés étrangères, triggers, politiques RLS, requêtes `apps/store`, tests et bundle SQL ont été adaptés. Les tables scolaires historiques restent inchangées.

## Dépendances historiques

Les anciennes tables sont encore utilisées par :

- les parcours fournitures et commandes du portail `apps/platform` ;
- la consultation des commandes scolaires dans `apps/mobile` ;
- les reçus et factures scolaires ;
- les scripts de seed et reset de démonstration ;
- les politiques RLS scolaires historiques.

Ces usages ne doivent pas être redirigés mécaniquement vers le nouveau Store : leur modèle associe une commande à une école, un parent, un élève, une classe et un pack.

## Retrait futur

1. Geler toute nouvelle évolution de l’ancien Store.
2. Identifier les 10 produits et 9 kits associés à des écoles non démo avec leurs propriétaires métier.
3. Décider s’ils doivent devenir des produits/kits commerciaux ou rester des listes scolaires.
4. Adapter Platform et Mobile vers des vues de compatibilité ou vers les API du nouveau Store.
5. Migrer et rapprocher les données avec un rapport ligne par ligne.
6. Désactiver les écritures historiques.
7. Observer une période sans trafic.
8. Archiver les tables dans une migration séparée, sauvegardée et explicitement approuvée.

Aucune de ces étapes destructrices n’est incluse dans les migrations Store actuelles.

## Garanties testées

- Les cinq tables historiques peuvent exister avant l’application des migrations Store.
- Une commande scolaire historique reste lisible et intacte après application locale des Phases 2A à 3.
- Les nouvelles commandes utilisent uniquement les tables `store_commerce_*`.
- Les réservations de stock, l’idempotence, les transitions, l’annulation et l’encaissement COD sont couverts.
- Aucun prestataire de paiement en ligne n’est introduit.
