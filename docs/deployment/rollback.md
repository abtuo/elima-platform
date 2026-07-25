# Rollback

## Code

Revenir au commit précédent le déplacement ou utiliser :

- mobile : branche `backup/pre-unified-elima-architecture-20260725`,
  commit `c416dea` ;
- web : même branche sur `abtuo/elima.git`, commit `a91a5a9`.

Le web historique peut être recloné dans `_references/elima.tech`.

## Base Demo

Les snapshots locaux du 25 juillet 2026 sont dans `supabase/backups/` et exclus
de Git. Avant un rollback complet, produire aussi un `pg_dump` officiel depuis
Supabase/Docker.

La migration tenant est additive. Le rollback applicatif recommandé consiste à
redéployer le code précédent en laissant les nouvelles tables en place.

Si leur suppression est indispensable :

1. suspendre les écritures ;
2. exporter les quatre nouvelles tables et les objets d'onboarding ;
3. retirer les nouvelles politiques Storage ;
4. restaurer la visibilité antérieure des buckets seulement si le code précédent
   l'exige, avec acceptation explicite du risque ;
5. supprimer en ordre inverse `documents`, `school_features`, `enrollments`,
   `school_memberships` ;
6. ne supprimer les tables d'onboarding que si elles étaient absentes du projet
   restauré ;
7. restaurer les données depuis le snapshot et vérifier Auth/RLS.

Un reset Demo interrompu se relance avec les mêmes variables : le nettoyage est
contrôlé et le seed recrée les données.

