# Backlog — branchements restants

## Checklist obligatoire avant mise en production

- [ ] **Validation des nouveaux comptes** — Ne créer la session qu’après validation d’un code à usage unique : WhatsApp/SMS pour les téléphones et lien ou code pour les emails.
- [ ] **Fournisseur de validation** — Finaliser Twilio ou Azure Communication Services pour WhatsApp/SMS, puis Supabase Auth ou Resend pour les emails.
- [ ] **Sécurité des codes** — Ajouter expiration courte, nombre maximal d’essais, délai entre deux envois, limitation par IP/identifiant et journalisation des abus.
- [ ] **Parcours de récupération** — Implémenter « mot de passe oublié », changement de téléphone/email et récupération d’un compte dont le canal n’est plus accessible.
- [ ] **Tests d’inscription par rôle** — Tester élève autonome, élève rattaché, parent, enseignant et personnel administratif, avec codes école valides, expirés, révoqués et déjà utilisés.
- [ ] **Demandes des chefs d’établissement** — Prévoir la validation manuelle par Elima avant création effective de l’école et du premier compte administrateur.
- [ ] **Gestion des codes école** — Ajouter dans `elima.ci` la création, consultation, révocation, renouvellement, expiration et limitation des codes par rôle.
- [ ] **Audit SSO complet** — Tester inscription, connexion email/téléphone, rafraîchissement de session, expiration, déconnexion des deux applications et liaison d’un compte existant.
- [ ] **Fusion contrôlée des identités** — Définir le traitement des doublons lorsqu’un même utilisateur possède un compte téléphone, un compte email ou un ancien compte mobile.
- [ ] **Audit RLS et autorisations** — Vérifier chaque table avec les rôles élève, parent, professeur, administration et super-administration ; confirmer notamment l’isolation des messages et des données entre écoles.
- [ ] **Rotation des secrets** — Renouveler les clés Supabase secrètes, le mot de passe PostgreSQL et les clés Azure déjà utilisées pendant le développement ; vérifier qu’aucun secret n’est préfixé par `VITE_`.
- [ ] **Variables Vercel** — Vérifier séparément Preview et Production pour `elima.ci` et `elima.mobile`, puis documenter le propriétaire et le projet associés à chaque clé.
- [ ] **Migrations reproductibles** — Appliquer et vérifier toutes les migrations sur une base de préproduction propre, sauvegarder la production et préparer une procédure de retour arrière.
- [ ] **Séparation démo/production** — Confirmer que `demo.app.elima.ci` ne peut jamais écrire dans les données de production et que `app.elima.ci` n’active jamais les comptes ou fixtures de démonstration.
- [ ] **Domaines et OAuth** — Valider DNS, HTTPS, URLs de redirection OAuth et liste blanche des retours pour `app.elima.ci`, `demo.app.elima.ci` et les URLs locales autorisées.
- [ ] **Observabilité** — Ajouter le suivi des erreurs des fonctions Vercel, des échecs d’inscription/SSO, de la génération IA et des synchronisations, sans journaliser mots de passe, jetons ou données sensibles.
- [ ] **Tests de non-régression** — Automatiser les parcours critiques et effectuer une recette mobile/desktop sur Chrome, Safari et navigateurs Android, avec réseau lent et mode hors ligne.
- [ ] **Cache PWA** — Vérifier qu’un nouveau déploiement remplace rapidement l’ancien service worker et prévoir une action de rechargement en cas de version obsolète.
- [ ] **Conformité et support** — Finaliser conditions d’utilisation, politique de confidentialité, consentement des mineurs, suppression/export des données et canal de support.
- [ ] **Plan de lancement** — Prévoir sauvegarde, fenêtre de déploiement, tests de fumée, responsable de décision et procédure de rollback avant la fusion des branches.

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
