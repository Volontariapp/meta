---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-db-migration, du plus récent au plus ancien."
tags: [lessons, volontariapp-db-migration]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-12T11:56:30Z"
sources:
  - id: src-ae6d3d91
    resource: ms-post/package.json
    title: ms-post/package.json
  - id: src-974cd2ed
    resource: ms-user/src/migrations/domain/1793970000000-AddBadgePointsAndProgressDedup.ts
    title: ms-user/src/migrations/domain/1793970000000-AddBadgePointsAndProgressDedup.ts
---

# Leçons

## 2026-11-06 - Migration écrite dans domain-<d> d'abord quand npm-packages est déjà modifié

- **Type :** rule
- **Leçon :** Le hook STOP interdit l'édition de ms-* après une édition de npm-packages. La migration est écrite dans domain-<d>/src/test/migrations/domain/ (PR npm-packages), validée sur un Postgres jetable (run, revert, run, suite d'intégration de domain-<d>), puis copiée à l'identique (md5) dans ms-* après publication. Ne pas lancer yarn meta sync-migrations pour cela.[^src-974cd2ed]
- **Consigné par :** claude-code/agent

## 2026-11-03 - CREATE INDEX CONCURRENTLY interdit avec les scripts migration:run actuels

- **Type :** rule
- **Leçon :** Une migration TypeORM qui definit transaction = false (necessaire a CREATE INDEX CONCURRENTLY) fait lever ForbiddenTransactionModeOverrideError des qu'elle est en attente et que le mode transactionnel par defaut est all (MigrationExecutor.js:185-187, TypeORM 0.3.30). Les scripts migration:run:* de ms-post et ms-event n'ont pas l'option -t et aucun migrationsTransactionMode n'est configure. Utiliser CREATE INDEX IF NOT EXISTS simple (verrou d'ecriture le temps de la construction) ou passer d'abord les scripts en -t each, sans transaction = false tant que ce n'est pas fait.[^src-ae6d3d91]
- **Consigné par :** claude-code/agent

## 2026-10-12 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : ms-*/src/migrations/**, npm-packages/packages/database/src/**, sync-migrations.sh.
- **Consigné par :** claude-code/agent

[^src-ae6d3d91]: ms-post/package.json
[^src-974cd2ed]: ms-user/src/migrations/domain/1793970000000-AddBadgePointsAndProgressDedup.ts
