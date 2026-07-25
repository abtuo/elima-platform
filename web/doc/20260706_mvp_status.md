Voici une synthèse structurée à partir de l’inspection du dépôt (v0.1.0, ~193 fichiers TS/TSX, ~58 routes API, 45 pages, 17 migrations SQL, 6 rôles).

---

## Estimation temps & coût

### Ce qui est déjà construit

| Indicateur | Valeur |
|---|---|
| Code applicatif | ~975 Ko (~20 000–25 000 lignes estimées) |
| Pages | 45 |
| Routes API | ~58 |
| Modules métier | 12+ (auth, admin, prof, parent, élève, finance, store, messagerie, bulletins, KPIs, démo…) |
| Maturité | **MVP avancé / prototype pilote** — large surface fonctionnelle, mais paiements simulés, pas de gating par plan, RLS partiel, peu de tests |

### Estimation du travail déjà réalisé

| Module | Complexité | Temps estimé (1 dev senior) |
|---|---|---|
| Setup (Next.js 16, Supabase, déploiement) | Moyenne | 1–2 sem. |
| Schéma BDD + 17 migrations | Élevée | 2–3 sem. |
| Auth multi-rôles (6 rôles, 5 modes de connexion) | Élevée | 2–3 sem. |
| Dashboard admin (cockpit, KPIs, élèves, profs, classes) | Très élevée | 5–7 sem. |
| Portail professeur (notes, absences, devoirs, EDT, cahier de textes…) | Très élevée | 5–7 sem. |
| Portail parent + élève | Moyenne | 2–3 sem. |
| Finance (soldes, encaissements, PDF, export) | Moyenne | 3–4 sem. |
| Elima Store (fournitures, packs, commandes) | Moyenne | 2–3 sem. |
| Messagerie interne + notifications | Moyenne | 2–3 sem. |
| Bulletins PDF + intelligence académique | Moyenne | 2–3 sem. |
| Import IA élèves (PDF/Excel) | Moyenne | 1–2 sem. |
| Mode démo + scripts seed | Moyenne | 1–2 sem. |
| Pages marketing + tarifs | Faible | 1 sem. |
| WhatsApp (Twilio/Azure, partiel) | Moyenne | 1 sem. |

**Total estimé : 1 200 à 1 800 heures** (soit **7 à 11 mois** à temps plein pour 1 dev senior, ou **4 à 6 mois** avec 2 devs).

### Estimation coût (selon profil)

| Profil | Taux horaire | Coût total estimé |
|---|---|---|
| Dev freelance Afrique de l’Ouest | 25–40 €/h | **30 000 – 72 000 €** |
| Dev full-stack mid/senior (Europe) | 50–70 €/h | **60 000 – 126 000 €** |
| Agence / ESN | 80–120 €/h | **96 000 – 216 000 €** |

**Fourchette réaliste pour ce niveau de produit : 50 000 – 100 000 €** de travail déjà investi, si réalisé par une petite équipe expérimentée.

### Travail restant pour une mise en production commerciale

| Poste | Temps | Coût (50 €/h) |
|---|---|---|
| Intégration paiement réel (Wave, Orange, MTN, CinetPay…) | 4–6 sem. | 8 000 – 15 000 € |
| Gating par plan (`schools.plan`) | 1–2 sem. | 2 000 – 4 000 € |
| RLS / sécurité production | 2–3 sem. | 4 000 – 6 000 € |
| Barèmes de frais + échéanciers (tables existantes, pas d’UI) | 3–4 sem. | 6 000 – 8 000 € |
| Tests automatisés + CI | 2–3 sem. | 4 000 – 6 000 € |
| Modules incomplets (ressources prof, todos persistés…) | 2–3 sem. | 4 000 – 6 000 € |
| **Total production-ready** | **3–5 mois** | **28 000 – 45 000 €** |

---

## Inventaire complet des fonctionnalités développées

### Site public & acquisition
- Landing page (`/`)
- Page tarifs Basic / Premium / Sur mesure (`/tarifs`)
- Formulaire de demande de démo (`/contact` → table `demo_requests`)
- Emails de notification (Resend)

### Authentification & onboarding
- Connexion email/mot de passe
- Connexion téléphone (OTP)
- Connexion téléphone + mot de passe
- Connexion prof par matricule + code d’accès → changement de PIN obligatoire
- Inscription admin (crée l’école + compte `SCHOOL_ADMIN`)
- Inscription professeur (rejoint une école existante)
- Inscription parent (rejoint une école existante)
- Gestion des rôles : `SUPER_ADMIN`, `SCHOOL_ADMIN`, `COMPTABLE`, `TEACHER`, `PARENT`, `STUDENT`
- Mode démo avec comptes pré-remplis et date figée

