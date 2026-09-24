# Build autonome Elima Révision

## Entrée et commandes

`apps/revision/index.html` charge `src/main.tsx`, `RevisionApp` puis le routeur
Révision. Le routeur historique `apps/mobile/src/app/router.tsx` reste celui du build Mobile.

```sh
npm run dev:revision
npm run build:revision
npm run preview:revision
npm run typecheck
npm test
npm run build
```

La sortie autonome est `apps/revision/dist/`, celle de Mobile est
`apps/mobile/dist/`. Preview sert les fichiers statiques, pas les fonctions Vercel : les
opérations backend réelles nécessitent un serveur API ou le déploiement web.
Dev réutilise les handlers serveur existants, sans les embarquer dans le client.
`envDir` pointe vers apps/revision ; Vite lit également
l'environnement racine pour la compatibilité locale. Les valeurs applicatives
ont priorité. Les variables Vite publiques existantes sont conservées.

## Frontière du produit

Le produit inclut l'authentification, l'inscription élève avec vérification,
la récupération du mot de passe, Réviser (QCM/parcours/fiches), quiz, sessions,
résultats, historique et profil autonome. Les liens de compatibilité devoirs/examen
sont conservés. Le guard exige le rôle STUDENT. Les routes inconnues reviennent
à l'entrée publique ou à Réviser selon la session.

Il n'importe aucune page parent, enseignant, admin ou dashboard élève School,
ni scanner, messagerie, fournitures, finances, notes ou emplois du temps.
`apps/revision/vite.config.ts` vérifie les modules réellement présents dans les chunks
Rollup, échoue en cas de module interdit et émet `revision-build-modules.json`.
Les tests du routeur complètent cette barrière de build.

AuthProvider et LoginPage reçoivent les comptes/profils démo depuis chaque
routeur. Les données démo pédagogiques sont isolées dans `revisionDemoData.ts`.
`profileService.ts` contient la lecture de profil partagée sans importer les
données démo School. `roleService.ts` garde ses exports compatibles pour School.
L'inscription autonome ne contient que le parcours élève et ne référence aucun
rôle ou endpoint d'inscription School.

## PWA web et futur natif

La fabrique `createElimaViteConfig` dans `apps/revision/vite.base.ts` configure les
plugins, alias et handlers propres au shell autonome.
La PWA/Workbox reste active pour Révision Web. À l'étape Capacitor, la distinction
Web/Native sera ajoutée dans cette fabrique, autour de l'enregistrement du plugin
VitePWA, pour omettre manifest, service worker et enregistrement SW du natif.
Aucun mode natif, dossier Android ou dépendance Capacitor n'est créé ici.

## Endpoints relatifs à adapter ensuite

Endpoints applicatifs présents dans le bundle :

- `/api/learning`
- `/api/revision-generate`
- `/api/identity-bridge`
- `/api/elima-password-login`
- `/api/elima-profile`
- `/api/elima-signup`
- `/api/auth-verification-request`
- `/api/auth-password-reset`

`/api/activate-school` et `/api/registration-request` ne sont pas embarqués.
La chaîne `/api/broadcast` appartient au client Realtime Supabase et utilise
sa base Supabase HTTPS ; ce n'est pas un appel relatif au backend Elima.

## Couplages et étape suivante

- Les services Révision et identité utilisent encore les chemins relatifs ci-dessus.
- Le profil partagé lit users/student_profiles, et éventuellement schools,
  students/classes pour les comptes déjà rattachés. Le profil autonome tolère
  l'absence d'école, classe, progression et historique, sans lire les notes/devoirs.
- `getStudentRevisionLevel` consulte encore students/classes ; il faudra préférer
  le niveau du profil autonome dans une étape dédiée.
- Les sessions pédagogiques et certains historiques utilisent localStorage ;
  le stockage et OAuth/redirects natifs seront traités avant la publication.
- Les ressources public et les styles nécessaires sont maintenant possédés par
  `apps/revision`. Le scanner reste exclu.

La prochaine étape est une abstraction commune de construction des URLs API,
configurée par une base HTTPS publique validée, puis l'adaptation serveur des
origines/CORS et des flux OAuth pour la WebView. Ne jamais exposer une clé serveur
dans VITE_*. Cette migration n'est pas commencée ici.

## Validation du 15 septembre 2026

- TypeScript, `npm test` (70 tests), build normal et build Révision : réussis.
- Lint : aucune erreur, 20 avertissements existants/non bloquants.
- Bundle Révision inspecté : aucun module interdit ni compte démo Parent/Prof/Admin,
  aucun endpoint registration-request/activate-school.
- Edge headless : 61 contrôles en dev puis 62 en preview. Les pages publiques,
  QCM, parcours, fiches, quiz, session et profil sont vérifiés à 320, 360, 390,
  412 et 768 px, sans débordement horizontal ni erreur JavaScript.
- Connexion/restauration, inscription élève et vérification, logout, guard School,
  route inconnue et profil sans école/classe/progression/historique : vérifiés
  avec des réponses backend simulées. Aucun compte réel créé, aucun WhatsApp envoyé.
  Le reset réel et OAuth réel ne sont pas exécutés ; leurs services sont conservés.
- JavaScript principal : 1 123,00 kB (320,83 kB gzip), Révision : 976,37 kB
  (284,64 kB gzip). Dossiers complets : environ 7,08 et 6,96 MiB ; les images et
  polices publiques partagées limitent la réduction du volume total.

Le navigateur intégré était indisponible dans cette session. Les contrôles ont
donc utilisé Edge avec Playwright Core installé seulement dans un dossier
temporaire ignoré, sans ajout aux dépendances/package-lock du projet.
