# Audit technique complet et valorisation de la contribution

Date de l'audit : 20 juillet 2026
Périmètre : dépôt `elima.mobile`, branche `feature/public-auth-onboarding`, y compris `_references/elima.tech` et `_references/elima.app`.

## 1. Résumé exécutif

Elima Mobile est une bêta technique avancée, et non une simple maquette. Le dépôt contient une PWA React/TypeScript multi-rôles, un modèle de données Supabase, des règles RLS, huit fonctions serverless, un moteur de révision avec évaluation déterministe et assistée par IA, un premier mode hors ligne enseignant, des scripts d'import et de migration, ainsi qu'un corpus pédagogique structuré.

Le niveau de maturité global est estimé à **environ 60 % d'un MVP exploitable sur le terrain**. La valeur est principalement dans l'architecture unifiée, les parcours multi-rôles, la reprise raisonnée des deux produits historiques, la sécurité RLS déjà amorcée et le moteur pédagogique. La dette principale se situe dans la sécurité d'exploitation, les tests de bout en bout, l'observabilité, les fonctions encore simulées et la reproductibilité du déploiement.

La valeur de remplacement du **travail démontrable dans le dépôt mobile actuel** est estimée à **28 000 à 53 000 EUR**, soit environ **18,4 à 34,8 millions FCFA**. Un point de valorisation raisonnable pour une négociation est **40 000 EUR / 26,2 millions FCFA**, sous réserve de clarifier la propriété intellectuelle et l'origine des contenus.

La valeur de l'écosystème complet, références comprises, est potentiellement bien supérieure, mais elle ne peut pas être intégralement attribuée à la même contribution sur la seule base de ce dépôt : `_references` est ignoré par Git et ne fournit pas ici d'historique d'auteur vérifiable.

## 2. Méthode et limites

L'audit repose sur :

- la lecture du code client, des fonctions serverless, des migrations, scripts, tests et documents ;
- la cartographie des deux applications de référence ;
- l'historique Git et le différentiel entre `main` et la branche auditée ;
- les builds et tests réellement exécutés ;
- un audit npm des dépendances de production ;
- une analyse des parcours réels, simulés ou incomplets à partir des services appelés par les écrans.

Limites : aucune connexion à la base de production n'a été utilisée, aucune migration n'a été appliquée, aucun test de charge ni test d'intrusion n'a été réalisé. Le navigateur intégré n'était pas disponible ; la recette visuelle de bout en bout reste donc à faire. Le nombre de commits et les lignes de code ne permettent pas de déduire des heures réellement travaillées.

## 3. Inventaire factuel

### Dépôt mobile suivi par Git

| Zone | Fichiers | Lignes texte | Observation |
|---|---:|---:|---|
| `src/` | 117 | 6 709 | UI, navigation, services et types |
| `api/` | 8 | 783 | SSO, inscription, activation, IA et apprentissage |
| `scripts/` | 15 | 1 188 | migration, import, seed et contrôle |
| `supabase/migrations/` | 17 | 1 556 | RLS, messagerie, révision, offline et onboarding |
| `tests/` | 1 | 84 | 12 tests, tous centrés sur l'apprentissage |
| `docs/` | 11 | 708 | architecture, sécurité, déploiement et backlog |
| `data/` | 4 | 7 472 | corpus pédagogique JSON |
| `public/` + `assets/` | 89 | — | environ 49 Mo d'assets, dont sources d'icônes |
| Total suivi | 275 | 27 366 | 50,6 Mo environ |

Le code exécutable et SQL propre au nouveau socle représente environ **10 200 lignes**, hors documentation et corpus de données.

### Historique vérifiable

- 30 commits entre le 13 et le 19 juillet 2026 ;
- un seul auteur Git : Aboubacar Tuo ;
- commit initial : 115 fichiers et 12 986 insertions ;
- évolution de `main` vers la branche auditée : 123 fichiers, 10 932 insertions et 379 suppressions ;
- `.env` et `_references` sont ignorés ; aucun secret racine n'est suivi par Git.

Ces chiffres montrent une contribution importante et concentrée, probablement accélérée par des outils d'IA. Ils prouvent l'attribution Git, pas le temps humain passé.

### Patrimoine dans `_references`

