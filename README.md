# Elima — Plateforme scolaire intelligente

MVP Next.js + TypeScript pour la gestion administrative des écoles (Afrique de l’Ouest), avec:

- Gestion académique (présences, notes, suivi)
- Intelligence académique (risk_level, trend)
- Notifications WhatsApp (Twilio)
- Génération de bulletin PDF
- Base de schéma Supabase multi-école (RBAC)

## Stack

- Next.js (App Router) + TypeScript
- TailwindCSS
- Supabase (schema SQL fourni)
- Twilio WhatsApp API
- pdf-lib pour génération bulletin

## Setup local

1. Copier les variables d’environnement:

```bash
cp .env.example .env.local
```

2. Renseigner les clés Supabase/Twilio.

3. Lancer en local:

```bash
npm install
npm run dev
```

## Structure principale

- `supabase/schema.sql`: schéma SQL MVP (tables, types, index, fonctions helper RBAC)
- `src/app/dashboard`: vue direction
- `src/app/teacher`, `src/app/parent`, `src/app/student`: espaces rôles
- `src/app/api/attendance`: endpoint présence
- `src/app/api/grades`: endpoint notes
- `src/app/api/notifications/whatsapp`: endpoint notifications WhatsApp
- `src/app/api/reports/[studentId]`: génération PDF bulletin
- `src/lib/academic-intelligence.ts`: moteur de règles
- `src/middleware.ts`: protection routes + contrôle rôle

## Déploiement

Déploiement recommandé sur Vercel. Ajouter les variables d’environnement dans Project Settings > Environment Variables.

## Database (Supabase) – schema & seed

### Apply schema
Le schéma PostgreSQL complet (MVP) est dans :

- `supabase/schema.sql`

Pour l’appliquer sur **Supabase Cloud** :
1. Supabase project → **SQL Editor**
2. Colle `supabase/schema.sql`
3. Run.

### Seed (dataset réaliste Côte d’Ivoire)

- `supabase/seed.sql`

Ce seed génère :
- 2 écoles (Yakro + Cocody)
- ~68 classes
- ~2400 élèves (sans compte Auth requis)
- 134 enseignants (Auth users + `public.users` + `public.teachers`)
- ~1550 parents (Auth users + `public.users` + `public.parents`)
- liens parent↔élève, incluant des **parents cross-school**
- 1 conversation de démo + 2 messages

Exécution :
1. Supabase project → **SQL Editor**
2. Colle `supabase/seed.sql`
3. Run.

### Sanity check (après seed)

- `supabase/sanity-check.sql`

Exécution :
1. Supabase project → **SQL Editor**
2. Colle `supabase/sanity-check.sql`
3. Run.

Mot de passe par défaut pour les comptes créés dans `auth.users` :
- `Password123!`

Comptes exemples :
- `admin.yakro@elima.demo`
- `admin.cocody@elima.demo`
- `teacher0001@elima.demo`
- `parent0001@elima.demo`
