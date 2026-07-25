# Structure du dépôt : proposition avant déplacement

## Situation initiale

```text
/
├── src/                       application mobile Vite
├── api/                       fonctions serveur mobile
├── supabase/                  migrations mobiles/unifiées partielles
├── scripts/
└── _references/
    ├── elima.tech/            dépôt Git web imbriqué et ignoré
    └── elima.app/             référence historique isolée
```

Deux scripts actifs dépendent actuellement de `_references/elima.tech` :
`prepare-unified-db.mjs` et `seed-school-demo.mjs`. Un clone du dépôt mobile ne
peut donc pas reconstruire seul la base.

## Structure cible

```text
/
├── src/                       mobile léger, inchangé à la racine
├── api/
├── public/
├── web/                       application Next.js complète
├── packages/
│   ├── database-types/
│   ├── shared-domain/
│   ├── permissions/
│   └── validation/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   ├── functions/
│   ├── seed.base.sql
│   ├── seed.demo.sql
│   └── seed.development.sql
├── docs/
└── _references/
    └── elima.app/             reste intact et hors des builds
```

`_references` est conservé au pluriel parce que c'est le chemin physique actuel.
Renommer ce dossier déplacerait `elima.app`, ce que la mission interdit.

## Plan de déplacement préservant l'historique

Un simple `git mv` est impossible : le web est un dépôt imbriqué ignoré et ses
fichiers ne sont pas suivis par le dépôt racine.

Plan retenu :

1. utiliser la branche web sauvegardée et le remote `abtuo/elima.git` ;
2. importer son historique dans le dépôt racine avec `git subtree`, sans
   `--squash`, sous le préfixe `web/` ;
3. vérifier que `web/` correspond au commit web `496c408` ;
4. transférer seulement les fichiers locaux ignorés nécessaires
   (`.env.local`) sans les indexer ;
5. installer/verrouiller les dépendances dans `web/` et réussir son build ;
6. adapter les deux scripts qui pointent vers `_references/elima.tech` ;
7. vérifier qu'aucun build ne référence `_references/elima.app` ;
8. supprimer la copie locale imbriquée `_references/elima.tech` seulement
   après comparaison, puisque ses branches sont poussées et restaurables ;
9. conserver `_references/elima.app` et vérifier son empreinte
   `9f07095d885e1fe2874752cf019a838ff7f7a525962f208882d20cd26662a295`.

Risques : historique sans relation avec le dépôt mobile, secrets locaux ignorés,
taille du commit et chemins de scripts. Rollback : revenir au commit précédant
l'import et recloner la branche web de sauvegarde dans `_references/elima.tech`.

