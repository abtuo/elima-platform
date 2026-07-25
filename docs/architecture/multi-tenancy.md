# Multi-tenancy

Chaque ligne privée porte directement `school_id` ou dépend d'une ligne qui le
porte. Les index commencent par le tenant lorsque les politiques l'utilisent.

Règles d'autorité :

- administrateur/direction : établissement de son membership ;
- enseignant : classes affectées ;
- parent : élèves liés par `student_parents` ;
- élève : ligne `students.user_id = auth.uid()` ;
- anonyme : aucune donnée privée.

Les contrôles d'interface ne remplacent pas RLS. Les routes utilisant une clé
serveur doivent vérifier l'acteur puis filtrer explicitement `school_id`.

`school_memberships` est canonique pour les nouvelles fonctionnalités.
`users.school_id` ne sera supprimé qu'après adaptation et recette complète des
deux interfaces.

