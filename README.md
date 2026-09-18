# Elima

Monorepo npm : Elima Platform (Next.js), Elima Mobile (Vite/React) et Révision standalone temporairement hébergée dans Mobile. Voir [le guide monorepo](docs/monorepo.md).

## Installation

```bash
npm install
```

## Lancement

```bash
npm run dev:mobile
# ou npm run dev:platform / npm run dev:revision
```

Ouvrir l'URL affichée (généralement `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Variables d'environnement

Copier `apps/mobile/.env.example` vers `apps/mobile/.env` et renseigner les clés publiques Supabase :

- `VITE_MAIN_SUPABASE_URL` / `VITE_MAIN_SUPABASE_ANON_KEY` — base commune scolaire + révision
- `VITE_WEB_BASE_URL` — portail web (`https://www.elima.ci`)
- `VITE_MAIN_API_BASE_URL` — API `elima.tech` pour uploads (Bearer JWT)

Sans Supabase configuré, le mode démo est actif (`VITE_ENABLE_DEMO_MODE=true`).

Mobile lit son environnement applicatif et conserve la lecture de l'environnement racine pour la compatibilité locale (les valeurs applicatives ont priorité). Les dossiers `_references` ne sont jamais consultés au build ni à l’exécution. Les variables `VITE_*` sont publiques ; aucun secret serveur ne doit y figurer.

Les accès directs depuis la PWA dépendent des policies RLS multi-tenant. La migration non destructive `supabase/migrations/20260713090000_mobile_role_access.sql` ajoute les droits mobiles nécessaires pour les rôles établissement, toujours limités au `school_id` de l'utilisateur connecté.

**Ne jamais** ajouter de service role key, clé Azure, secret Twilio ou secret paiement.

## Structure

```txt
/
  apps/mobile/src/
    app/          — Router et layouts
    components/   — UI réutilisable
    features/     — Pages par espace (parent, student, teacher, admin, revision)
    services/     — Supabase, auth, données, offline
    theme/        — Couleurs, typographie
    constants/    — Navigation, données démo
  apps/mobile/public/ — PWA manifest, icônes
  apps/platform/  — Elima Platform complète / Next.js
  packages/       — Contrats communs existants
  api/, server/   — Backend et helpers actuels
  docs/           — Documentation
```

## Espaces

| Rôle | Navigation |
|------|------------|
| Parent | Accueil, Enfants, Messages, Paiements, Profil |
| Élève | Accueil, Devoirs, Réviser, Scanner, Profil |
| Professeur | Aujourd'hui, Classes, Devoirs, Ressources, Sync |
| Admin | Dashboard, Élèves, Paiements, Messages, Alertes |

## PWA

L'application est installable via le navigateur (Chrome « Ajouter à l'écran d'accueil », Safari « Sur l'écran d'accueil »). Service worker géré par `vite-plugin-pwa`.

## Capacitor (futur)

Cette PWA pourra être packagée avec Capacitor pour Android/iOS sans refonte majeure.

## Origines

- **elima.tech** — auth, rôles, données scolaires, plans, messagerie, paiements
- **elima.app** — design révision gamifié, quiz, fiches, Markdown/KaTeX

Elima Platform complète est active dans `apps/platform/`. Seule l'ancienne application
`_references/elima.app` reste une référence historique isolée ; aucun build actif
ne dépend de ce dossier.

## Documentation

- [Plan et audit](docs/mobile-app-plan.md)
- [Variables d'environnement](docs/env.md)
- [Architecture](docs/architecture.md)
- [Design system](docs/design-system.md)
- [Sécurité](docs/security.md)
- [Icônes](docs/icon-placeholders.md)
- [Backlog](docs/backlog.md)
