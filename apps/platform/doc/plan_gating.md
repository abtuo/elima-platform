# Gating par plan Elima

Valeurs en base : `basic` | `premium` | `custom` (colonne `schools.plan`).

Hiérarchie : **custom** inclut **premium**, **premium** inclut **basic**.

## Règles transverses

| Règle | Comportement |
|---|---|
| École `is_demo = true` | Accès équivalent **Sur mesure** (`custom`) |
| Rôle `SUPER_ADMIN` | Bypass total du gating |
| Nouvelle école (signup admin) | `plan = basic` par défaut |
| Écoles sans plan | Migrées vers `basic` |

## Matrice des fonctionnalités

| Fonctionnalité | Clé | Basic | Premium | Custom |
|---|---|:---:|:---:|:---:|
| Élèves, classes, matières, enseignants | `core_admin` | oui | oui | oui |
| Notes, absences, devoirs, cahier de textes | `core_pedagogy` | oui | oui | oui |
| Bulletins PDF + branding | `reports` | oui | oui | oui |
| Emploi du temps | `timetable` | oui | oui | oui |
| Messagerie interne | `messaging` | oui | oui | oui |
| Portails parent / élève (consultation) | `parent_student_portal` | oui | oui | oui |
| Cockpit admin | `cockpit` | oui | oui | oui |
| Inscriptions en ligne (signup parent/prof) | `online_enrollment` | — | oui | oui |
| Module Finances | `finance` | — | oui | oui |
| Rôle Comptable | `comptable` | — | oui | oui |
| Elima Store | `store` | — | oui | oui |
| Paiement parent + factures PDF | `parent_payments` | — | oui | oui |
| KPIs avancés | `kpis` | — | oui | oui |
| Relances + WhatsApp | `whatsapp_reminders` | — | oui | oui |
| Import IA listes élèves | `ai_import` | — | — | oui |
| OCR documents | `ocr` | — | — | oui |
| Assistant administratif IA | `admin_assistant` | — | — | oui |
| Reporting comptable avancé | `advanced_reporting` | — | — | oui |
| Console multi-établissements | `multi_school` | — | — | oui |

## Implémentation code

| Fichier | Rôle |
|---|---|
| `src/lib/plans.ts` | Types, `hasFeature`, mapping routes |
| `src/lib/plans-server.ts` | Lecture BDD, `assertSchoolFeature`, `checkSchoolFeature` |
| `src/lib/marketing-plans.ts` | Listes tarifs (home + `/tarifs`) |
| `src/components/ui/PlanGate.tsx` | Garde serveur dashboard / portail parent |
| `src/components/ui/PlanUpgradeCard.tsx` | Écran upgrade neutre |

## Routes UI protégées

| Route | Feature |
|---|---|
| `/dashboard/finance` | `finance` |
| `/dashboard/supplies` | `store` |
| `/dashboard/kpis` | `kpis` |
| `/parent/pay` | `parent_payments` |
| `/parent/store` | `store` |
| `/parent/invoices` | `parent_payments` |

## Routes API protégées

| Groupe | Feature |
|---|---|
| `/api/dashboard/finance/*` | `finance` |
| `/api/dashboard/supplies/*` | `store` |
| `/api/dashboard/kpis` | `kpis` |
| `/api/dashboard/students/import`, `validate-import` | `ai_import` |
| `/api/parent/finance/pay` | `parent_payments` |
| `/api/parent/store` | `store` |
| `/api/parent/invoices` | `parent_payments` |
| `/api/teacher/supplies/*` | `store` |
| `/api/notifications/whatsapp` | `whatsapp_reminders` |
| Signup parent/prof (école existante) | `online_enrollment` |

## Offres marketing

Les trois offres et leurs listes de fonctionnalités sont centralisées dans `src/lib/marketing-plans.ts` et affichées sur `/` et `/tarifs`.
