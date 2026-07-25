# Création de Supabase Production

Checklist manuelle :

1. créer un projet vide et conserver son Project ID dans le gestionnaire de
   secrets ;
2. renseigner URL, clé publique, clé serveur et URL PostgreSQL ;
3. définir `APP_ENV=production`,
   `SUPABASE_PRODUCTION_PROJECT_ID=<ref>` et le Project ID Demo distinct ;
4. exécuter `npm run db:push:production` et saisir la confirmation exacte ;
5. exécuter `supabase/seed.base.sql` uniquement ;
6. ne jamais exécuter `seed.demo.sql` ;
7. créer/vérifier les trois buckets privés ;
8. configurer Auth URLs, SMTP, WhatsApp, secrets et webhooks Production ;
9. tester chaque rôle et l'isolation de deux écoles avant ouverture.

La commande Production ne copie aucune donnée Demo.

