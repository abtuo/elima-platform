# Elima — monorepo npm

Cette étape déplace les applications sans extraction de nouveaux packages ni changement fonctionnel.

```text
apps/web                 Elima Web complet (Next.js)
apps/mobile              Elima Mobile (Vite) + Révision standalone temporaire
packages/shared-domain   Contrats communs existants
api                      Fonctions backend actuelles
server                   Helpers backend, dont revisionCors
supabase                 Plateforme data commune ; migrations inchangées
data, scripts, docs, tmp  Restent à la racine
```

`apps/web/supabase` reste également conservé. Aucun rapprochement des migrations,
seed ou changement distant n'est effectué. Les sources d'icônes `assets/` restent
à la racine. Les anciennes références locales ignorées ne sont pas utilisées.

## Commandes depuis la racine

Installer avec `npm install`. Le seul lockfile applicatif est `package-lock.json`
à la racine. Les workspaces sont `@elima/web`, `@elima/mobile`, `@elima/shared-domain`.

```sh
npm run dev:web
npm run dev:mobile
npm run dev:revision
npm run build:web
npm run build:mobile
npm run build:revision
npm run build
npm run typecheck
npm test
npm run lint
```

Le build global est séquentiel et s'arrête au premier échec. Web produit `.next`
sous apps/web ; Mobile et Révision produisent `apps/mobile/dist` et
`apps/mobile/dist-revision`. Révision reste sous `apps/mobile/src/apps/revision`.
La barrière d'import School/backend reste active dans son build.

## Environnement et réseau

Exemples : `apps/web/.env.example`, `apps/mobile/.env.example`. Les variables
`VITE_*` sont publiques : aucun secret serveur ne doit y figurer. Pour la
compatibilité locale, Vite lit aussi les fichiers env plateforme à la racine ;
les valeurs de apps/mobile ont priorité. Les fichiers env réels restent ignorés.
Le backend et les scripts de plateforme continuent à utiliser l'environnement
serveur racine. Aucun secret n'est copié dans la documentation.

`resolveApiUrl` et `apiFetch` suivent Mobile ; `server/revisionCors.mjs` et les
huit routes Révision restent à la racine. Base vide : same-origin ; base HTTPS
explicite : appels distants. Aucun changement de contrat réseau/CORS.

## Vercel — adaptation ultérieure, non effectuée

Aucun projet, domaine ou réglage Vercel distant n'est changé. La configuration
racine actuelle est conservée, mais son outputDirectory `dist` et son filtre de
chemins devront être adaptés au déplacement avant un déploiement. À terme,
apps/web correspondra au projet Elima Web et apps/mobile au projet Elima Mobile.
Il faudra décider du placement des fonctions racine et des variables serveur
avant de changer les Root Directories. Révision/API seront traités ensuite.
Ne pas déployer cette migration avec les anciennes hypothèses de chemins.

Ni apps/revision, ni apps/api, ni Capacitor/Android ne sont créés ici.
