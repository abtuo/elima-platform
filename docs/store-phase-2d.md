# ELIMA Store — Phase 2D : recette et préparation commerciale

Date de recette : 20 octobre 2026  
Périmètre : `apps/store`, migrations Store 2A à 2C, catalogue public, back-office, import, comptes clients et préparation de la Phase 3.  
Décision de sécurité : aucun déploiement, aucune migration distante et aucune écriture en production.

## Synthèse

Le socle Store compile et les tests automatisables passent. Le catalogue, les règles de publication, les stocks, les classes, les kits, l'import et les politiques RLS ont été validés dans une base PostgreSQL isolée en mémoire. Les routes publiques et leurs états dégradés ont été vérifiés sur le serveur local existant.

La recette réelle Supabase avec session administrateur, stockage et OTP SMS n'a pas été exécutée : la machine ne dispose ni de Docker ni du CLI Supabase, `apps/store/.env.local` est absent, et les variables trouvées à la racine pointent vers des hôtes distants qui ne sont pas explicitement identifiés comme staging. Elles ont donc été laissées intactes.

## Environnement et migrations

### Cible observée

- `supabase/config.toml` décrit le projet local `elima-unified-local`, avec API `127.0.0.1:54321` et PostgreSQL `127.0.0.1:54322`.
- Aucun service local correspondant n'est disponible dans cet environnement.
- Docker et le CLI Supabase ne sont pas installés ou accessibles.
- `apps/store/.env.local` n'existe pas. Le fichier `apps/store/.env.example` documente désormais la configuration locale attendue et avertit de ne pas réutiliser une cible distante non qualifiée.
- Les URL trouvées dans le `.env` racine sont distantes. Leurs valeurs sensibles n'ont pas été affichées, copiées dans Store ou utilisées.

### État des migrations

Les migrations suivantes ont été relues et exécutées dans PGlite, une base PostgreSQL éphémère isolée :

- `20261020120000_store_catalog_phase_2a.sql` ;
- `20261020130000_store_catalog_admin_phase_2b.sql` ;
- `20261020140000_store_catalog_import_phase_2c.sql`.

Elles créent le catalogue, les rôles Store, le stockage, les fonctions de publication et de stock, puis les journaux d'import. Le bundle unifié a été régénéré avec 55 sources. Aucune migration supplémentaire n'était nécessaire en Phase 2D et aucune migration n'a été appliquée à une base distante.

Pour reprendre la recette connectée, il faut démarrer une instance locale Supabase ou fournir un projet staging nommé et confirmé, générer les clés avec `supabase status`, puis renseigner uniquement `apps/store/.env.local`.

## Parcours réellement vérifiés

### Catalogue et administration

Un scénario automatisé PGlite applique les migrations puis vérifie :

1. la création d'un membre `store_admin` ;
2. la création de deux produits en brouillon ;
3. leurs variantes, prix et stocks ;
4. plusieurs images et l'image principale ;
5. l'association d'un produit à plusieurs classes ;
6. la publication contrôlée et sa visibilité publique ;
7. la composition d'un kit avec plusieurs produits ;
8. l'archivage d'un produit et sa disparition du catalogue public.

Les tests de sécurité confirment aussi que :

- le public ne lit pas les brouillons et ne peut pas écrire ;
- les écritures back-office exigent un rôle Store ;
- la publication refuse un produit commercialement incomplet ;
- les ajustements de stock passent par une RPC atomique ;
- les promotions, SKU, prix et compositions incohérents sont rejetés ;
- le bucket `store-product-media` reste privé et la lecture publique est limitée aux médias référencés par un produit ou un kit actif.

La vraie connexion `/admin`, la saisie dans les formulaires et l'upload vers Supabase Storage n'ont pas pu être exécutés faute d'instance Auth/Storage isolée. En configuration absente, `/admin` et `/admin/produits/importer` redirigent maintenant proprement vers `/connexion?next=/admin&config=missing`, au lieu de produire une erreur serveur.

### Import

Les validations suivantes sont automatisées :

- lecture CSV et XLSX ;
- modèle XLSX à sept onglets ;
- validation des colonnes, types, classes et niveaux ;
- détection des SKU dupliqués ou existants ;
- stratégie explicite `skip` ou `update` ;
- neutralisation des injections tableur et rejet des formules ;
- journalisation de l'import, des lignes et des modifications de stock ;
- rapport de création, mise à jour, omission et erreur ;
- maintien en brouillon des références importées ;
- présence exacte des 100 références et 15 kits candidats, sans prix commercial inventé.

La performance de validation des 100 références est couverte. Un import réellement envoyé par le navigateur et persisté dans Supabase reste à refaire sur staging avec une session autorisée.

### Parcours client

Les routes suivantes répondent en local :

| Route | Résultat observé |
| --- | --- |
| `/`, `/catalogue`, `/kits`, `/panier` | HTTP 200 |
| `/connexion`, `/mes-enfants` | HTTP 200 |
| `/api/catalogue/products`, `/api/catalogue/kits` | HTTP 503 contrôlé sans base configurée |
| `/api/account/children` | HTTP 200 avec état non authentifié/configuration absente |
| `POST /api/admin/imports/catalog/preview` | HTTP 503 contrôlé sans identité Supabase |

