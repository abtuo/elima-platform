# Elima Mobile

Application mobile web/PWA Elima — scolaire et révision. Construite avec Vite, React, TypeScript et Tailwind CSS.

## Installation

```bash
npm install
```

## Lancement

```bash
npm run dev
```

Ouvrir l'URL affichée (généralement `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Variables d'environnement

Copier `.env.example` vers `.env` et renseigner les clés publiques Supabase :

- `VITE_MAIN_SUPABASE_URL` / `VITE_MAIN_SUPABASE_ANON_KEY` — base scolaire (`elima.tech`)
- `VITE_REVISION_SUPABASE_URL` / `VITE_REVISION_SUPABASE_ANON_KEY` — base révision (`elima.app`)
- `VITE_WEB_BASE_URL` — portail web (`https://www.elima.ci`)
- `VITE_MAIN_API_BASE_URL` — API `elima.tech` pour uploads (Bearer JWT)

Sans Supabase configuré, le mode démo est actif (`VITE_ENABLE_DEMO_MODE=true`).

Le projet racine est autonome : toutes les configurations publiques nécessaires sont lues depuis son propre `.env`. Les dossiers `_references` ne sont jamais consultés au build ni à l’exécution. Aucun secret serveur n'est injecté dans le client. Le fichier `.env` racine désactive actuellement le mode démo pour utiliser les données réelles.

Les accès directs depuis la PWA dépendent des policies RLS multi-tenant. La migration non destructive `supabase/migrations/20260713090000_mobile_role_access.sql` ajoute les droits mobiles nécessaires pour les rôles établissement, toujours limités au `school_id` de l'utilisateur connecté.

**Ne jamais** ajouter de service role key, clé Azure, secret Twilio ou secret paiement.

## Structure

```txt
/
  src/
    app/          — Router et layouts
    components/   — UI réutilisable
    features/     — Pages par espace (parent, student, teacher, admin, revision)
    services/     — Supabase, auth, données, offline
    theme/        — Couleurs, typographie
    constants/    — Navigation, données démo
  public/         — PWA manifest, icônes
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

Les deux applications historiques sont conservées sans modification dans `_references/`. Elles servent de référence pour les contrats de données, l'authentification et l'expérience de révision ; la nouvelle application ne les importe pas à l'exécution.

## Documentation

- [Plan et audit](docs/mobile-app-plan.md)
- [Variables d'environnement](docs/env.md)
- [Architecture](docs/architecture.md)
- [Design system](docs/design-system.md)
- [Sécurité](docs/security.md)
- [Icônes](docs/icon-placeholders.md)
- [Backlog](docs/backlog.md)
