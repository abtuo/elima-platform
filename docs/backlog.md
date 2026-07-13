# Backlog — branchements restants

## Priorité haute

1. **API Bearer JWT** — Adapter routes `elima.tech` pour `Authorization: Bearer` (upload, attendance, grades)
2. **Upload professeur réel** — Route mobile JWT + stockage privé/signé bucket `documents`
3. **Scanner complet** — Upload Storage, OCR backend, génération fiche/quiz IA

## Priorité moyenne

4. **Proxy IA production** — Déployer `VITE_REVISION_API_BASE_URL` avec forward Azure OpenAI
5. **Mapping users** — Table `revision_user_links` si deux auth distinctes
6. **Messagerie temps réel** — Subscriptions Supabase, statut lu/non lu
7. **Gating branché** — Plans école depuis `schools.plan` en production

## Priorité basse

8. **Notifications push** — Web Push API ou Capacitor
9. **Capacitor Android/iOS** — Packaging natif
10. **Icônes PWA définitives** — PNG 192/512 maskable
11. **WhatsApp option** — Gating premium, facturation pack

## Limites MVP actuelles

- Lecture données via Supabase direct ou démo locale
- Upload prof : UI prête, publication via API quand `VITE_MAIN_API_BASE_URL` + JWT disponibles
- Scanner : métadonnées enregistrées, analyse IA en attente backend
- Offline prof : file locale, sync simplifiée
