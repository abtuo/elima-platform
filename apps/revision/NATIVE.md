# Préparation native

La cible Capacitor est `ci.elima.revision` / **Elima Révision**, avec les assets
locaux de `dist` et l’origine Android `https://localhost`. Le projet Android
se trouve dans `apps/revision/android` (compileSdk/targetSdk 36).

- `npm run build:web --workspace @elima/revision` : PWA et service worker.
- `npm run build:native --workspace @elima/revision` : assets embarqués sans PWA/SW.

Les deux commandes nettoient et remplacent `dist`. Toujours relancer le build natif
avant `cap sync`; le build par défaut reste Web pour Vercel.

Depuis `apps/revision`, après configuration des variables ci-dessous :

```powershell
npm run build:native
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Java 21 et le SDK Android 36 sont nécessaires. Configurer `JAVA_HOME` et
`ANDROID_HOME` localement, ou ouvrir `apps/revision/android` dans Android Studio.
L’APK debug est généré dans `android/app/build/outputs/apk/debug/app-debug.apk`.
Le manifeste interdit le HTTP cleartext. Les permissions réseau sont `INTERNET`
et `ACCESS_NETWORK_STATE` (fusionnée depuis Network). La caméra externe et les
imports ne nécessitent aucune permission de stockage globale ni `CAMERA`.

## Configuration

Configurer dans `apps/revision/.env.native.local` (non versionné) ou dans
l’environnement de build :

```ini
VITE_APP_ENV=production
VITE_APP_MODE=production
VITE_REVISION_API_BASE_URL=https://elima-api.vercel.app
VITE_SUPABASE_URL=https://rydnrvvmwixrkmnvpajf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clé publique Révision>
```

`VITE_NATIVE_BUILD` est calculé par Vite. L’origine Capacitor est fixée à
`https://localhost` par la configuration native. Le backend devra autoriser cette
origine exacte dans `REVISION_ALLOWED_ORIGINS`, en conservant les origines Web.
Aucun wildcard ni changement CORS distant n’est effectué ici.

## Sessions

Le Web garde les clés et le stockage navigateur existants. Le natif utilise
`NativeSecureStorage` et `@aparajita/capacitor-secure-storage` (Android Keystore,
AES-GCM) pour la session Identity et la session Supabase Révision. Le driver
Capacitor est injecté par l’application : `@elima/auth` reste indépendant du runtime.
Une erreur du coffre ne déclenche aucune écriture dans le stockage navigateur.

Les anciennes valeurs présentes dans le stockage de la même WebView sont migrées
à la première lecture : écriture chiffrée réussie, puis retrait de l’ancienne
valeur. Une PWA installée et une application native ne partagent pas leur stockage :
une première connexion sera nécessaire dans la nouvelle application.

Le bouton Retour Android ferme d'abord les panneaux, puis le clavier, remonte les
étapes auth et confirme la sortie d'un quiz/exercice actif. Il parcourt ensuite
l'historique interne ; seule la racine (`/` ou `/student`) minimise l'application.
Les entrées OAuth historiques restent bloquées en natif, sans listener appUrlOpen.

La caméra native utilise `Camera.takePhoto`, sans enregistrement galerie ni
permission de stockage globale. Le file picker HTML reste dédié aux imports
PDF/JPEG/PNG. `appRestoredResult` est enregistré avant React : une photo récupérée
attend la restauration auth puis revient dans Scanner, sans analyse automatique.
Keyboard masque la navigation basse pendant la saisie. SystemBars de Capacitor
8.5 utilise les insets natifs et des icônes sombres sur fond clair, sans désactiver
l'edge-to-edge. Network alimente la bannière hors connexion, sans promettre une
synchronisation automatique des actions.

Après `cap add android`, vérifier sur appareil (gestes et navigation trois boutons,
portrait/paysage, WebView ancienne/récente) les insets, `adjustResize`, le clavier,
le refus/annulation caméra et la restauration après destruction d'activité.
Vérifier le manifeste fusionné : ne pas ajouter READ/WRITE_EXTERNAL_STORAGE ni
MANAGE_EXTERNAL_STORAGE. Le plugin caméra utilise une activité caméra externe.

## Validation à réaliser après création Android

Tester le coffre sur appareil (reprise, renouvellement, déconnexion, réinstallation),
configurer les exclusions de sauvegarde du stockage de sessions et valider CORS.
Le renouvellement Identity passe par `POST /api/elima-session`, puis par
`/auth/v1/token?grant_type=refresh_token` sur le projet Identity configuré côté API.
Aucune variable OAuth publique n’est nécessaire au login/refresh principal.
La rotation est sauvegardée avant le bridge ; un bridge interrompu est repris au
prochain essai. Un refresh définitivement invalide efface les deux sessions ; une
panne réseau conserve les tokens pour réessayer. La déconnexion efface le stockage
local et tente également la révocation Identity via `DELETE /api/elima-session`.
