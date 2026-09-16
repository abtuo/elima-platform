# Contrat réseau Elima Révision

## Audit et architecture

`apps/mobile/src/services/api/apiUrl.ts` contient le résolveur pur `resolveApiUrl` et la
validation `normalizeApiBase`. `apiClient.ts` le configure avec l'environnement
existant et expose `apiFetch`. Aucun changement de payload, méthode HTTP,
Bearer token ou traitement d'erreur métier n'est introduit.

Les services learning, revisionData, elimaIdentity et registration utilisent la
nouvelle couche pour ces huit endpoints :

```text
/api/learning
/api/revision-generate
/api/identity-bridge
/api/elima-password-login
/api/elima-profile
/api/elima-signup
/api/auth-verification-request
/api/auth-password-reset
```

Les appels Supabase directs et OAuth HTTPS ne sont pas modifiés. La chaîne
Supabase `/api/broadcast` n'est pas un endpoint relatif Elima. Les fonctions
School registration-request et activate-school restent hors du build Révision
et de cette migration.

## Configuration publique

`VITE_REVISION_API_BASE_URL` désigne **l'origine du backend**, pas un préfixe `/api`.
L'ancien exemple parlait simplement d'un backend séparé ; la nouvelle définition
précise ce contrat et l'étend aux huit fonctions auth/pédagogiques.

- Vide : `/api/learning` reste `/api/learning`, sans modifier le web historique.
- `https://backend.example.com/` : devient `https://backend.example.com/api/learning`.
- Credentials, chemins, query, fragment, protocoles non HTTP(S) : refusés.
- HTTP autorisé uniquement pour localhost/127.0.0.1/::1 en développement.
- Un build Vite de production exige HTTPS même si VITE_APP_ENV est mal configuré.
- La validation échoue au chargement du client avant tout envoi de tokens.

Le résolveur prépare `requireRemoteBackend: true` pour le futur bootstrap natif :
il refusera une base vide, HTTP et les backends loopback, y compris https://localhost.
Ce paramètre n'est pas activé aujourd'hui : aucun mode Android n'est inventé.
Toutes les variables VITE_* sont publiques. Aucun secret serveur ne doit y figurer.

## CORS côté serveur

`server/revisionCors.mjs` est hors de `api/` : ce helper ne crée pas de route
publique. Les huit fonctions Vercel Node request/response existantes l'appellent
avant leur logique métier. Aucun serveur supplémentaire ni changement de runtime.
Le filtre d'ignore Vercel inclut server pour déployer les modifications du helper.

`REVISION_ALLOWED_ORIGINS` est une liste serveur d'origines exactes séparées par
des virgules. `https://localhost` doit y être ajouté explicitement pour Android.
Pas de wildcard ni de réflexion aveugle. Les origines same-origin de la requête
sont reconnues via Host et le protocole du serveur/proxy Vercel (pas via un
x-forwarded-host fourni librement). Sans Origin, les guards métier continuent.

Une origine inconnue reçoit 403, sans Access-Control-Allow-Origin. Une origine
autorisée reçoit son origine exacte et Vary: Origin, y compris sur les erreurs métier.
OPTIONS autorisé retourne 204, sans body ni exécution métier. Les méthodes sont
POST/OPTIONS sauf elima-profile qui accepte GET/OPTIONS. Les seuls headers autorisés
sont Content-Type et Authorization. Méthode preflight interdite : 405 ; header
interdit : 400. Aucun Access-Control-Allow-Credentials, car les appels observés
utilisent des Bearer tokens, pas des cookies cross-origin.

**CORS n'est pas de l'authentification.** Les vérifications existantes de session,
ownership, identité et payload restent dans chaque handler, y compris ceux
utilisant une clé Supabase serveur. Un client non navigateur doit toujours passer
ces contrôles indépendamment d'Origin.

## Production à configurer, sans la modifier ici

Le repository documente la cible Vercel racine `app.elima.ci` dans
`docs/deployment/vercel-production.md` et `.env.example`. La base attendue pour
le futur frontend natif est donc `https://app.elima.ci`, sous réserve de vérifier
la disponibilité effective des huit routes sur ce déploiement avant publication.
Ne pas confondre cette cible avec elima.ci/www.elima.ci qui héberge le web amont.

```dotenv
# Build client distant (WebView ultérieure) : valeur publique
VITE_REVISION_API_BASE_URL=https://app.elima.ci
VITE_APP_ENV=production
# Fonctions Vercel : configuration serveur, exemple pour la cible documentée
REVISION_ALLOWED_ORIGINS=https://localhost,https://app.elima.ci
```

Ajouter explicitement toute autre origine web devant utiliser le backend en
cross-origin. Les variables Supabase/identité/Azure et le web amont existants
restent nécessaires, uniquement côté serveur pour leurs secrets. Le build web
same-origin peut continuer avec VITE_REVISION_API_BASE_URL vide. Aucun réglage
Vercel de production ni aucune base Supabase n'est modifié par cette étape.

## Tests et limites

```sh
npm run test:api
npm run typecheck
npm test
npm run build
npm run build:revision
```

Les tests ciblés couvrent URLs, slashs, protocoles, credentials, contrat natif
futur, migration des huit endpoints, origines autorisées/inconnues, Vary,
OPTIONS sur les huit handlers et conservation d'un refus d'authentification.
Aucun test n'envoie de vraie demande d'inscription, WhatsApp ou email.

## OAuth restant avant Capacitor

Les URLs identity-bridge/password/profile passent désormais par apiFetch ; les
échanges OAuth HTTPS directs restent inchangés. À l'étape suivante, il faudra
adapter et vérifier : redirect URI enregistrée auprès du fournisseur, callback
web/natif, transport du code et state, PKCE/verifier/nonce, conservation du flow
actuellement en sessionStorage lors du passage au navigateur système, deep link
entrant, cold start/warm start, consommation unique du callback et restauration
de la session locale. L'API réseau ne résout pas ces problèmes à elle seule.
Aucun deep link, Capacitor, Android, schéma Supabase ou UI n'est créé/modifié ici.

## Résultats de validation

Validation initiale : TypeScript, 70 tests et les deux builds réussis. Le build
historique a nécessité une exécution hors sandbox après un refus d'accès esbuild,
sans correction fonctionnelle nécessaire.

Validation finale : TypeScript et 85 tests réussis, dont 15 tests API/CORS et les
5 tests anti-imports School. Lint : aucune erreur, 20 avertissements non bloquants.
Les deux builds restent valides.

Un build Révision séparé avec VITE_REVISION_API_BASE_URL=https://backend.example.invalid
a été testé dans Edge headless : appel constaté à
https://backend.example.invalid/api/learning, POST, action discovery et Bearer
conservés. Le build historique sans base utilise bien son propre /api/learning.
Les requêtes ont toutes été interceptées localement, sans trafic métier réel.
Le navigateur intégré était indisponible ; les outils Edge temporaires restent
ignorés, sans modification des dépendances du projet.

Les trois bundles (historique, Révision normal et Révision mock) ont été inspectés :
aucun nom de secret serveur ni aucune des valeurs de secrets configurées vérifiées
n'y apparaît. La frontière de build exclut également les modules serveur/API backend.

Références techniques : [runtime Node Vercel](https://vercel.com/docs/functions/runtimes/node-js)
et [configuration Capacitor](https://capacitorjs.com/docs/config). Le runtime
request/response existant est conservé et https/localhost est seulement préparé
comme origine configurable, pas installé ni activé.
