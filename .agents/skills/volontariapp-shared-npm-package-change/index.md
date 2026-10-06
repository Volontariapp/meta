# Shared NPM Package Change

Modifier un package partagé de npm-packages (messaging, shared, database, domain-*, auth...) et propager la nouvelle version aux consommateurs : rayon d'impact, build, changeset, STOP, snapshot CI, yarn up. À utiliser avant toute édition sous npm-packages/packages/.

## Concepts

- [SKILL.md](/volontariapp-shared-npm-package-change/SKILL.md) - point d'entrée de la skill
- [Leçons apprises](/volontariapp-shared-npm-package-change/references/lessons.md) - Règles et pièges découverts en travaillant sur volontariapp-shared-npm-package-change, du plus récent au plus ancien.
- [Catalogue des packages @volontariapp](/volontariapp-shared-npm-package-change/references/package-catalogue.md) - Rôle, version, API réellement exportée de chaque package de npm-packages, et écarts connus entre README et code.

## Scripts

- [`consumers.py`](/volontariapp-shared-npm-package-change/scripts/consumers.py) - Consommateurs des packages @volontariapp/* : qui dépend de quoi, et dans quelle version déclarée.

Historique : [log.md](/volontariapp-shared-npm-package-change/log.md)
