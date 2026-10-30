---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-implement-async-job-flow, du plus récent au plus ancien."
tags: [lessons, volontariapp-implement-async-job-flow]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-11T15:18:27Z"
sources:
  - id: src-9092d13d
    resource: npm-packages/packages/database/src/outbox/consumers/outbox.consumer.ts
    title: npm-packages/packages/database/src/outbox/consumers/outbox.consumer.ts
  - id: src-3281d508
    resource: npm-packages/packages/messaging/src/websockets/events/mapping.ts
    title: npm-packages/packages/messaging/src/websockets/events/mapping.ts
  - id: src-2003dcdc
    resource: workers-runners/worker-event/src/tests/setup/global-setup.ts
    title: workers-runners/worker-event/src/tests/setup/global-setup.ts
  - id: src-0e351743
    resource: workers-runners/worker-event/src/workers/handlers/fallback/fallback-delete-event.handler.ts
    title: workers-runners/worker-event/src/workers/handlers/fallback/fallback-delete-event.handler.ts
  - id: src-3ebc79f5
    resource: workers-runners/worker-event/eslint.config.mjs
    title: workers-runners/worker-event/eslint.config.mjs
  - id: src-4f6a6ae1
    resource: workers-runners/worker-event/package.json
    title: workers-runners/worker-event/package.json
---

# Leçons

## 2026-10-13 - Une seule copie de @volontariapp/database dans un worker, sinon 'No mapping registered'

- **Type :** pitfall
- **Leçon :** Les mappers d'entites sont enregistres par copie du module: si node_modules contient plusieurs @volontariapp/database (workers, outbox et domain-event les epinglent en version exacte, souvent differentes), les tests d'integration echouent avec 'No mapping registered from EventQueueEntity to EventQueueModel' ou 'JobAuditEntity to JobAuditModel'. Apres un yarn up de domain-event/messaging/workers, verifier avec: find node_modules -path '*@volontariapp/database/package.json' -not -path '*/dist/*'. Correctif prefere par l'equipe: PAS de resolutions (trop fragile a maintenir). Aligner les versions: database en dependance directe a la version epinglee par domain-event/workers/outbox (npm view @volontariapp/<paquet>@<version> dependencies.@volontariapp/database), et monter domain-event, workers et outbox sur des versions qui epinglent la meme database. Exemples verifies en local (CI e2e ms-event a revalider): ms-event = domain-event 3.10.0 + database 3.4.31 + outbox 0.9.68; worker-event = domain-event 3.10.1 + workers 1.3.37 (database 3.4.32, messaging 2.24.0, outbox 0.9.69). Cause confirmee par la CI de workers-runners#15.[^src-4f6a6ae1]
- **Consigné par :** claude-code/agent

## 2026-10-13 - worker-event: limite de 8 specs pour le lint typed

- **Type :** pitfall
- **Leçon :** Dans workers-runners/worker-event, les *.spec.ts sont exclus de tsconfig.json et passent par allowDefaultProject (src/tests/*.spec.ts) : au-dela de 8 fichiers, yarn lint echoue en CI avec 'Too many files (>8) have matched the default project'. La limite est relevee a 20 dans eslint.config.mjs (maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING). Reproduire en local avec le glob complet: yarn eslint "src/**/*.ts", pas sur quelques fichiers.[^src-3ebc79f5]
- **Consigné par :** claude-code/agent

## 2026-10-13 - Un handler fallback rejoue avec l'acteur d'origine et refuse les anciens jobs

- **Type :** rule
- **Leçon :** FallbackDeleteEventHandler (worker-event) appelle EventService.delete(id, userId, userRole) depuis le payload du job ; un job sans userRole (enfile avant messaging 2.24.0) est refuse par UnrecoverableError de bullmq (BaseWorker enregistre FAILED puis relance l'erreur, BullMQ reessaie sinon). Piege de version: @volontariapp/workers epingle messaging en exact, donc JobOf typait l'ancien payload tant que workers n'etait pas monte (1.3.37 epingle 2.24.0).[^src-0e351743]
- **Consigné par :** claude-code/agent

## 2026-10-13 - worker-event: yarn test est casse, test:integration fait DROP SCHEMA

- **Type :** pitfall
- **Leçon :** Dans workers-runners/worker-event, yarn test (jest sans config) echoue sur toutes les suites (0 test, erreur de parsing) avant tout changement. Seuls les *.integration.spec.ts existent, via yarn test:integration, dont le globalSetup execute DROP SCHEMA public CASCADE sur la base de config (localhost:5434, ms_event). Ne pas le lancer sans confirmer que la base est jetable. Pour tester un handler sans base : `yarn test:unit` (jest.unit.json, `*.unit.spec.ts`, mocks dans src/tests/mocks).[^src-2003dcdc]
- **Consigné par :** claude-code/agent

## 2026-10-11 - Notification WebSocket de fin de job: mapping messaging obligatoire

- **Type :** pitfall
- **Leçon :** JobOutboxSuccessPostProcessor n'emet un feedback ws:jobs-outbox-success que si getEventForJob(jobType) trouve une entree dans JOB_TO_EVENT_MAPPING (npm-packages/packages/messaging/src/websockets/events/mapping.ts), aujourd'hui uniquement des types FALLBACK_*. ws-service ne notifie ensuite que si getWsEventForEvent existe et si originalPayload.userId est present. Un nouveau type de job doit ajouter son mapping dans messaging (soumis a la regle du STOP) pour notifier le client. Verifie en session le 2026-10-11.[^src-3281d508]
- **Consigné par :** claude-code/agent

## 2026-10-11 - Outbox: un push BullMQ en echec laisse le job FAILED, jamais repousse

- **Type :** pitfall
- **Leçon :** Dans npm-packages/packages/database/src/outbox/consumers/outbox.consumer.ts, fetchPendingItems passe PENDING a PROCESSING, et processItems appelle markAsFailed si le push echoue. Seules les lignes PENDING sont relues: un job FAILED n'est jamais repousse et une ligne restee PROCESSING apres un crash n'est pas recuperee. Ne pas supposer qu'une panne Redis est rattrapee par l'outbox; prevoir une reemission applicative et surveiller jobs_outbox FAILED/PROCESSING. Verifie en session le 2026-10-11.[^src-9092d13d]
- **Consigné par :** claude-code/agent

[^src-9092d13d]: npm-packages/packages/database/src/outbox/consumers/outbox.consumer.ts
[^src-3281d508]: npm-packages/packages/messaging/src/websockets/events/mapping.ts
[^src-2003dcdc]: workers-runners/worker-event/src/tests/setup/global-setup.ts
[^src-0e351743]: workers-runners/worker-event/src/workers/handlers/fallback/fallback-delete-event.handler.ts
[^src-3ebc79f5]: workers-runners/worker-event/eslint.config.mjs
[^src-4f6a6ae1]: workers-runners/worker-event/package.json