### Dashboard administrateur
- **Cockpit** : KPIs, élèves à risque, performances par classe, alertes, actions rapides
- **KPIs avancés** : assiduité, distribution des notes, moyennes par matière, tendances mensuelles
- **Élèves** : liste, profils, import IA depuis PDF/Excel (OpenAI), validation
- **Professeurs** : CRUD, codes d’accès, affectations classe/matière
- **Classes** : gestion, effectifs, liens profs
- **Absences** : vue établissement
- **Finance** : soldes, encaissements manuels, export Excel, liste impayés, relances internes
- **Fournitures** : validation des listes prof → publication → notification parents
- **Bulletins** : génération PDF avec logo/cachet école
- **Messagerie** : inbox établissement
- **Paramètres** : profil, trimestre courant, logo + cachet
- **Setup** : configuration niveaux/classes/matières (page existante, hors menu)

### Portail professeur
- Tableau de bord (cours du jour, matières)
- Emploi du temps (annulation/déplacement de séances + notification)
- Saisie des notes + création d’évaluations + notification parents
- Moyennes par classe/matière
- Appel / absences
- Devoirs (CRUD + upload fichiers)
- Cahier de textes (lesson logs)
- Listes de fournitures (soumission → validation admin)
- Messagerie
- Mémo/Todo *(UI seulement, non persisté en BDD)*
- Ressources pédagogiques *(stub — non branché)*
- Paramètres profil

### Portail parent
- Tableau de bord multi-enfants (notes, absences, devoirs, EDT, bulletins)
- Messagerie
- Paiement des frais *(simulé Mobile Money / carte)*
- Boutique fournitures (packs essential / recommended / premium)
- Factures & reçus PDF (frais + fournitures)

### Portail élève
- Tableau de bord personnel (notes, absences, devoirs, EDT, bulletins)
- Messagerie

### Finance
- Barèmes & échéanciers en BDD (`fee_structures`, `fee_installments`) — **sans UI admin**
- Calcul des soldes (modèle normalisé + fallback legacy `student_payments`)
- Encaissement admin (espèces)
- Paiement parent simulé avec `payment_provider`
- Factures PDF homogènes (frais + fournitures)
- Export impayés, relances via messagerie interne
- Rôle `COMPTABLE` (accès finance uniquement)

### Elima Store
- Catalogue produits, listes par classe, packs (essential / recommended / premium)
- Workflow : brouillon → validation admin → publication
- Commande parent, facture PDF, retrait à l’école
- RLS Supabase dédié au store

### Académique & rapports
- Évaluations, notes, coefficients, trimestres
- Bulletins PDF personnalisés (logo, cachet, appréciations)
- Profils d’apprentissage / élèves à risque
- Classements

### Communication
- Messagerie multi-types (parent-prof, parent-admin, annonces classe, rappels paiement, notes, absences, commandes store…)
- Compteur messages non lus
- WhatsApp via Twilio/Azure *(réel en mode SaaS, simulé en démo)*

### Infrastructure & ops
- Multi-tenant par `school_id`
- Branding école (logo, cachet, devise FCFA)
- Scripts seed/reset démo
- 2 tests unitaires

---

## Répartition par offre commerciale

> **Note importante** : la colonne `schools.plan` existe en BDD mais **aucun gating n’est implémenté** dans le code. Ci-dessous : ce qui est **déjà développé**, classé selon la logique de `/tarifs`.

### Basic — Gratuit *(cœur pédagogique, déjà fonctionnel)*

| Fonctionnalité | État |
|---|---|
| Gestion élèves / classes / matières | ✅ Complet |
| Gestion professeurs + codes d’accès | ✅ Complet |
| Notes & évaluations | ✅ Complet |
| Absences / appel | ✅ Complet |
| Bulletins PDF | ✅ Complet |
| Emploi du temps | ✅ Complet (+ annulation/déplacement) |
| Devoirs + cahier de textes | ✅ Complet |
| Communication parents (messagerie interne) | ✅ Complet |
| Portail parent (consultation) | ✅ Complet |
| Portail élève | ✅ Complet |
| Branding école (logo, cachet) | ✅ Complet |
| Cockpit admin basique | ✅ Complet |

### Premium — Payant *(développé en grande partie, mais partiellement simulé)*

