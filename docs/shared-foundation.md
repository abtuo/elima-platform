# Socle technique partagé Elima

Le socle partagé reste volontairement petit et indépendant des applications. Les packages publient directement leurs sources TypeScript via les workspaces npm ; aucun bundler de package supplémentaire n'est nécessaire.

## Responsabilités

- `@elima/shared-domain` porte les contrats métier stables, notamment les environnements et rôles Elima.
- `@elima/api-client` valide une origine API, résout les endpoints `/api/*` et construit un client `fetch`. Une base vide conserve le same-origin ; une base distante doit être HTTPS, sauf localhost en développement.
- `@elima/supabase-client` valide uniquement la configuration Supabase publique et crée le client navigateur générique. Il ne connaît aucun secret ni client administrateur.
- `@elima/auth` fournit les types/primitives d'identité, la normalisation email/téléphone, une abstraction de stockage navigateur et la lecture, l'écriture, la validation et le nettoyage d'une session stockée. Il ne contient ni UI, ni routage, ni redirection.

## Frontières de runtime

Platform conserve ses clients Supabase Next.js spécifiques : `@supabase/ssr`, cookies, middleware et client serveur/administrateur restent dans `apps/platform`. Son client navigateur réutilise la validation de configuration publique partagée.

Mobile crée son client navigateur via `@elima/supabase-client`. Mobile et Révision utilisent `@elima/api-client` via le wrapper de compatibilité `apps/mobile/src/services/api/apiClient.ts` et les primitives de stockage/session de `@elima/auth`.

Le helper CORS `server/revisionCors.mjs`, les routes API et toute clé serveur restent hors des packages client.

## Variables publiques actuelles

| Runtime | Supabase public | API |
| --- | --- | --- |
| Platform | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | routes Next.js actuelles |
| Mobile / Révision | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` ; alias historiques `VITE_SUPABASE_ANON_KEY`, `VITE_MAIN_SUPABASE_URL`, `VITE_MAIN_SUPABASE_ANON_KEY` encore acceptés | `VITE_REVISION_API_BASE_URL`, vide pour same-origin |

`VITE_REVISION_API_BASE_URL` est conservée pour compatibilité. Une variable plus générique pourra être introduite lorsque `apps/api` existera, sans migration anticipée dans cette étape.

Les variables préfixées `VITE_` ou `NEXT_PUBLIC_` sont publiques. Les clés de service, clés fournisseurs et URLs de base privées ne doivent jamais être importées par les packages client.

## Graphe de dépendances

```text
shared-domain ──▶ auth ───────────────▶ Platform
      │             └─────────────────▶ Mobile ──▶ Révision
      └────────▶ api-client ──────────▶ Mobile ──▶ Révision

supabase-client ──────────────────────▶ Platform
       └──────────────────────────────▶ Mobile ──▶ Révision
```

Aucun package partagé n'importe une application.
