# ELIMA Store — Phase 3 : commandes et paiement à la livraison

Date : 20 octobre 2026  
Périmètre : checkout, adresses, livraison, commandes, réservations, suivi client, back-office et encaissement à la livraison.  
Décision commerciale : `cash_on_delivery` exclusivement. Aucune passerelle de paiement n’est intégrée.

## 1. Architecture des commandes

Le navigateur conserve seulement une intention de panier dans `localStorage`. Lors du checkout, il envoie les identifiants produit/variante ou kit et les quantités. Il n’est jamais la source du prix, du stock ou des frais.

Les routes Next.js authentifiées appellent des fonctions PostgreSQL `security definer` qui constituent la frontière transactionnelle :

- `quote_store_checkout` recharge le catalogue, calcule les prix effectifs, développe les kits, agrège les besoins par variante et charge le tarif de la zone ;
- `create_store_order` recalcule le devis, compare les montants présentés, crée la commande et ses lignes, puis réserve le stock dans la même transaction ;
- `cancel_store_order` applique les règles d’annulation client et libère les réservations ;
- `transition_store_order` applique la machine à états du back-office ;
- `record_store_cod_payment` enregistre un encaissement réel, séparément de la livraison ;
- `resolve_store_reservation_review` traite manuellement les articles revenus d’une livraison échouée ou non récupérée.

Les notifications sont représentées par un outbox métier. Les événements sont créés avec le statut `disabled` : aucune communication payante n’est déclarée envoyée sans fournisseur.

## 2. Schéma relationnel

```text
auth.users
  ├── store_customer_addresses ── store_delivery_zones ── store_delivery_methods
  └── store_commerce_orders
        ├── store_commerce_order_items ── produits / variantes / kits / vendeurs
        │     └── store_inventory_reservations ── store_product_variants
        ├── store_order_status_history
        ├── store_order_payments
        ├── store_delivery_events
        └── store_notification_outbox

store_delivery_methods(pickup) ── store_pickup_points
```

La migration additive est `20261020150000_store_commerce_orders_phase_3.sql`. Elle ajoute aussi `quantity_reserved` aux variantes et le rôle Store `order_manager`.

La référence publique est un identifiant aléatoire préfixé `ELS-`, distinct de l’UUID interne. Chaque commande possède une contrainte unique `(customer_id, idempotency_key)`.

Les lignes stockent un snapshot immuable : type, produit/kit, variante, vendeur, nom, variante, SKU, quantité, prix unitaire, total et devise. Les modifications futures du catalogue ne réécrivent pas l’historique.

## 3. Parcours de checkout

La route `/commande` fournit quatre étapes visibles :

1. panier modifiable ;
2. identification Supabase obligatoire, avec retour vers le panier local après OTP ;
3. adresse ou point de collecte et configuration logistique réelle ;
4. récapitulatif issu du devis serveur, consentement explicite et confirmation.

La confirmation affiche « Paiement à la livraison » et précise qu’aucun paiement n’est demandé immédiatement. Une variation de prix, de frais ou de disponibilité renvoie un conflit explicite et impose un nouveau récapitulatif.

Après création, `/commande/confirmation/[reference]` recharge la commande via une route protégée. Le client retrouve ensuite les commandes dans `/compte/commandes` et leur détail dans `/compte/commandes/[reference]`.

## 4. Gestion des adresses

`store_customer_addresses` conserve le destinataire, téléphone, pays, ville, commune, quartier, adresse détaillée, point de repère, instructions, zone associée et indicateur par défaut.

Le client peut ajouter une adresse pendant le checkout et gérer plusieurs adresses dans `/compte/adresses` : création, modification, suppression et choix de l’adresse par défaut. Les politiques RLS imposent `customer_id = auth.uid()` pour toute lecture ou écriture client.

Le modèle accepte d’autres pays et villes. L’interface privilégie `CI` et Abidjan au lancement sans rendre ces valeurs structurellement obligatoires.

## 5. Frais et zones de livraison

`store_delivery_methods` distingue `home_delivery` et `pickup`. La livraison à domicile est disponible uniquement si une zone active et tarifée est associée à l’adresse. Le retrait reste inactif par défaut et exige un point de collecte actif.

`store_delivery_zones` porte le nom, la ville, la commune, le montant XOF, les conditions et le délai indicatif. `/admin/zones-livraison` permet aux rôles `store_admin` et `order_manager` de gérer ces valeurs.

Aucune commune exemple et aucun tarif commercial n’ont été insérés. Sans zone active, la confirmation est bloquée par `DELIVERY_ZONE_UNAVAILABLE`. Le navigateur ne transmet jamais un montant de livraison faisant foi.

## 6. Réservation des stocks

`quantity_available` représente le stock physique et `quantity_reserved` la partie engagée. Le disponible commercial est leur différence et le catalogue public en tient compte.

La création de commande agrège les besoins de toutes les lignes avant la réservation. Un kit réserve les variantes de chacun de ses composants, multipliées par la quantité du kit. La mise à jour conditionnelle refuse une réservation dès que `quantity_available - quantity_reserved` est insuffisant. La contrainte `quantity_reserved <= quantity_available` empêche un stock incohérent.

Le stock physique n’est décrémenté qu’au statut `delivered`. Une annulation client avant préparation libère les réservations. Après préparation ou échec de livraison, les réservations passent en `review_required` et ne sont jamais remises automatiquement à disposition. Un opérateur habilité doit choisir après contrôle physique :

- `release` : article revendable, seule la réservation est libérée ;
- `discard` : article endommagé ou non retourné, le stock physique est décrémenté et audité.

## 7. Machine à états

