# Plan et audit Elima Mobile PWA

## Objectif

Elima Mobile est une PWA mobile-first installable sur navigateur, tablette et mobile. Elle reprend la logique utile de `elima.tech` (scolaire) et `elima.app` (révision) sans fusion brutale.

## Stack retenue

- Vite + React + TypeScript + Tailwind CSS
- React Router
- Supabase JS SDK
- vite-plugin-pwa
- Capacitor prévu plus tard (non implémenté)

## Audit elima.tech

- Next.js 16, Supabase SSR cookies, multi-tenant `school_id`
- Rôles : SUPER_ADMIN, SCHOOL_ADMIN, COMPTABLE, TEACHER, PARENT, STUDENT
- Plans Basic / Premium / Custom, feature gating
- Tables : homeworks, attendance, grades, conversations, messages, payments
- APIs cookie-based — **pas de Bearer JWT** (gap pour mobile)

### À reprendre

Rôles, isolation school_id, parent-enfant, notes, absences, devoirs, ressources, messagerie, paiements légers, plans.

### À ne pas reprendre

Cookies SSR, vitrine, back-office complet, secrets serveur.

## Audit elima.app

- Vite/React mobile-first, design gamifié Duolingo-like
- XP, streak, quiz, fiches, Markdown/KaTeX, scanner partiel
- Tables : user_progress, quiz_sets, scanned_exams, user_course_summaries

### À reprendre

Design révision, dashboard gamifié, quiz, fiches, progression, scanner UI.

### À ne pas reprendre

Auth téléphone synthétique si auth elima.tech prime, clés Azure client, dossier Next.js `app/`.

## Stratégie auth

Supabase Auth JWT côté client, refresh token, `getBearerToken()` pour APIs futures.

## Stratégie bases

- `mainDbClient` → elima.tech
- `revisionDbClient` → elima.app (peut être identique)
- Pas de base mobile séparée

## Phases

| Phase | Statut |
|-------|--------|
| 0 Audit + docs | Fait |
| 1 Scaffold Vite PWA | Fait |
| 2 Thème + composants | Fait |
| 3 Services + env | Fait |
| 4 Auth + routing | Fait |
| 5 Parent + Élève scolaire | Fait |
| 6 Révision | Fait |
| 7 Scanner | Fait |
| 8 Professeur + upload | Fait (UI) |
| 9 Offline sync | Fait (v1) |
| 10 Admin léger | Fait |
| 11 Branchement données réelles | Backlog |

## Risques

- APIs cookie-only → Supabase direct + backlog JWT
- Upload public URLs → signed URLs backlog
- Scanner/OCR incomplet → UI prête, backend backlog
