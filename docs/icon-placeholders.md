# Cahier des charges des icônes Elima

Ce document est l’inventaire de référence pour générer ou commander les icônes de l’application Elima Mobile. Il couvre les matières, les navigations Parent/Élève/Professeur/Admin, les actions métier, les alertes et les états vides observés dans le code.

## 1. Recommandation générale

Ne pas remplacer toutes les icônes techniques par des images générées. Les commandes comme retour, fermeture, recherche, suppression ou chevron doivent rester des SVG vectoriels simples et immédiatement reconnaissables. Les illustrations personnalisées Elima doivent être réservées aux matières, aux fonctionnalités principales, aux grands boutons et aux états vides.

Ordre conseillé :

1. **P0 — 13 icônes de matières** : indispensables et très visibles dans Quiz, Notes, Moyennes et Fiches.
2. **P1 — 20 icônes de fonctions principales** : navigation et grandes cartes d’action.
3. **P2 — 9 illustrations d’état** : écrans vides, succès et hors-ligne.
4. **P3 — variantes animées** : uniquement après validation du set statique.

## 2. Direction artistique Elima

### Style maître à donner au générateur

> Icône d’application éducative premium et chaleureuse pour Elima, illustration vectorielle 2.5D douce, formes géométriques arrondies, volumes très légers, aplats propres, ombre interne subtile, contours rares et épais seulement si nécessaires, composition simple lisible à 32 px, un seul symbole principal et au maximum deux petits détails secondaires, fond transparent, sans texte, sans lettre, sans chiffre, sans cadre extérieur, sans mockup, sans photoréalisme. Identité visuelle africaine francophone moderne et universelle, professionnelle mais accueillante. Cohérence stricte avec le vert Elima, le jaune or et l’encre anthracite.

### Prompt négatif commun

> no text, no letters, no numbers, no watermark, no logo imitation, no white square, no rounded-square background baked into the image, no photorealism, no hands, no faces unless explicitly requested, no excessive detail, no thin fragile lines, no neon, no 3D plastic toy, no emoji style, no clipart, no country flag

### Formes et rendu

- Coins et silhouettes arrondis ; aucune pointe agressive.
- Vue légèrement frontale, éventuellement inclinée de 5 à 10 degrés.
- Profondeur discrète : deux ou trois niveaux maximum.
- Contraste suffisant sur fond blanc et sur fond `#F9FAFB`.
- L’application fournit déjà les conteneurs ronds ou carrés : **le fichier ne doit pas contenir son propre carré de fond**.
- Les icônes de matières peuvent avoir une petite pastille ou étincelle secondaire jaune or pour les relier à Elima.
- Éviter les personnages stéréotypés et les drapeaux pour représenter les langues.

## 3. Palette

| Rôle | Couleur | Usage |
|---|---:|---|
| Vert Elima | `#2E8B57` | Marque, actions principales, Parent |
| Vert forêt | `#153F30` | Profondeur, surfaces Parent/Professeur/Admin |
| Vert professeur | `#256F47` | Espace professeur |
| Jaune or | `#FFD700` | Accent de marque, réussite, détail lumineux |
| Encre | `#1F2937` | Admin, contours et détails sombres |
| Violet Révision | `#7C3AED` | Élève, quiz, IA, progression |
| Fond | `#F9FAFB` | Fond de l’application |
| Succès | `#22C55E` | Terminé, synchronisé, payé |
| Ambre | `#F59E0B` | Attention, échéance, retard |
| Rouge | `#EF4444` | Erreur, absence, impayé |
| Bleu | `#2563EB` | Information, fiches, moyennes |

Règle : une icône emploie une couleur principale, une nuance plus sombre de la même famille et, si utile, un petit accent `#FFD700`. Ne pas utiliser plus de quatre couleurs visibles dans une même icône.

## 4. Spécifications techniques

| Famille | Source à générer | Livraison recommandée | Taille d’affichage |
|---|---|---|---|
| Matières | 1024 × 1024 | PNG transparent + WebP 256 × 256 | 32 à 48 px |
| Grandes fonctions | 1024 × 1024 | PNG transparent + WebP 256 × 256 | 40 à 64 px |
| Navigation | SVG natif si possible | SVG `viewBox 0 0 24 24` | 20 à 24 px |
| États vides | 1024 × 1024 | WebP transparent 512 × 512 | 120 à 220 px |
| Icône PWA | 1024 × 1024 | PNG 512, 192 et maskable | Launcher système |

