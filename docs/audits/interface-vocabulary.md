# Inventaire du vocabulaire visible

Référence avant refonte. Aucun libellé ci-dessous ne doit être renommé par une
harmonisation technique de tables.

## Mobile

| Espace | Navigation et termes principaux |
|---|---|
| Parent | Accueil, Enfants, Paiements, Communication, Messages, Profil, Fournitures |
| Élève | Accueil, Emploi du temps, Planning, Réviser, Mes documents, Devoirs, Profil |
| Enseignant | Aujourd'hui, Classes, Devoirs, Publier, Communication, Messages |
| Administration | Pilotage, Annuaire, Finances, Communication, Messages, Profil |
| Rôles | Super administrateur, Chef d'établissement, Comptable, Enseignant, Parent d'élève, Élève |
| Auth | Connexion, Inscription, Mot de passe oublié |

## Web

| Espace | Navigation et termes principaux |
|---|---|
| Administration | Vue d'ensemble, KPIs, Élèves, Enseignants, Classes, Présences, Finances, Fournitures, Bulletins, Messagerie, Paramètres |
| Enseignant | Vue d’ensemble, Emploi du temps, Notes, Moyennes, Présences, Devoirs, Fournitures, Cahier de textes, Messagerie, Todo, Ressources, Paramètres |
| Parent | Espace Parent, Notes, Absences, Devoirs, Emploi du temps, Bulletins, Paiements, Messagerie |
| Élève | Espace Élève, Notes, Absences, Devoirs, Emploi du temps, Bulletins, Messagerie |
| Actions communes | Déconnexion, Se déconnecter, Chargement, Redirection |

## Règle de comparaison

Le modèle technique conserve `students`, `parents`, `classes` et `subjects`.
Même si une future table de liaison s'appelle `school_memberships`, les
interfaces gardent leurs libellés actuels. Le résultat attendu après déplacement
du web est zéro changement de vocabulaire métier visible.

L'audit après build comparera notamment les constantes de navigation mobile, les
layouts Next.js et les textes des formulaires Auth.

