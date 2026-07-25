# Déploiement du nouvel accueil et de l’inscription

## Architecture retenue

- `elima.ci` reste l’autorité d’identité et crée les comptes.
- `app.elima.ci` affiche l’accueil public, la connexion et l’inscription.
- la base mobile conserve le profil lié nécessaire aux fonctions de l’application ; le bridge existant crée cette liaison après authentification centrale ;
- `demo.app.elima.ci` utilise les mêmes services et les mêmes données Supabase que `app.elima.ci`, mais affiche sur la page de connexion les raccourcis vers les comptes seed ;
- les deux sous-domaines peuvent pointer vers le même projet Vercel : seul l’affichage des comptes seed est choisi au runtime selon le nom d’hôte.

## Ordre recommandé

### 1. Développer sur une branche

Branche créée : `feature/public-auth-onboarding`.

Ne pas déployer directement sur `main`. Créer d’abord un déploiement Preview Vercel depuis cette branche.

### 2. Préparer elima.ci

Le code de référence `elima.tech` contient les changements nécessaires pour accepter un `schoolCode` lors de l’inscription d’un enseignant, d’un parent ou d’un personnel administratif.

Appliquer sur la base centrale elima.ci :

```text
web/supabase/migrations/20260716090000_school_join_codes.sql
```

Puis déployer la nouvelle version d’elima.ci contenant :

```text
web/src/app/api/auth/signup/route.ts
```

Cette étape doit précéder le déploiement public de l’app, sinon les inscriptions avec code école seront refusées.

### 3. Préparer la base mobile

Appliquer la migration des demandes de chefs d’établissement :

```bash
npm run db:migrate:registration-requests
```

Elle crée `school_registration_requests`. Cette table n’est pas accessible depuis le navigateur ; seule la fonction serveur Vercel enregistre les demandes.

### 4. Configurer le projet Vercel de l’app

Ajouter pour Production et Preview :

```text
VITE_APP_ENV=production
VITE_APP_MODE=auto
VITE_WEB_BASE_URL=https://www.elima.ci

VITE_ELIMA_IDENTITY_URL=https://<projet-identite>.supabase.co
VITE_ELIMA_OAUTH_CLIENT_ID=<client-oauth-app-elima>
VITE_ELIMA_OAUTH_REDIRECT_URI=https://app.elima.ci/auth/elima/callback
ELIMA_IDENTITY_PUBLISHABLE_KEY=<cle-publique-du-projet-identite-elima.ci>

VITE_SUPABASE_URL=https://<projet-mobile>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<cle-publique-du-projet-mobile>
SUPABASE_SECRET_KEY=<cle-secrete-du-projet-mobile>
```

`ELIMA_IDENTITY_PUBLISHABLE_KEY` est la clé publique/anon du projet Supabase utilisé par elima.ci, pas celle de la base mobile. Elle reste utilisée côté fonction Vercel.

Ne pas mettre `VITE_` devant une clé secrète.

### 5. Attacher les domaines

Dans le même projet Vercel, ajouter :

- `app.elima.ci` ;
- `demo.app.elima.ci`.

Avec `VITE_APP_MODE=auto` :

- `app.elima.ci` ouvre le nouvel accueil public ;
- `demo.app.elima.ci` ouvre le même accueil et le même parcours, puis affiche les comptes seed sur la page de connexion.

Pour un projet Vercel séparé réservé à la démo, utiliser plutôt `VITE_APP_MODE=demo`.

### 6. Créer les premiers codes école

Les codes sont stockés sous forme de hash. Exemple à adapter dans le SQL Editor de la base elima.ci :

```sql
insert into public.school_join_codes (
  school_id,
  code_hash,
  allowed_roles,
  expires_at,
  max_uses
)
values (
  '<UUID_ECOLE>',
  encode(digest(upper(regexp_replace('ECOLE-A1B2C3', '[^A-Za-z0-9]', '', 'g')), 'sha256'), 'hex'),
  array['ADMIN', 'TEACHER', 'PARENT'],
  now() + interval '90 days',
  500
);
```

Le code à communiquer est `ECOLE-A1B2C3`. La base ne conserve que son hash.

À terme, ajouter dans l’administration elima.ci un écran pour générer, désactiver et renouveler ces codes.

### 7. Tests avant bascule

1. `app.elima.ci` affiche Connexion et Inscription.
2. Connexion accepte un email central elima.ci.
3. Connexion accepte un téléphone créé sous forme de compte téléphone Elima.
4. Un élève peut créer un compte, sans confirmation email, puis accéder à Révision.
5. Un enseignant, parent ou personnel administratif ne peut pas s’inscrire sans code école valide.
6. Un chef d’établissement crée seulement une demande ; aucune école n’est ouverte automatiquement.
7. `demo.app.elima.ci` affiche les comptes seed, qui se connectent réellement aux mêmes services que sur `app.elima.ci`.
8. Les retours OAuth autorisés contiennent toujours `https://app.elima.ci/auth/elima/callback`.

## Réglage Supabase important

L’API centrale crée les comptes avec `email_confirm: true`. Aucune confirmation email n’est demandée dans le parcours actuel. La future vérification téléphone avec Twilio pourra être ajoutée sans changer les écrans de sélection de rôle.
