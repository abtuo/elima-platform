# Responsabilités web et mobile

Le web dans `web/` reste l'interface complète : administration, imports,
reporting, finances, paramétrage, emplois du temps et gestion détaillée.

Le mobile reste à la racine et optimise les parcours quotidiens : consultation,
saisie rapide, messagerie, devoirs, emploi du temps, quiz et révision.

Les deux partagent :

- Supabase Auth et les UUID utilisateurs ;
- le schéma canonique et les migrations ;
- les rôles, environnements et règles métier minimales dans `packages/` ;
- les élèves, familles, classes, notes, absences et données pédagogiques.

Ils ne partagent pas leurs requêtes d'affichage. Le mobile limite colonnes,
pagination et payloads dans `src/services/`. Le web conserve ses requêtes
agrégées et routes serveur dans `web/src/lib/` et `web/src/app/api/`.

`_references/elima.app` reste isolé. Il n'est ni importé, ni construit, ni
déployé.