| Projet | Fichiers utiles | Lignes approximatives | Rôle |
|---|---:|---:|---|
| `elima.tech` | 260 | 39 056 | plateforme scolaire Next.js, APIs, finance, PDF, RBAC, WhatsApp |
| `elima.app` | 91 | 15 799 | application de révision React/Vite et prototype IA/scanner |
| Total | 351 | 54 855 | patrimoine historique non suivi dans ce dépôt |

Il n'existe pas de copie exacte de fichier source entre le nouveau code et les références. La reprise est surtout conceptuelle : contrats de données, rôles, design, règles métier et parcours. En revanche, `scripts/prepare-unified-db.mjs` et `scripts/seed-school-demo.mjs` dépendent directement de fichiers placés dans `_references`, ce qui contredit partiellement l'idée d'un dépôt racine totalement autonome.

## 4. Ce qui a été réalisé

### Architecture et produit

- PWA mobile-first React 18, TypeScript, Tailwind et React Router ;
- navigation et protection par espaces Parent, Élève, Enseignant et Administration ;
- séparation claire UI → services → Supabase/données de démonstration ;
- design system, composants communs, états de chargement et écrans vides ;
- mode public, mode démonstration par domaine et mode production ;
- 43 sources d'icônes et 46 assets publics intégrés.

### Identité et onboarding

- connexion email/téléphone ;
- SSO avec `elima.ci`, PKCE et bridge vers le projet mobile ;
- création/lien d'identité locale ;
- inscription par rôle et code école ;
- élève autonome pouvant ensuite rejoindre une école ;
- demande séparée pour un chef d'établissement.

### Scolaire multi-rôles

- Parent : enfants, devoirs, notes, emploi du temps, messages, paiements en lecture ;
- Élève : accueil, devoirs, planning, messages, profil et rattachement à l'école ;
- Enseignant : journée, classes, appel, évaluations, ressources, messages et synchronisation ;
- Admin : indicateurs, tendances, annuaire élèves/professeurs, paiements, messages et alertes ;
- messagerie scindée entre messages et alertes, masquage par utilisateur et audit de la vue école.

### Révision et pédagogie

- quiz, fiches Markdown/KaTeX, progression, historique et indices quotidiens ;
- génération IA de quiz et de fiches derrière une fonction serveur authentifiée ;
- moteur de devoirs guidés et sujets d'examen ;
- validateurs déterministes pour nombres, fractions, booléens, choix et ordre ;
- analyse assistée par GPT pour les réponses ouvertes ;
- réponses attendues, indices et corrections isolés dans des tables sans droit direct ;
- import transactionnel, découverte progressive du contenu et URLs signées pour les PDF ;
- corpus présent : 10 sessions guidées / 96 étapes et plusieurs sujets structurés.

### Données, sécurité et exploitation

- 17 migrations incrémentales ;
- RLS multi-tenant et fonctions `security definer` avec `search_path` explicite ;
- stockage privé prévu pour les sujets d'examen ;
- vérification que l'URL, la clé serveur et la connexion PostgreSQL ciblent le même projet avant migration ;
- migration unifiée transactionnelle et contrôlée par checksum ;
- audit npm du 20 juillet 2026 : **0 vulnérabilité connue sur 145 dépendances de production**.

### Hors ligne

- détection de réseau ;
- file locale d'actions ;
- remplacement d'une feuille d'appel non synchronisée pour éviter les doublons ;
- validation serveur des UUID et statuts ;
- synchronisation atomique de l'appel via RPC.

## 5. Résultats des contrôles

| Contrôle | Résultat |
|---|---|
| Build racine | Réussi |
| TypeScript racine | Réussi via le build |
| Tests racine | 12/12 réussis |
| Lint racine | Réussi : 0 erreur, 20 avertissements existants |
| Audit npm production | 0 vulnérabilité connue |
| Bundle racine | JS principal 1,11 Mo minifié / 319 Ko gzip |
| Cache PWA | 71 entrées / 6 424,96 KiB annoncés par Workbox |
| Build `elima.tech` | Réussi, 114 routes générées |
| Tests `elima.tech` via script npm | Script cassé |
| Tests `elima.tech` lancés correctement | 50/52 réussis, dont 2/2 nouveaux tests OTP ; 2 échecs historiques |
| Build `elima.app` | Réussi |
| Lint `elima.app` | Échec : binaire ESLint absent |
| Tests `elima.app` | Pas de suite automatisée exploitable |

