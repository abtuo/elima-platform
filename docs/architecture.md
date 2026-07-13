# Architecture — Elima Mobile PWA

## Stack

- Vite 5 + React 18 + TypeScript
- Tailwind CSS 3
- React Router 6
- Supabase JS SDK
- vite-plugin-pwa

## Flux données

```txt
UI (features/) → services/ → Supabase (RLS) ou demoData
```

- `mainDbClient` — données scolaires (`elima.tech`)
- `revisionDbClient` — quiz, fiches, scans (`elima.app`)
- `authService` — JWT session, Bearer token pour API futures

## Navigation

Router dans `src/app/router.tsx`. Layout protégé avec `AuthProvider`. Redirection par rôle via `ROLE_HOME`.

Mode démo : sélecteur de rôle sans Supabase, données dans `constants/demoData.ts`.

## Offline professeur

- `networkStatusService` — statut connexion
- `offlineQueueService` — file localStorage
- `syncService` — replay à reconnexion

## Web fallback

`webLinkService` ouvre `VITE_WEB_BASE_URL` pour pages lourdes (imports, finance détaillée, reporting).

## Révision

Design inspiré `elima.app` : dashboard gamifié, quiz, fiches Markdown/KaTeX, scanner.

## Mapping utilisateurs (futur)

Si auth scolaire ≠ auth révision, table proposée `revision_user_links` (voir backlog).