- Espace de sécurité : 12 % autour du sujet.
- Fond réellement transparent, alpha propre.
- Profil colorimétrique sRGB.
- Poids cible : moins de 80 Ko par icône WebP, moins de 180 Ko par illustration.
- Ne pas reprendre les anciens GIF de `_references/elima.app/public/icons` : plusieurs pèsent entre 1 et 4 Mo. Préférer WebP statique ou Lottie optimisé.
- Convention : minuscules, ASCII, tirets, par exemple `subject-mathematics.webp`.

## 5. P0 — Icônes de matières

Toutes ces icônes sont utilisées dans les cartes de quiz, les fiches, les notes, les moyennes, le sélecteur de matière et l’en-tête d’un quiz.

| ID / fichier | Matière | Symbole à générer | Couleurs | Fragment de prompt spécifique |
|---|---|---|---|---|
| `subject-mathematics` | Mathématiques | Calculatrice arrondie, compas et petite courbe géométrique | Bleu `#2563EB`, bleu nuit `#1E3A8A`, or | Calculatrice scolaire moderne et compas formant une composition géométrique claire, petite courbe mathématique abstraite sans chiffres |
| `subject-french` | Français | Livre ouvert, plume et guillemets abstraits | Rose `#E11D48`, bordeaux `#881337`, or | Livre ouvert élégant avec plume, deux formes abstraites évoquant la littérature et l’expression écrite, aucun caractère lisible |
| `subject-english` | Anglais | Globe et deux bulles de conversation | Indigo `#4F46E5`, bleu `#1D4ED8`, or | Globe simplifié accompagné de deux bulles de conversation, communication internationale, sans drapeau ni lettre |
| `subject-spanish` | Espagnol | Bulles de conversation et soleil chaleureux | Orange `#EA580C`, corail `#F97316`, or | Deux bulles de conversation arrondies avec un petit soleil méditerranéen abstrait, sans drapeau ni lettre |
| `subject-svt` | SVT | Double hélice ADN, feuille et cellule | Émeraude `#059669`, vert `#166534`, or | Double hélice ADN douce fusionnée avec une feuille et une petite cellule circulaire, sciences du vivant |
| `subject-physics-chemistry` | Physique-Chimie | Atome, fiole et éclair | Cyan `#0891B2`, bleu pétrole `#155E75`, or | Atome simplifié autour d’une fiole de laboratoire, petite étincelle d’énergie, composition scientifique lisible |
| `subject-history-geography` | Histoire-Géographie | Globe, boussole et colonne historique | Ambre `#D97706`, brun `#92400E`, vert Elima | Globe simplifié associé à une boussole et une silhouette de monument historique, sans carte politique détaillée |
| `subject-philosophy` | Philosophie | Chouette stylisée, bulle de pensée et étincelle | Violet `#7C3AED`, prune `#5B21B6`, or | Chouette abstraite et bienveillante avec bulle de réflexion minimaliste et petite étincelle, pensée critique sans texte |
| `subject-ses` | SES | Graphique ascendant, pièces et groupe humain abstrait | Sarcelle `#0F766E`, vert `#2E8B57`, or | Graphique économique ascendant accompagné de deux pièces et trois silhouettes humaines abstraites, équilibre économie et société |
| `subject-computer-science` | Informatique / NSI | Puce, nœuds réseau et chevrons de code | Ardoise `#334155`, cyan `#06B6D4`, or | Microprocesseur arrondi avec trois nœuds réseau et deux chevrons abstraits de programmation, aucun code lisible |
| `subject-eps` | EPS | Chaussure de sport, chronomètre et mouvement | Lime `#65A30D`, vert `#15803D`, or | Chaussure de sport dynamique avec petit chronomètre et deux lignes de mouvement épaisses |
| `subject-arts` | Arts | Palette, pinceau et éclat créatif | Fuchsia `#C026D3`, violet `#7C3AED`, or | Palette de peinture moderne avec pinceau et petite éclaboussure contrôlée, couleurs propres et peu nombreuses |
| `subject-other` | Autre matière | Trois livres et étincelle | Violet `#7C3AED`, encre `#1F2937`, or | Petite pile de trois livres scolaires arrondis avec une étincelle dorée, symbole générique de matière |

## 6. P1 — Fonctions et navigation

Une seule création peut être réutilisée sur mobile, desktop et dans les cartes. Pour les icônes de barre de navigation, demander une version SVG simplifiée du même concept.

