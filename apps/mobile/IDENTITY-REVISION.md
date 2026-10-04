# Mobile : identité centrale et Révision partagée

Mobile authentifie le numéro WhatsApp et le mot de passe via `/api/elima-password-login`.
Le mot de passe n'est ni transformé ni envoyé au projet de données Révision.
La session centrale est persistée par Supabase Auth sous `elima-mobile-identity` ;
son refresh utilise directement le projet Identity, sans OAuth ni navigation externe.
Le logout révoque la session centrale puis efface les deux sessions locales.

`mainDbClient` cible Identity `nnsgvnjzfrcmbxfwlyow` (espaces scolaires existants).
`revisionDbClient` cible exclusivement `rydnrvvmwixrkmnvpajf`, sous une autre clé de session.
Avant les routes Révision, `RevisionBoundary` appelle le bridge si la session locale
n'est pas déjà liée au même UUID central. Les pages reçoivent l'UUID local, jamais
l'UUID central pour leurs lectures de progression/documents/fiches.

Les services de données, Learning, Scanner, matières et abonnement proviennent de
`@elima/revision-core`. Le Scanner utilise `@elima/revision-ui`, aussi consommé par
la standalone. Le moteur historique `scannerService` a été retiré. Les pages Mobile
restent des wrappers de navigation ; pas de dépendance vers `apps/revision`.

## Déploiement Vercel

Root Directory `apps/mobile`, installation npm workspace depuis le monorepo,
build `npm run build`, output `dist`. `vercel.json` fournit le fallback SPA,
sans Ignored Build Step. Définir les variables publiques de `.env.example` :
les clés publishable doivent correspondre chacune à leur propre projet.
Configurer côté projet API `REVISION_ALLOWED_ORIGINS` avec l'origine HTTPS exacte
du déploiement Mobile. Aucun secret Supabase/Twilio/Azure/Google dans Mobile.
Les anciennes variables génériques VITE_SUPABASE_* et OAuth ne sélectionnent plus
le projet de connexion. Le mode démo doit être explicitement activé en développement.

## Limites de validation

Les tests prouvent les mêmes lectures/écritures avec deux adaptateurs et une base
simulée. Avant activation publique : avec un compte de test, faire un quiz Mobile,
ouvrir l'historique standalone, puis faire l'inverse. Vérifier aussi les matières,
fiches, documents et droits d'abonnement avec le même compte.

Le backend commun n'autorise actuellement que la création des comptes élèves.
La création Parent/Teacher/Admin nécessite le parcours de l'établissement ; Mobile
ne contourne pas cette restriction. `/api/elima-profile`, `activate-school` et
`registration-request` restent des relais scolaires historiques vers Platform.
Leur fonctionnement ainsi que les RLS scolaires Identity doivent être vérifiés
avec des comptes de chaque rôle. Aucune table, donnée, politique RLS ou ressource
distante n'a été modifiée dans cette étape.
