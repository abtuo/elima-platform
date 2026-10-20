# Elima Store — audit et architecture Phase 1

## Audit du monorepo

- Workspaces npm : `apps/site` (Next.js 16), `apps/platform` (Next.js 16), `apps/mobile` et `apps/revision` (Vite/React), `apps/api` et packages partagés.
- Identité visuelle : `@elima/branding`, vert `#2E8B57`, or `#FFD700`, Poppins pour les titres, Inter pour l’interface, cartes arrondies.
- Identité et sessions : Supabase central, helpers `@elima/auth`, cookies SSR dans Platform. L’auth téléphone existe déjà via Supabase OTP, avec une configuration Twilio/Verify également présente côté serveur pour WhatsApp.
- Domaine scolaire : comptes `users`, parents, enfants et relations `student_parents`, avec contrôles RLS et résolutions serveur dans Platform.
- Store historique : tables scolaires `store_products`, `supply_lists`, `store_packs` et `store_orders`, liées à un établissement. Elles servent au portail école mais ne constituent pas encore un catalogue marketplace public multi-vendeurs.
- Déploiement : applications Next.js configurées pour Vercel. Aucun déploiement ou DNS n’a été modifié.

## Architecture retenue

`apps/store` est une application Next.js autonome ciblant `store.elima.ci`, port local `3002`. Elle réutilise le branding et la même identité Supabase. Le panier et les favoris sont anonymes, persistés dans le navigateur, et restent associables à un compte dans une phase ultérieure.

Le catalogue Phase 1 est un jeu de démonstration typé. Chaque produit, kit, prix et état de stock est explicitement signalé comme non contractuel. Les montants XOF sont des entiers afin d’éviter les calculs flottants.

## Authentification et Core School

- OTP SMS : normalisation E.164 ivoirienne, code réel Supabase uniquement, expiration et usage unique délégués au fournisseur, limite applicative de 3 demandes/10 min et message générique anti-énumération.
- La limite mémoire complète la protection fournisseur mais devra être remplacée par une limite distribuée avant montée en charge.
- Les secrets restent côté serveur. Le Store crée une session sur le projet d’identité central et ne crée pas de base utilisateurs parallèle.
- Le profil client Phase 1 est stocké dans les métadonnées du même utilisateur Auth. Une migration métier dédiée sera nécessaire pour les adresses et préférences durables.
- `/mes-enfants` résout le parent connecté côté serveur, puis ses relations autorisées. Aucun identifiant d’enfant n’est accepté depuis le client et aucune association artificielle n’est créée.
- Les listes officielles existantes restent distinctes des kits commerciaux. Leur exposition au Store demandera un contrat serveur dédié.

## Limites et Phase 2 proposée

Brancher un catalogue persistant multi-vendeurs, ajouter inventaire et médias, synchroniser le panier authentifié, créer `customer_profiles` et `customer_addresses`, exposer les listes scolaires officielles via une API d’autorisation dédiée, ajouter la logistique, puis seulement intégrer commande et paiement avec idempotence, audit et rapprochement.