La logique pure du panier est testée : ajout, fusion, modification, plafond de quantité, suppression, rejet des données locales corrompues et persistance via `localStorage`. Les favoris utilisent également un stockage local persistant. La navigation anonyme, les pages de recherche/filtres et les états vides sont accessibles sans données fictives injectées en mode base.

L'inscription téléphone, l'envoi d'un OTP SMS, la connexion/déconnexion réelle et l'accès authentifié à « Mes enfants » n'ont pas été exécutés. Store délègue l'OTP à Supabase Auth ; aucun fournisseur SMS staging vérifié n'est disponible. Aucun SMS n'a été envoyé et aucune cible distante n'a été sollicitée.

## QA visuelle

Le fichier `hero_elima_store.png` a été inspecté dans sa résolution originale : la zone libre à gauche et les fournitures à droite correspondent à la composition demandée. Son intégration utilise un fond complet, un contenu HTML superposé, un dégradé localisé et des ruptures responsive sans hauteur fixe bloquante.

Le code des pages principales, de la navigation, des cartes, formulaires admin, images, panier, kits et états vides a été relu. Les grilles et espacements couvrent les ruptures mobile, tablette et desktop. Le navigateur de contrôle n'exposait toutefois aucune surface disponible ; aucune capture interactive aux trois largeurs ne peut donc être revendiquée. Les polices Google distantes peuvent afficher leur fallback lors d'un développement hors réseau, sans bloquer le build.

## Anomalies corrigées

- L'administration sans configuration Supabase renvoyait une erreur 500 : ajout d'une garde explicite avec redirection page et réponse API 503.
- Le bandeau global annonçait toujours un « catalogue de démonstration » : il reflète maintenant le mode catalogue réel.
- Les uploads se fiaient au MIME fourni par le navigateur : JPEG, PNG, WebP et AVIF sont maintenant vérifiés par signature, limités à 8 Mo et exigent un texte alternatif.
- Le raccourci « produits sans image » pointait vers un filtre inexistant : il ouvre désormais la page qualité.
- La page kits affichait encore « Personnalisation prévue en Phase 2B » : le libellé décrit maintenant l'état réel, non activé.
- Les consignes d'environnement local/staging ont été clarifiées dans `.env.example`.

## Résultats de validation

| Contrôle | Résultat |
| --- | --- |
| ESLint Store | réussi, 0 avertissement |
| TypeScript Store | réussi |
| Tests unitaires Store | 15/15 réussis |
| Tests API et migrations Store | 12/12 réussis |
| Bundle SQL unifié | réussi, 55 sources |
| Build Next.js Store | réussi, 18 pages statiques générées et routes dynamiques compilées |

## Préparation technique de la Phase 3

Le panier actuel est une intention d'achat locale. Il contient un instantané de présentation et ne doit jamais devenir la source du prix ou du stock côté commande. La Phase 3 doit recalculer côté serveur les produits, variantes, prix, promotions, disponibilité et frais avant toute confirmation.

### Modèle recommandé

- `store_customer_addresses` : libellé, destinataire, téléphone, commune/quartier, indications, coordonnées optionnelles, adresse par défaut et appartenance stricte à `auth.uid()`.
- `store_delivery_zones` et règles tarifaires versionnées : zone, communes couvertes, montant FCFA, seuil éventuel, délai indicatif et activation.
- `store_commerce_orders` : référence humaine unique, client, statuts métier, totaux recalculés, adresse/zone/frais figés, notes, dates et clé d'idempotence.
- `store_commerce_order_items` : instantané immuable du SKU, libellé, variante, prix unitaire, quantité et composition des kits au moment de la commande.
- `store_inventory_reservations` : variante, commande, quantité, expiration, libération et consommation.
- `store_order_events` : historique append-only des changements de statut et auteur.
- champs ou table d'encaissement à la livraison séparés : état `pending`, `collected`, `failed` ou `waived`, montant, agent, date et référence de reçu. Aucune passerelle de paiement n'est requise.

### Flux et invariants

1. Résoudre l'adresse et une zone active, puis figer le devis de livraison.
2. Recharger et verrouiller les variantes en base ; recalculer les prix dans une transaction.
3. Créer la commande et ses lignes avec une clé d'idempotence unique par tentative client.
4. Réserver atomiquement le stock par RPC, sans décrément aveugle ni confiance dans `localStorage`.
5. Confirmer manuellement la commande, puis préparer et expédier.
6. À l'annulation ou à l'expiration, libérer les réservations une seule fois.
7. À la livraison, consommer la réservation et enregistrer séparément l'encaissement espèces/mobile hors passerelle.
8. Journaliser chaque transition ; imposer les transitions autorisées (`pending_confirmation`, `confirmed`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`).

Les RLS devront permettre au client de lire uniquement ses commandes/adresses, au personnel habilité de les traiter, et interdire au client de modifier prix, frais, statut, réservation ou encaissement. Les annulations concurrentes, doubles confirmations, reprises après erreur réseau et expirations de réservation devront avoir des tests transactionnels dédiés.

## Blocages et décision de mise en service

La Phase 2D est validée au niveau code, migrations isolées et états locaux dégradés. Elle n'est pas validée comme recette connectée tant que les points suivants ne sont pas réalisés sur une cible staging explicitement confirmée : session administrateur réelle, CRUD avec médias dans Storage, import XLSX persistant, OTP SMS réel, accès authentifié à « Mes enfants » et contrôle visuel interactif desktop/tablette/mobile.

La production n'a pas été modifiée. Aucun déploiement n'a été effectué.
