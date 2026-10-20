# Elima Store — état d’activation Core School

Date de contrôle : 20 octobre 2026.

## Compte propriétaire

Le compte est confirmé dans Core School (`nnsgvnjzfrcmbxfwlyow`) :

- UUID : `721e715a-a520-4d9f-bd7a-2fda083fc5e1` ;
- e-mail Identity : `+33656802188@phone.elima` ;
- provider : `email` ;
- e-mail et compte confirmés ;
- `auth.users.phone` et `phone_confirmed_at` sont nuls ;
- la ligne `public.users` porte le même UUID et le téléphone `+33656802188` ;
- aucun compte natif supplémentaire ne porte ce téléphone ;
- le rôle scolaire `STUDENT` reste inchangé.

L’ancien audit recherchait seulement `auth.users.phone` et ne couvrait donc pas le modèle historique `@phone.elima`.

## Authentification Store corrigée

Le login Store ne fait plus appel à `signInWithOtp(... shouldCreateUser: true)`, qui aurait pu créer un doublon. Il réutilise désormais le parcours Identity existant :

1. Twilio Verify envoie un code WhatsApp au numéro E.164.
2. Le backend central vérifie le code et produit une preuve `phone_control` courte et à usage unique.
3. La résolution serveur utilise le téléphone ou l’e-mail synthétique dans la table Identity contrôlée, jamais `raw_user_meta_data.phone` comme preuve.
4. Le backend vérifie l’UUID et l’e-mail directement avec l’administration Supabase Auth.
5. Une session Supabase du même UUID est produite puis installée dans les cookies SSR Store.

L’endpoint ajouté est `/api/elima-phone-login`. Il ne modifie ni l’utilisateur Auth, ni son téléphone natif, ni son rôle `STUDENT`.

Les tables `auth_flow_attempts` et `auth_flow_authorizations` existent sur Core, ont RLS activé et sont réservées à `service_role`.

## Migrations Store

Les catalogues PostgreSQL distants confirment que les quatre migrations sont toujours absentes :

1. `20261020120000_store_catalog_phase_2a.sql`
2. `20261020130000_store_catalog_admin_phase_2b.sql`
3. `20261020140000_store_catalog_import_phase_2c.sql`
4. `20261020150000_store_commerce_orders_phase_3.sql`

Le dry-run isolé cible uniquement Core School. Les cinq tables Store scolaires existantes restent intactes. Aucune migration distante n’a été appliquée.

## Sauvegarde

Les binaires `pg_dump` et `pg_restore` PostgreSQL 17.11 ont été téléchargés depuis l’installateur officiel, contrôlé par SHA-256, et extraits dans `%LOCALAPPDATA%\ElimaTools\postgresql-17.11`.

La création du dump complet n’a pas été lancée : l’archive contiendrait les schémas Auth et des données privées, et sa destination doit être approuvée explicitement. Destination proposée :

`%LOCALAPPDATA%\ElimaBackups\CoreSchool\2026-10-20-pre-store`

Après approbation, le dump sera produit en format custom, contrôlé par `pg_restore --list`, signé par SHA-256, puis restauré dans un PostgreSQL 17 local isolé. Aucune migration ne sera appliquée tant que ce test de restauration n’est pas concluant.

## Attribution Store

Le modèle `database/core/admin/store-admin-template.sql` cible exactement l’UUID et l’e-mail ci-dessus. Il exige également une preuve `phone_control` Twilio consommée depuis moins de 30 minutes. Il se termine encore par `ROLLBACK`.

Le rôle `store_admin` n’est pas attribué et nécessitera une autorisation distincte après migration et après connexion OTP réussie.

## Validation locale

- Tests Store : 18/18.
- Tests API : 148/148.
- TypeScript Store : réussi.
- ESLint Store : réussi sans avertissement.
- ESLint API : aucune erreur, deux avertissements préexistants dans `learning.mjs`.
- Build API : réussi, 26 endpoints.
- Build Store : réussi, 27 pages statiques générées et routes administratives compilées.

## Étapes restantes

1. Autoriser explicitement le dump complet contenant Auth et les données privées vers la destination proposée.
2. Vérifier l’archive et sa restauration locale isolée.
3. Autoriser séparément l’application des quatre migrations Store.
4. Déployer l’endpoint API et configurer `ELIMA_API_BASE_URL`, l’URL et la clé publique Core sur Store.
5. Effectuer la connexion réelle sur `/connexion?next=/admin` avec `+33656802188`.
6. Autoriser séparément l’attribution `store_admin` après preuve OTP récente.
7. Effectuer la recette commerciale puis seulement préparer `store.elima.ci`.

Aucun OTP réel n’a été envoyé, aucun rôle distant n’a été attribué, aucune migration n’a été appliquée et aucun déploiement ou DNS n’a été modifié.
