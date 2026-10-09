# Platform : identité centrale et Révision

## Déploiement autonome

Root Directory Vercel : `apps/platform`, framework Next.js, build `npm run build`,
installation npm workspaces depuis le lockfile racine. Autoriser les fichiers hors
Root Directory pour les packages partagés. Aucun rewrite SPA Vite nécessaire.

Variables Platform :

- `NEXT_PUBLIC_SUPABASE_URL=https://nnsgvnjzfrcmbxfwlyow.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé publique Identity
- `SUPABASE_SERVICE_ROLE_KEY` : clé serveur Identity, jamais publique
- `ELIMA_API_BASE_URL=https://elima-api.vercel.app` : appels serveur login/bridge
- `NEXT_PUBLIC_REVISION_API_BASE_URL=https://elima-api.vercel.app` : services Révision navigateur
- `NEXT_PUBLIC_REVISION_SUPABASE_URL=https://rydnrvvmwixrkmnvpajf.supabase.co`
- `NEXT_PUBLIC_REVISION_SUPABASE_ANON_KEY` : clé publique Révision
- `ELIMA_MOBILE_APP_URL=https://app.elima.ci` : inscription/reset partagés existants
- Conserver les variables scolaires/communications existantes et `APP_ENV=production`, `ELIMA_APP_MODE=saas`.

Dans **API**, conserver les deux configurations Supabase séparées, Twilio/Azure et
ajouter l'origine Platform exacte à `REVISION_ALLOWED_ORIGINS` si elle est absente.
Pas de wildcard. Aucun secret Révision ni Twilio/Azure n'est nécessaire dans Platform
pour les nouvelles fonctionnalités. Ne pas remplacer les secrets scolaires existants.

## Flux

`/login` → numéro/mot de passe → adaptateur serveur → `/api/elima-password-login`
→ session Identity dans les cookies SSR existants → rôle lu dans `users` Identity.
La résolution serveur numéro → email existant est conservée pour les comptes scolaires
antérieurs aux emails synthétiques ; le mot de passe est toujours validé par l'API centrale.
Le middleware vérifie/renouvelle Identity et transmet les nouveaux cookies aux
Server Components et au navigateur. Les gardes scolaires restent responsables des rôles.
Inscription et reset ouvrent les écrans WhatsApp existants de Mobile : ils ne
connectent pas automatiquement le navigateur à Platform ; revenir au login Platform.

`/student/reviser` → POST privé `/api/revision/session` → vérification Identity et
rôle STUDENT → bridge commun → session technique Révision dans des cookies séparés.
Le navigateur utilise un client Révision explicitement distinct du singleton SSR
scolaire. Le logout supprime les deux sessions. Aucun matching par téléphone local.

Les données et écritures passent par revision-core : `record_quiz_attempt`,
`user_progress`, `quiz_attempts`, `quiz_sets`, `user_course_summaries`, documents,
préférences matières et API abonnement/génération/analyse communes. Les RLS utilisent
l'UUID local résolu par le bridge, pas l'UUID Identity.
Le scanner, les fiches, les QCM et le panneau matières/abonnement utilisent revision-ui.
Pas de copie d'une page Mobile/standalone ; pas de moteur de quotas/scoring propre à Platform.
Les achats restent gérés dans Révision Android. Les sessions Learning/parcours n'ont
pas de nouvel écran Platform dans cette étape.

## Héritage conservé (ne pas supprimer sans migration des appelants)

- `/api/mobile/me` : toujours appelé par elima-profile et identity-bridge du backend commun.
- `/api/mobile/activate-school` : toujours appelé par activate-school du backend commun.
- Email login et teacher-code login : compatibilité des comptes scolaires ; même projet Identity.
- `/api/auth/signup`, `/api/auth/verification/request`, `/api/auth/password/signup`,
  `/api/auth/password/reset/*`, `/api/auth/phone/*` : anciens contrats, conservés mais
  non utilisés par le nouveau login ni les liens signup/reset. Ne pas les rouvrir globalement.
- `/oauth/consent` et les routes OAuth associées : compatibilité historique, aucune
  dépendance OAuth dans le nouveau parcours Platform → Révision.
- Services admin/server et modules parents/profs/écoles : conservés.

## Vérification inter-apps avant déploiement

Avec un compte de recette : connexion Platform → Révision ; vérifier le même UUID local
que Mobile/standalone. Terminer un quiz, actualiser l'historique standalone, puis faire
le test inverse. Vérifier fiches, scan, matières et abonnement avec ce même compte.
Tester également parent, enseignant, admin et activation école. Aucun test ici ne crée
de compte ni ne modifie les bases distantes ; les tests unitaires ne remplacent pas cette recette.