## 6. Points forts

1. **Bonne décision d'architecture** : une PWA unifiée et une identité commune évitent de maintenir deux applications mobiles divergentes.
2. **Modèle multi-tenant pris au sérieux** : la sécurité ne repose pas uniquement sur le routage client ; de nombreuses règles RLS et RPC contrôlent l'école, le rôle et les relations.
3. **Moteur pédagogique substantiel** : le projet dépasse le simple QCM et traite modes examen, étapes, confiance, indices, correction et recommandations.
4. **Séparation des secrets d'apprentissage** : les nouvelles tables de devoirs protègent mieux les réponses que l'ancien catalogue de quiz.
5. **Outillage de données utile** : imports idempotents, quarantaines, migrations par fonctionnalité et vérifications de cible réduisent le risque opérationnel.
6. **Documentation supérieure à la moyenne d'un prototype** : architecture, environnement, sécurité, déploiement et backlog sont explicités.

## 7. Risques et dette technique

### Critiques avant terrain

1. **Authentification OTP implémentée mais pas encore déployée de bout en bout** : inscription et mot de passe oublié utilisent désormais un code WhatsApp haché, expirant après 10 minutes, limité à 5 essais et soumis à des limites par identifiant, téléphone et IP. Restent à appliquer la migration sur la base d'identité, configurer le template Authentication Twilio approuvé, puis exécuter les tests E2E de production.
2. **Secrets actifs dans les copies locales** : `_references/elima.tech/.env.local` et des fichiers sous `scripts/` contiennent des clés actives ou vraisemblablement actives. Même ignorés par Git, ils doivent être déplacés vers un gestionnaire de secrets et tournés avant partage du dossier.
3. **APIs sans protection anti-abus applicative** : inscription d'école, bridge, génération IA et évaluation pédagogique n'ont pas de quota applicatif, limitation IP/utilisateur, taille maximale systématique ni journal d'abus.
4. **Intégrité des anciens quiz** : `quiz_answers` est lisible par tout utilisateur authentifié et expose `is_correct`. Cela permet de récupérer les réponses depuis le navigateur. Acceptable pour de l'entraînement informel, pas pour une évaluation de confiance.
5. **RLS non validée sur une préproduction propre** : les migrations sont prometteuses mais n'ont pas été testées ici avec une matrice réelle de comptes et d'écoles.
6. **Absence d'observabilité** : pas de suivi central des erreurs client/serverless, échecs SSO, synchronisations, coûts IA ou anomalies RLS.

### Importants

- ESLint est installé et opérationnel, mais 20 avertissements restent à traiter ; aucun pipeline CI n'impose encore build, lint, tests ou contrôle de migrations ;
- couverture de tests très faible hors apprentissage : deux tests unitaires couvrent maintenant la normalisation OTP, mais il manque encore les tests E2E auth, rôles, messagerie, offline, fonctions serverless et parcours UI ;
- le scanner n'envoie pas le fichier : il crée seulement un chemin et une ligne `scanned_exams`, puis affiche un statut d'analyse ;
- génération de fiche/quiz depuis un scan explicitement non implémentée ;
- upload professeur dépend d'une API externe encore à adapter en Bearer JWT ;
- le hors-ligne ne synchronise réellement que les présences ; notes brouillon et remarques finissent en erreur ;
- données d'appel stockées en clair dans `localStorage`, potentiellement sur des téléphones partagés ;
- paiements et fournitures sont essentiellement en lecture ou redirigent vers le web ;
- notifications limitées au navigateur actif, sans push robuste ;
- erreurs Supabase souvent converties en listes vides, ce qui masque une panne comme une absence de données ;
- bundle trop gros pour une première ouverture sur réseau mobile contraint et absence de découpage par route ;
- PWA avec une seule icône 512 px ; pas d'icône 192 px dédiée ni validation maskable multi-appareils ;
- pas d'en-têtes CSP explicites dans `vercel.json` ;
- dépendance de deux scripts aux sources ignorées dans `_references`, empêchant une reconstruction complète depuis un clone seul ;
- documentation désynchronisée : Vite 5 dans `architecture.md`, Vite 7 dans le package, mention de Vite 8 ailleurs et noms de variables Supabase historiques.

### Références historiques