| Fichier | Fonction / écrans | Concept | Couleurs dominantes |
|---|---|---|---|
| `feature-home` | Accueil de tous les rôles | Maison-école accueillante avec petit toit de graduation | Vert Elima + or |
| `feature-planning` | Emploi du temps, aujourd’hui, calendrier | Calendrier arrondi avec petit repère horaire | Violet côté élève, vert ailleurs |
| `feature-revision` | Réviser, Quiz du jour | Cerveau simplifié posé sur un livre ouvert, étincelle IA | Violet + or |
| `feature-documents` | Documents, ressources, fichiers | Dossier ouvert contenant une feuille | Bleu + vert Elima |
| `feature-profile` | Profil | Silhouette neutre dans un médaillon scolaire | Encre + vert Elima |
| `feature-children` | Enfants, résultats | Adulte et enfant stylisés côte à côte | Vert Elima + or |
| `feature-directory` | Annuaire élèves/professeurs | Trois silhouettes et petit badge école | Encre + vert Elima |
| `feature-students` | Statistique élèves | Deux élèves avec petit livre | Vert Elima + bleu |
| `feature-teachers` | Professeurs | Tableau ou livre avec toque académique | Vert forêt + or |
| `feature-classes` | Classes, appel | Tableau de classe et trois points-personnes | Vert professeur + or |
| `feature-assignments` | Devoirs, tâches | Feuille checklist et crayon | Ambre + vert Elima |
| `feature-results` | Notes, résultats, moyennes | Bulletin avec mini graphique ascendant | Bleu + vert Elima |
| `feature-payments` | Paiements, finances, encaissements | Reçu arrondi avec pièce CFA abstraite, sans texte | Vert Elima + or |
| `feature-messages` | Messagerie, communication | Deux bulles superposées, une entrante et une sortante | Encre + vert Elima |
| `feature-alerts` | Alertes | Cloche scolaire avec petit point d’attention | Ambre + rouge discret |
| `feature-publish` | Publier une ressource | Dossier ou document montant vers un nuage | Vert professeur + bleu |
| `feature-supplies` | Fournitures, listes et commandes | Sac scolaire avec cahier et crayon | Vert Elima + or |
| `feature-sync` | Synchronisation hors-ligne | Nuage avec deux flèches circulaires épaisses | Émeraude + bleu |
| `feature-admin-dashboard` | Pilotage admin | École et petit tableau de bord à trois barres | Encre + vert Elima + or |
| `feature-scanner` | Scanner un document | Feuille dans quatre coins de scan, petit éclat | Violet + vert Elima |

### Actions importantes qui méritent une icône dédiée

| Fichier | Bouton actuel | Concept | Couleurs |
|---|---|---|---|
| `action-random-quiz` | Quiz aléatoire | Deux dés arrondis et petite étincelle | Violet + blanc + or |
| `action-generate-quiz` | Générer le quiz | Baguette/étincelle au-dessus d’un mini QCM sans lettres | Violet + or |
| `action-generate-sheet` | Créer une fiche | Feuille synthèse avec étincelle IA | Bleu + violet |
| `action-hint` | Indice | Ampoule ronde avec petite étoile | Ambre + or |
| `action-scan-camera` | Ajouter/scanner | Appareil photo visant une feuille | Violet + vert Elima |
| `action-upload` | Publier/téléverser | Document avec flèche montante | Vert professeur + bleu |
| `action-attendance` | Commencer l’appel | Clipboard avec trois silhouettes et coche | Vert professeur + or |
| `action-reminder` | Activer les rappels | Cloche avec petit calendrier | Vert Elima + ambre |
| `action-bulletin` | Bulletins | Bulletin avec ruban ou sceau scolaire | Bleu + or |

## 7. Alertes et statuts métier

Ces symboles peuvent être des SVG simples colorés. Ils servent dans les cartes, badges et notifications.

| Fichier | Sens | Concept | Couleur |
|---|---|---|---|
| `status-present` | Présent / terminé / payé | Coche pleine dans un cercle | `#22C55E` |
| `status-absent` | Absence | Calendrier avec silhouette barrée | `#EF4444` |
| `status-late` | Retard / échéance | Petite horloge avec point d’attention | `#F59E0B` |
| `status-unpaid` | Impayé | Reçu avec point d’exclamation | `#EF4444` |
| `status-grade` | Nouvelle note | Bulletin avec étoile | `#2563EB` |
| `status-pending` | En attente | Cercle incomplet / sablier doux | `#F59E0B` |
| `status-offline` | Hors connexion | Nuage déconnecté | `#6B7280` |
| `status-synced` | Synchronisé | Nuage avec coche | `#22C55E` |
| `status-error` | Erreur | Cercle avec croix claire | `#EF4444` |

