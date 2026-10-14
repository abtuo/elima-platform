# Site public et Platform : séparation des domaines

## Projets Vercel

| Projet | Root Directory | Framework | Build | Domaines |
| --- | --- | --- | --- | --- |
| elima-site | apps/site | Next.js | npm run build | elima.ci, www.elima.ci |
| elima-platform | apps/platform | Next.js | npm run build | app.elima.ci |

Conserver l'installation npm du monorepo et son lockfile racine (npm ci depuis la racine), et autoriser les sources hors Root Directory pour les workspaces partagés. Laisser le répertoire de sortie Next.js par défaut. Aucun Ignored Build Step personnalisé.

Le prebuild copie les deux logos depuis @elima/branding. Les copies public/logo*.png sont générées et ignorées ; ne pas en faire de nouvelles sources de branding.

## Variables Site, publiques au build

```ini
NEXT_PUBLIC_PLATFORM_URL=https://app.elima.ci
NEXT_PUBLIC_MOBILE_URL=https://m.elima.ci
NEXT_PUBLIC_REVISION_URL=https://revision.elima.ci
NEXT_PUBLIC_REVISION_PLAY_STORE_URL=
```

Renseigner la dernière variable seulement avec l'URL Google Play réelle et publiée. Sinon le site affiche « bientôt disponible ». Redéployer après modification des variables publiques.

Site n'a besoin d'aucune clé Supabase, Twilio ou Azure. Son formulaire transmet les champs publics à l'endpoint existant app.elima.ci/api/demo-requests ; la base et l'envoi des notifications restent configurés dans Platform.

## Variables Platform

Conserver toutes les variables serveur, cookies, Identity et Révision existantes. Pour les liens entre produits en production :

```ini
ELIMA_SITE_URL=https://elima.ci
ELIMA_MOBILE_APP_URL=https://m.elima.ci
ELIMA_API_BASE_URL=https://api.elima.ci
NEXT_PUBLIC_REVISION_API_BASE_URL=https://api.elima.ci
```

La racine Platform vérifie la session serveur puis le rôle, ou renvoie à la connexion. Les anciennes pages marketing redirigent vers Site. Les routes scolaires, d'activation, d'auth et le backend de contact restent dans Platform.

## Ordre de bascule manuel

1. Déployer Platform et associer app.elima.ci. Vérifier login, rôles scolaires, activation et endpoint de démo.
2. Les trois URL de proxy communes (activation, profil, bridge) visent désormais app.elima.ci, pas www.elima.ci. Leur code doit être déployé avant de réaffecter www au site public. Aucun projet ni domaine API n'est modifié par ce chantier.
3. Créer/configurer elima-site, Root Directory apps/site, puis ajouter elima.ci et www.elima.ci. Saisir chez le fournisseur DNS les enregistrements exacts demandés par Vercel ; ne pas inventer de cible DNS.
4. Choisir https://elima.ci comme domaine canonique et configurer dans Vercel la redirection permanente www vers l'apex, en conservant chemins et paramètres.
5. Vérifier HTTPS, CTA Platform/Révision, contact et anciens liens marketing. Aucune modification des projets Mobile, Révision ou API n'est effectuée automatiquement.

Les CGV écoles existantes sont conservées sur /cgv. Les liens CGU, confidentialité et suppression de compte du footer pointent vers les pages légales Révision existantes, explicitement identifiées comme telles ; ils ne constituent pas une nouvelle politique juridique pour tous les produits.