`elima.tech` est le composant le plus riche fonctionnellement : 111 routes générées, gestion scolaire, finance, PDF, messagerie, WhatsApp et APIs. Son build passe, mais son script de test ne fonctionne pas sous Node 24 ; en ciblant les fichiers, 2 tests sur 50 échouent. Next.js signale aussi la convention `middleware` comme dépréciée et détecte une racine ambiguë à cause des multiples lockfiles.

`elima.app` fournit une base UX et pédagogique utile. Son build passe, mais le bundle reste lourd, le lint n'est pas exécutable, aucune vraie suite de tests n'est présente et sa documentation autorise encore d'anciennes variables Azure préfixées `VITE_`, à ne jamais reprendre côté client.

## 8. Appréciation de maturité

| Axe | Appréciation |
|---|---:|
| Architecture et séparation des responsabilités | 7,5/10 |
| Étendue fonctionnelle démontrable | 7/10 |
| Qualité et maintenabilité | 5,5/10 |
| Sécurité de conception | 6/10 |
| Sécurité et exploitation production | 4/10 |
| Tests et assurance qualité | 3/10 |
| Documentation | 7/10 |
| Préparation terrain | 5/10 |

Verdict : **bêta technique avancée, démontrable et valorisable, mais pas encore déployable sans phase de durcissement**.

## 9. Valorisation de la contribution technique

### Hypothèse de reconstruction du mobile actuel

| Lot livré | Jours équivalents estimés |
|---|---:|
| Audit, architecture et design système | 6–9 |
| PWA, composants et quatre espaces utilisateurs | 15–22 |
| Services scolaires, rôles et messagerie | 10–14 |
| Auth, SSO, inscription et rattachement école | 10–15 |
| Base, RLS, migrations et scripts | 12–18 |
| Révision, IA, devoirs guidés et import de contenu | 14–20 |
| Offline, assets, documentation et tests existants | 8–12 |
| Ajustement pour réemploi des références et recouvrement | -10 à -15 |
| **Total équivalent** | **65–95 jours** |

Ce total estime ce qu'une équipe devrait acheter aujourd'hui pour reconstruire l'état livré, et non le temps calendaire observé dans Git.

Le baromètre Malt 2026 affiche un tarif moyen de **426 EUR/jour pour 3–7 ans d'expérience** et **558 EUR/jour pour les profils full-stack expérimentés**. Source : [Baromètre Malt des développeurs Fullstack](https://www.malt.fr/t/barometre-tarifs/tech/developpeur-backend/developpeur-fullstack).

Calcul de remplacement :

- borne basse : 65 × 426 = **27 690 EUR** ;
- borne haute : 95 × 558 = **53 010 EUR** ;
- conversion au taux fixe de 655,957 FCFA/EUR : **18,2 à 34,8 millions FCFA**.

### Valeur recommandée

- **Valeur défendable du mobile livré : 28 000 à 53 000 EUR** ;
- **point central de négociation : 40 000 EUR**, soit environ **26,2 millions FCFA** ;
- cette valeur inclut conception, implémentation, intégration, données, documentation et capitalisation technique ;
- elle n'inclut pas le coût futur pour rendre le produit exploitable, détaillé dans le second rapport.

### Écosystème complet, sous condition d'attribution

Si `elima.tech` et `elima.app` ont également été majoritairement conçus et réalisés par le même contributeur, une reconstruction raisonnée de l'ensemble représente environ **200 à 320 jours équivalents**, recouvrements compris. À 426–558 EUR/jour, l'ordre de grandeur serait **85 000 à 179 000 EUR**, soit **55,8 à 117,4 millions FCFA**.

Cette seconde fourchette doit rester **conditionnelle** jusqu'à production des historiques Git, contrats, factures ou autres éléments permettant d'attribuer le code historique et de séparer code original, code généré, dépendances et contenus tiers.

## 10. Éléments à conserver pour défendre la valorisation

- exports des historiques Git des trois projets ;
- journal des décisions d'architecture et démonstrations vidéo des parcours ;
- preuves de déploiement, migrations et jeux de données ;
- résultats de recette et pilotes école ;
- inventaire de propriété intellectuelle des sujets, corrections, logos et icônes ;
- relevé des coûts cloud/IA et indicateurs d'usage ;
- ventilation du temps par conception, développement, contenu, support et pilotage.