```text
pending_confirmation
  ├── confirmed ── preparing ── out_for_delivery ── delivered
  │      └── cancelled   └── cancelled       ├── delivery_failed ── cancelled
  └── cancelled                              └── not_collected ─── cancelled
```

Chaque transition est vérifiée dans PostgreSQL, datée et ajoutée à `store_order_status_history` avec l’auteur et le motif. Le client peut annuler uniquement `pending_confirmation` ou `confirmed`. Les autres transitions exigent `store_admin` ou `order_manager`.

Les commandes annulées ne sont jamais supprimées physiquement.

## 8. Paiement à la livraison

Toute nouvelle commande possède :

- `payment_method = cash_on_delivery` ;
- `payment_status = unpaid` ;
- la devise `XOF`.

Une livraison, même marquée `delivered`, ne modifie pas automatiquement le statut de paiement. L’encaissement est possible uniquement après livraison et uniquement pour `store_admin` ou `order_manager`.

`store_order_payments` conserve le montant, la date, l’auteur, le mode réellement constaté et une référence interne. Une contrainte unique par commande et un verrou transactionnel empêchent le double enregistrement. Un montant différent du total exige un motif d’écart et donne le statut `partial`.

Les modes d’encaissement décrivent un constat manuel. Ils n’appellent aucune API Stripe, PayPal, Mobile Money ou bancaire.

## 9. Back-office commandes

Les routes ajoutées sont :

- `/admin/commandes` : recherche par référence, filtre de statut, tri, pagination et synthèse ;
- `/admin/commandes/[id]` : lignes, coordonnées, adresse figée, montants, historique, transitions et encaissement ;
- `/admin/livraisons` : file des préparations, expéditions et incidents ;
- `/admin/zones-livraison` : configuration des zones et tarifs validés.

Le rôle `order_manager` est séparé des rôles scolaires et des gestionnaires de catalogue. `inventory_manager` peut participer uniquement à la résolution contrôlée du stock en revue.

## 10. Règles de sécurité

- L’authentification réutilise exclusivement Supabase Auth et son cookie serveur.
- Les routes client appellent `auth.getUser()` avant tout accès.
- Le client lit uniquement ses adresses, commandes, lignes, paiements et événements.
- Les tables de commande n’accordent aucun `insert`, `update` ou `delete` direct au client.
- Les prix, promotions, frais et stocks sont relus dans la transaction SQL.
- La clé d’idempotence et sa contrainte unique empêchent les doublons lors d’un retry.
- Les réservations conditionnelles et verrous de lignes empêchent un stock négatif.
- Les transitions, encaissements et résolutions de stock vérifient les rôles Store dans la fonction SQL.
- Les numéros et adresses ne sont exposés par aucune route publique.
- L’outbox de notification n’est pas lisible par les clients et reste désactivé sans fournisseur.

## 11. Tests et résultats

La migration est exécutée uniquement dans PGlite, une base PostgreSQL locale éphémère. Les scénarios couvrent : commande valide, panier vide, changement de prix, rupture, concurrence logique, double soumission, kit indisponible, adresse étrangère, zone/tarif, annulation, libération de réservation, historique, paiement initial non encaissé, encaissement manuel, double encaissement, livraison échouée, contrôle du retour, RLS et lecture interdite d’une commande tierce.

| Contrôle | Résultat |
| --- | --- |
| ESLint Store | réussi, 0 avertissement |
| TypeScript Store | réussi |
| Tests unitaires Store | 17/17 réussis |
| Tests API/migrations Store | 15/15 réussis |
| Migration Phase 3 dans PGlite | réussie |
| Bundle SQL unifié | réussi, 56 sources |
| Build Next.js Store | réussi |

## 12. Procédure de recette

1. Confirmer explicitement le nom et l’URL du projet Supabase staging. Ne jamais réutiliser une URL distante non qualifiée.
2. Sauvegarder la base staging et vérifier que les migrations 2A, 2B et 2C sont présentes.
3. Appliquer `20261020150000_store_commerce_orders_phase_3.sql` uniquement à cette cible.
4. Créer un utilisateur client OTP, un `store_admin` et un `order_manager` de recette.
5. Configurer au moins une zone réelle avec un tarif commercial validé. Ne pas activer `pickup` sans point réel.
6. Publier deux produits et un kit de test avec stock connu.
7. Exécuter le checkout produit puis kit, répéter la confirmation avec la même clé et vérifier une seule commande.
8. Contrôler `quantity_reserved`, les lignes snapshot et l’historique.
9. Faire progresser la commande jusqu’à `delivered`, puis enregistrer séparément l’encaissement.
10. Tester une annulation, une livraison échouée et les deux résolutions de stock après contrôle.
11. Vérifier avec un second client que la commande et l’adresse du premier sont invisibles.
12. Réaliser une recette visuelle desktop, tablette et mobile des pages client et admin.

## 13. Limitations et prochaines étapes

- La migration n’a été appliquée à aucune base distante : aucun staging explicitement qualifié n’était disponible.
- L’OTP réel, la session administrateur réelle et les uploads Storage restent soumis à la recette staging décrite en Phase 2D.
- La recette visuelle automatisée n’a pas pu être exécutée : Computer Use n’exposait aucune application ni aucun navigateur.
- Aucune tâche planifiée ne libère automatiquement les commandes non confirmées après 48 heures. Une politique métier et un job staging devront être validés avant activation ; aucune expiration silencieuse n’a été inventée.
- L’outbox prépare les événements mais aucun fournisseur SMS, WhatsApp ou e-mail n’est configuré.
- Il n’existe ni passerelle de paiement, ni intégration transporteur, ni tarification commerciale préchargée.

Aucun déploiement, changement DNS ou accès à la production n’a été effectué.
