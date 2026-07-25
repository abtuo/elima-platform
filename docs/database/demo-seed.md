# Seed Demo

La Demo cible exactement :

- une école : `Collège Moderne Abidjan` ;
- une année active ;
- 10 classes, 11 matières, 18 enseignants ;
- 80 à 150 élèves et 40 à 80 parents ;
- notes, présences, retards, devoirs, documents, messages, notifications ;
- paiements `paid`, `partial`, `pending`, `late` ;
- profils pédagogiques, recommandations et historiques de quiz ;
- un compte `parent.multi@demo.elima.invalid` lié exactement à Awa Koné et
  Lina Traoré, dans deux classes différentes.

Le mot de passe commun des comptes Demo est fourni uniquement par
`SEED_AUTH_PASSWORD` dans le gestionnaire de secrets. Il n'existe aucune valeur
par défaut dans Git.

Le seed hybride utilise l'API Auth pour les comptes, puis
`supabase/seed.demo.sql` pour les invariants SQL et feature flags.

