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
