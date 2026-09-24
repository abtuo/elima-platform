# Elima — monorepo npm

Cette architecture sépare les produits et leur socle technique partagé sans changement fonctionnel.

```text
apps/platform            Elima Platform complète (Next.js), cible ordinateur, tablette et navigateur mobile
apps/mobile              Elima App légère (Vite) + Révision standalone temporaire
packages/shared-domain   Contrats communs existants
packages/auth            Primitives d'identité et stockage de session
packages/api-client      Résolution d'URL et client fetch commun
packages/supabase-client Configuration publique et client Supabase navigateur
api                      Backend actuel temporaire
server                   Helpers backend, dont revisionCors
supabase                 Plateforme data commune ; migrations inchangées
data, scripts, docs, tmp  Restent à la racine
```

La cible produit de Platform est **FULL responsive**. Cette étape ne modifie toutefois aucune interface ni règle responsive.

`apps/platform/supabase` reste également conservé. Aucun rapprochement des migrations,
seed ou changement distant n'est effectué. Les sources d'icônes `assets/` restent
à la racine. Les anciennes références locales ignorées ne sont pas utilisées.

## Commandes depuis la racine

Installer avec `npm install`. Le seul lockfile applicatif est `package-lock.json`
à la racine. Les workspaces applicatifs et les quatre packages sous `packages/`
sont découverts automatiquement par npm.

```sh
npm run dev:platform
npm run dev:mobile
npm run dev:revision
npm run build:platform
npm run build:mobile
npm run build:revision
npm run build
npm run typecheck
npm test
npm run lint
```

Le build global est séquentiel et s'arrête au premier échec. Platform produit `.next`
sous apps/platform ; Mobile et Révision produisent `apps/mobile/dist` et
`apps/mobile/dist-revision`. Révision reste sous `apps/mobile/src/apps/revision`.
La barrière d'import School/backend reste active dans son build.

## Environnement et réseau

Exemples : `apps/platform/.env.example`, `apps/mobile/.env.example`. Les variables
`VITE_*` sont publiques : aucun secret serveur ne doit y figurer. Pour la
compatibilité locale, Vite lit aussi les fichiers env plateforme à la racine ;
les valeurs de apps/mobile ont priorité. Les fichiers env réels restent ignorés.
Le backend et les scripts de plateforme continuent à utiliser l'environnement
serveur racine. Aucun secret n'est copié dans la documentation.

`resolveApiUrl` et `apiFetch` viennent de `@elima/api-client` ; `server/revisionCors.mjs` et les
huit routes Révision restent à la racine. Base vide : same-origin ; base HTTPS
explicite : appels distants. Aucun changement de contrat réseau/CORS.

Les responsabilités et frontières de runtime sont détaillées dans
[`shared-foundation.md`](shared-foundation.md).

## Vercel — adaptation ultérieure, non effectuée

Aucun projet, domaine ou réglage Vercel distant n'est changé. La configuration
racine actuelle est conservée, mais son outputDirectory `dist` et son filtre de
chemins devront être adaptés au déplacement avant un déploiement. À terme,
Le futur projet Vercel principal utilisera `apps/platform` comme Root Directory ;
apps/mobile correspondra au projet Elima Mobile.
Il faudra décider du placement des fonctions racine et des variables serveur
avant de changer les Root Directories. Révision/API seront traités ensuite.
Ne pas déployer cette migration avec les anciennes hypothèses de chemins.

La cible future est `apps/platform`, `apps/mobile`, `apps/revision` et `apps/api`.
Les deux derniers dossiers, ainsi que Capacitor/Android, ne sont pas créés ici.
