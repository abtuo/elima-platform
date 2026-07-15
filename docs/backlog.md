# Backlog — branchements restants

## Priorité haute

1. **API Bearer JWT** — Adapter les routes `elima.tech` pour `Authorization: Bearer` (upload, attendance, grades)
2. **Upload professeur réel** — Route mobile JWT + stockage privé/signé dans le bucket `documents`
3. **Scanner complet** — Upload Storage, OCR backend, génération de fiches et quiz IA

## Priorité moyenne

4. **Proxy IA production** — Déployer `VITE_REVISION_API_BASE_URL` avec transfert vers Azure OpenAI
5. **Migration utilisateurs Révision** — Remapper les anciennes progressions vers l’identité scolaire par email
6. **Messagerie temps réel** — Subscriptions Supabase après sécurisation RLS v2
7. **Gating branché** — Plans école depuis `schools.plan` en production
8. **Navigation SSO inverse** — Depuis `elima.ci`, ouvrir directement les parcours de `app.elima.ci` (révision, quiz, fiches, profil) sans reconnexion, avec une liste blanche stricte des destinations

## Priorité basse

9. **Notifications push** — Web Push API ou Capacitor
10. **Capacitor Android/iOS** — Packaging natif
11. **Icônes PWA définitives** — PNG 192/512 maskable
12. **WhatsApp option** — Gating premium, facturation pack

## Limites MVP actuelles

- Lecture des données via Supabase direct ou démo locale
- Upload professeur : UI prête, publication via API quand `VITE_MAIN_API_BASE_URL` et JWT sont disponibles
- Scanner : métadonnées enregistrées, analyse IA en attente du backend
- Offline professeur : file locale, synchronisation simplifiée
