# RLS et Storage

Le catalogue Demo vérifié contient les politiques scolaires et mobiles
historiques, plus les politiques du socle unifié.

Les nouvelles tables utilisent :

- membership propre ou administration du tenant ;
- accès élève/famille via `user_can_access_student` ;
- accès classe via `user_can_access_class` ;
- gestion des features par direction/administration ;
- documents selon tenant, audience et rôle.

Les buckets `documents`, `elima-files` et `exam-sources` sont privés. Les chemins
web doivent commencer par l'UUID `school_id`. Les politiques Storage refusent un
chemin d'un autre tenant.

Recette RLS à exécuter après le reset :

- anonyme : zéro lecture privée ;
- parent : uniquement ses deux enfants ;
- élève : uniquement sa ligne ;
- enseignant : uniquement ses classes ;
- administration : toute son école ;
- session forgée d'une autre école : zéro ligne.