| Fonctionnalité | État |
|---|---|
| Inscriptions en ligne | ⚠️ Partiel (signup parent/prof, pas de workflow complet) |
| Paiements Mobile Money | ⚠️ **Simulé** (pas de PSP réel) |
| Suivi des paiements & soldes | ✅ Complet |
| Relances impayés | ⚠️ Messagerie interne (pas toujours WhatsApp) |
| Dashboard financier + export | ✅ Complet |
| Factures PDF | ✅ Complet |
| Elima Store (fournitures) | ✅ Complet (paiement simulé) |
| KPIs & analytics avancés | ✅ Complet |
| Import IA liste élèves | ✅ Complet |
| Relances WhatsApp | ⚠️ Infrastructure prête, usage limité |
| Rôle comptable | ✅ Complet |

### Premium+ / Sur mesure *(peu ou pas développé)*

| Fonctionnalité | État |
|---|---|
| OCR documents scannés | ❌ Non (import texte/PDF via OpenAI seulement) |
| Assistant administratif IA | ❌ Marketing seulement (`ai_insights` en seed) |
| Compta / budget / reporting avancé | ❌ Non |
| Barèmes de frais + échéanciers (UI) | ❌ Tables BDD seulement |
| Console multi-écoles (`SUPER_ADMIN`) | ❌ Non |
| Audit logs | ❌ Table vide, non utilisée |
| Todos/mémos prof persistés | ❌ UI locale seulement |
| Ressources pédagogiques | ❌ Stub |
| Inscription élève en ligne | ❌ Non |
| Paiement réel Wave/Orange/MTN | ❌ Non |
| Gating par plan | ❌ Non |
| Support prioritaire | — (ops, pas code) |

---

## Suggestions de nouvelles fonctionnalités

### Priorité haute — impact commercial immédiat (Afrique de l’Ouest)

1. **Intégration paiement réel** (Wave, Orange Money, MTN MoMo, CinetPay) avec webhooks, statuts `pending`/`failed`, reçus automatiques
2. **Barèmes de frais visuels** : création des frais par niveau/classe, échéanciers, affectation automatique aux élèves
3. **Relances WhatsApp automatiques** : impayés J+7, J+15, avant rentrée
4. **Gating par plan** : verrouiller finance/store/WhatsApp derrière Premium
5. **Inscription en ligne complète** : dossier élève, pièces jointes, validation admin, paiement d’inscription

### Priorité moyenne — différenciation produit

6. **Application mobile parent** (PWA ou React Native) — consultation notes + paiement
7. **Présence biométrique / QR code** à l’entrée de l’école
8. **Transport scolaire** : bus, arrêts, notifications d’arrivée
9. **Cantine** : menus, commandes, paiement
10. **Examens blancs / concours** : sujets, correction, statistiques
11. **Bibliothèque scolaire** : prêt de livres, retards
12. **Gestion du personnel** (non-enseignants) : secrétariat, gardien, comptable

### Priorité basse / Premium+ — valeur ajoutée IA

13. **Assistant admin conversationnel** : « Qui n’a pas payé la 2e tranche en 6ème ? », génération de listes
14. **Détection précoce décrochage** : alertes automatiques basées sur notes + absences + tendance
15. **Génération automatique d’emploi du temps** (contraintes salles/profs)
16. **OCR bulletins / relevés** pour import depuis d’autres établissements
17. **Tableau de bord multi-écoles** pour groupes scolaires / franchises
18. **Module comptabilité** : journal, grand livre, bilan simplifié OHADA

### Fonctionnalités « quick wins » (peu d’effort, bonne perception)

19. Persister les todos/mémos prof (tables déjà en BDD)
20. Brancher la page Ressources prof sur Supabase Storage
21. Ajouter `/dashboard/setup` au menu latéral
22. Notifications push (web) pour nouvelles notes/absences
23. Export bulletins en masse (toute une classe en ZIP)
24. Signature électronique des bulletins par le directeur

---

## Synthèse stratégique

| | |
|---|---|
| **Valeur actuelle** | Produit démo/pilote très solide pour convaincre des écoles ; le cœur pédagogique est au niveau d’un MVP commercial |
| **Blocage principal à la monétisation** | Paiements simulés + absence de gating par plan |
| **Investissement déjà fait** | ~50 000 – 100 000 € équivalent |
| **Pour lancer Premium** | ~30 000 – 45 000 € et 3–5 mois supplémentaires |
| **Positionnement recommandé** | Basic gratuit pour acquisition → Premium dès paiement réel + relances WhatsApp → Sur mesure pour groupes scolaires + IA |

Si tu veux, je peux enchaîner sur un **roadmap trimestriel chiffré** ou un **tableau de gating plan par plan** prêt à implémenter dans le code.