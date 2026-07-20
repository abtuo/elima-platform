# Déploiement de l'authentification WhatsApp

## Architecture retenue

- `elima.mobile` affiche les parcours d'inscription et de récupération.
- Les fonctions `/api/auth-*` du mobile relaient les demandes sans exposer de secret au navigateur.
- `elima.tech` reste l'autorité d'identité : il stocke les challenges hachés, vérifie les codes et modifie Supabase Auth.
- Les anciennes pages `/signup/*` d'`elima.tech` redirigent vers `https://app.elima.ci/auth/inscription`.

## Prérequis avant mise en production

1. Appliquer `supabase/migrations/20260720193000_auth_verification_challenges.sql` sur le projet Supabase d'identité d'`elima.tech`.
2. Créer dans Twilio Content un template WhatsApp de type Authentication, le faire approuver par Meta et relever son Content SID `HX...`.
3. Configurer côté serveur `elima.tech` :
   - `TWILIO_ACCOUNT_SID` ;
   - `TWILIO_AUTH_TOKEN` ;
   - `TWILIO_WHATSAPP_FROM` ;
   - `TWILIO_WHATSAPP_AUTH_CONTENT_SID` ;
   - `AUTH_OTP_SECRET`, secret aléatoire distinct d'au moins 32 octets ;
   - `APP_ENV=production`.
4. Configurer `VITE_WEB_BASE_URL` côté fonctions du mobile vers le domaine déployé d'`elima.tech`.
5. Redéployer d'abord `elima.tech`, puis `elima.mobile`.

En production, l'envoi OTP échoue volontairement si le Content SID n'est pas configuré. Le message texte libre reste autorisé uniquement en local, démo ou staging afin de faciliter les essais avec le sandbox Twilio.

## Recette minimale

- créer un compte avec email et numéro WhatsApp ;
- créer un compte avec numéro de téléphone comme identifiant ;
- vérifier qu'un code erroné est refusé et que le sixième essai est bloqué ;
- vérifier l'expiration après 10 minutes et le délai d'une minute avant renvoi ;
- réinitialiser le mot de passe avec le numéro associé ;
- vérifier qu'une adresse ou un numéro inconnu reçoit une réponse non révélatrice ;
- vérifier qu'un appel direct à `/api/auth/signup` sans challenge est refusé ;
- vérifier qu'une ancienne URL `/signup/*` redirige vers l'application mobile.

## Hors périmètre actuel

Le changement de numéro lorsque l'utilisateur n'a plus accès à son ancien WhatsApp nécessite un processus d'assistance et de vérification d'identité. Il ne doit pas être automatisé sans procédure métier validée.
