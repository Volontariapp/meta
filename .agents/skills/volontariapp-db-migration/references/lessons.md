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
  - id: src-8991a8bd
    resource: .agents/skills/volontariapp-db-migration/SKILL.md
    title: .agents/skills/volontariapp-db-migration/SKILL.md
  - id: src-689287a3
    resource: .agents/skills/volontariapp-db-migration/scripts/push-common-migration.sh
    title: .agents/skills/volontariapp-db-migration/scripts/push-common-migration.sh
---

# Leçons

## 2026-11-08 - Les tables d'outbox ont un index de sondage et une purge

- **Type :** rule
- **Leçon :** Depuis @volontariapp/database 3.13.0 : index (status, created_at, id) sur event_queue et jobs_outbox, purge des lignes COMPLETED au dela d'un jour (et de job_audit), boucle propre a OutboxRunner. Cause : sondage sans index, 125 a 245 Mo/s de lectures disque sur ms-ranking-db, gels de 5 a 12 s de toute la VM. job_audit n'a pas d'index (status, created_at).[^src-8991a8bd]
- **Consigné par :** claude-code/agent

## 2026-11-08 - Propager une migration commune en une commande

- **Type :** command
- **Leçon :** scripts/push-common-migration.sh <fichier> '<titre>' [--dry-run] copie la migration dans ms-user, ms-social, ms-post, ms-event, ms-storage, ms-ranking, ws-service, post-processor-event et worker-event depuis des worktrees neufs sur origin/main, controle le md5 et pousse sur main. Suivre ensuite la CI avec le SHA COMPLET : gh run list --commit <sha court> ne renvoie rien.[^src-689287a3]
- **Consigné par :** claude-code/agent

## 2026-11-08 - transaction=false est refuse par TypeORM en mode 'all'

- **Type :** pitfall
- **Leçon :** Une migration qui declare transaction = false (pour CREATE INDEX CONCURRENTLY) fait lever ForbiddenTransactionModeOverrideError quand migrationsTransactionMode vaut 'all' (defaut), donc le conteneur run-migrations echoue et le service ne demarre pas. Utiliser CREATE INDEX IF NOT EXISTS dans la transaction (tables d'outbox petites apres purge). Constate en ecrivant AddOutboxPollingIndexes1794166000000, lu dans typeorm/migration/MigrationExecutor.js (0.3.31).[^src-8991a8bd]
- **Consigné par :** claude-code/agent

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
[^src-8991a8bd]: .agents/skills/volontariapp-db-migration/SKILL.md
[^src-689287a3]: .agents/skills/volontariapp-db-migration/scripts/push-common-migration.sh