## 8. P2 — Illustrations d’état

Ces fichiers sont plus grands que les icônes de boutons. Garder beaucoup d’espace vide, une composition centrée et aucun texte intégré.

| Fichier | Écran | Illustration demandée | Palette |
|---|---|---|---|
| `empty-messages` | Aucune conversation | Deux bulles vides posées près d’un petit cartable | Vert + encre + or |
| `empty-alerts` | Aucune alerte | Cloche calme avec petite coche | Vert + ambre |
| `empty-quiz` | Aucun quiz | Livre ouvert et cerveau violet en attente | Violet + bleu + or |
| `empty-sheets` | Aucune fiche | Dossier bleu vide avec feuille et étincelle | Bleu + violet |
| `empty-documents` | Aucun document | Scanner face à une feuille blanche | Vert + violet |
| `empty-assignments` | Aucun devoir | Checklist entièrement cochée | Vert + ambre |
| `empty-schedule` | Aucun cours | Calendrier paisible avec petit soleil | Bleu + or |
| `empty-payments` | Aucun mouvement | Reçu rangé dans un portefeuille fermé | Vert + or |
| `success-quiz` | Quiz terminé | Trophée doux, étoile et confettis limités | Violet + or + vert succès |
| `offline-sync` | Mode hors-ligne | Nuage et téléphone reliés par des flèches interrompues | Ardoise + bleu + vert |

## 9. Icônes à conserver en vectoriel simple

Ne pas demander d’illustration générée pour ces commandes. Utiliser Lucide ou un set SVG cohérent, trait de 2 à 2,25 px, extrémités arrondies :

- retour `ArrowLeft` ;
- suivant et navigation `ArrowRight`, `ChevronRight`, `ChevronDown` ;
- fermer `X` ;
- rechercher `Search` ;
- afficher/masquer un mot de passe `Eye`, `EyeOff` ;
- supprimer `Trash2` ;
- répondre et envoyer `Reply`, `Send` ;
- chargement `LoaderCircle`, `RefreshCw` ;
- lien externe `ExternalLink` ;
- déconnexion et abandon `LogOut` ;
- localisation et heure `MapPin`, `Clock` ;
- étoiles de notation `Star` ;
- coches/croix de réponse `CheckCircle`, `XCircle` ;
- plus petit badge numérique et indicateurs non lus.

Raison : ces icônes apparaissent entre 14 et 24 px. Une illustration détaillée y serait moins lisible, plus lourde et moins accessible.

## 10. Icône de l’application

L’icône actuelle `public/icons/elima-app.png` peut rester, mais si une nouvelle version est générée :

- reprendre le « e » Elima et la toque du logo officiel ;
- fond vert Elima `#2E8B57` ou vert forêt `#153F30` ;
- accent jaune `#FFD700` ;
- aucun mot « elima » dans l’icône launcher ;
- zone de sécurité maskable de 20 % ;
- fournir `app-icon-192.png`, `app-icon-512.png` et `app-icon-maskable-512.png`.

## 11. Arborescence de livraison

```text
public/icons/generated/
  subjects/
    subject-mathematics.png
    subject-french.png
    subject-english.png
    subject-spanish.png
    subject-svt.png
    subject-physics-chemistry.png
    subject-history-geography.png
    subject-philosophy.png
    subject-ses.png
    subject-computer-science.png
    subject-eps.png
    subject-arts.png
  features/
    feature-home.webp
    feature-revision.png
    feature-payments.png
    ...
  actions/
    action-random-quiz.webp
    action-generate-sheet.webp
    ...
  status/
    status-present.svg
    status-absent.svg
    ...
  empty-states/
    empty-messages.webp
    success-quiz.webp
    ...
```

## 12. Formule de prompt à appliquer à chaque ligne

Assembler les trois blocs suivants :

```text
[STYLE MAÎTRE]

Sujet précis : [FRAGMENT DE PROMPT DE LA LIGNE].
Palette dominante : [COULEURS DE LA LIGNE], avec un petit accent jaune Elima #FFD700 seulement si utile.
Le symbole doit rester identifiable à 32 px et occuper environ 76 % du canevas.

[PROMPT NÉGATIF]
```

Les douze icônes de matières ainsi que les icônes Révision et Paiements sont intégrées dans l’application. Leurs sources originales sont conservées dans `assets/icon-sources/` et servent désormais de références de style pour les générations suivantes.
