---
name: volontariapp-trace-async-flow
description: "Diagnostiquer un flux asynchrone qui ne produit pas son effet (job, événement, saga, notification WebSocket) : cartographie avec analyze_impact puis requêtes SQL sur jobs_outbox, job_audit, event_queue et inspection des Redis Streams et de leur DLQ. À utiliser pour un bug runtime, pas pour implémenter un flux."
type: Agent Skill
title: Trace Async Flow
tags: [async, debug, sql, outbox]
status: stable
paths:
  - "ms-*/src/migrations/common/**"
  - "npm-packages/packages/database/src/outbox/**"
  - "npm-packages/packages/post-processors/src/common/**"
  - npm-packages/packages/post-processors/src/core/helpers/retry.helper.ts
mesh_keys:
  - jobs_outbox
  - job_audit
  - event_queue
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:22:12Z"
sources:
  - id: migrations
    resource: ms-user/src/migrations/common
    title: "Migrations communes (jobs_outbox, job_audit, event_queue, triggers)"
  - id: status
    resource: npm-packages/packages/database/src/outbox/types/outbox.status.ts
    title: OutboxStatus
  - id: consumer
    resource: npm-packages/packages/database/src/outbox/consumers/outbox.consumer.ts
    title: "OutboxConsumer (FOR UPDATE SKIP LOCKED, PROCESSING)"
  - id: dispatcher
    resource: npm-packages/packages/database/src/outbox/dispatchers/outbox.dispatcher.ts
    title: OutboxDispatcher (COMPLETED après push)
  - id: streams
    resource: npm-packages/packages/shared/src/enums/streams.enum.ts
    title: Enum Streams
  - id: retry
    resource: npm-packages/packages/post-processors/src/core/helpers/retry.helper.ts
    title: "RetryHelper (DLQ <stream>-dlq)"
  - id: pp-failed
    resource: npm-packages/packages/post-processors/src/common/job-outbox-failed.post-processor.ts
    title: JobOutboxFailedPostProcessor (bug P4)
  - id: panne
    resource: docs/stockage-fichiers/11-scenarios-de-panne.md
    title: "Scénarios de panne, problèmes P2 et P4"
verified:
  - by: claude-code/agent
    at: "2026-10-13T20:48:38Z"
    digest: 25d3961729597215
  - by: claude-code/agent
    at: "2026-10-14T11:23:40Z"
    digest: 839b4282fe8b1b6d
  - by: "human:victor"
    at: "2026-10-19T08:21:45Z"
    digest: df75accd654047e4
  - by: claude-code/agent
    at: "2026-10-29T12:13:50Z"
    digest: d73e705316cfa40d
  - by: claude-code/agent
    at: "2026-10-29T17:22:26Z"
    digest: f39e9f067a5595fa
---

# Trace Async Flow & Diagnostic Runtime

Aucun microservice n'écrit dans Redis : tout effet asynchrone passe par une table outbox PostgreSQL de la base du service, puis par un runner. Un effet qui ne se produit pas s'est arrêté à l'un des maillons ci-dessous ; le diagnostic consiste à trouver lequel, dans l'ordre.

## 1. Les deux chaînes

```
JOB (1:1)
ms-<d> ── jobs_outbox (PENDING) ── outbox-<d> : PROCESSING puis push BullMQ, COMPLETED
       ── worker-<d> : job_audit PROCESSING puis COMPLETED | FAILED
       ── trigger notify_job_audit_status_change : event_queue type <d>:job:outbox:success | failure
       ── outbox-<d> : push Redis Stream <d>:job:outbox:success | failure
       ── JobOutboxSuccessPostProcessor : DELETE jobs_outbox  (failure : bug P4, voir section 4)

ÉVÉNEMENT (1:N)
domain-<d> repository (EventQueueEntity.createEvent, même transaction)
  ou trigger SQL de domaine (create_<topic>_event_queue_record, CDC de domain-event)
       ── event_queue (PENDING) ── outbox-<d> : push Redis Stream nommé dans target_services
       ── post-processors (post-processors-runner, ws-service) : XREADGROUP, retry, DLQ <stream>-dlq
```

`event_queue` ne reçoit donc pas que l'audit des jobs : c'est aussi la table des événements de domaine[^migrations]. La table s'appelle `event_queue` (jamais `event_outbox`, nom resté dans plusieurs README).

## 2. Étape statique : cartographier avec mesh-mcp

```json
analyze_impact({ "target": "USER_CREATED" })            // producteurs, topic, consommateurs, sagas
analyze_impact({ "target": "FALLBACK_UPDATE_USER" })    // job : controller producteur et handler
analyze_impact({ "target": "EVENT_CREATED", "depth": 2 })  // suit les réémissions (lignes heuristic)
```

« No producer resolved » n'est pas une preuve d'absence pour un événement émis via une table de correspondance (gather de `ws-service`) ou un stream construit en SQL (`<d>:job:outbox:*`) : vérifier par un `rg` ciblé sur un repo.

## 3. Étape runtime : requêtes SQL, base du microservice concerné

Statuts : `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` pour les trois tables[^status]. Colonnes camelCase entre guillemets (`"lastError"`, `"emitterId"`, `"traceId"`).

```sql
-- 1. Le job est-il sorti de l'outbox ?  PROCESSING bloqué = runner mort entre pull et push
SELECT id, type, target, status, attempts, "lastError", created_at, updated_at
FROM jobs_outbox WHERE type = '<type>' ORDER BY created_at DESC LIMIT 20;

-- 2. Le worker l'a-t-il pris ?  aucune ligne = job jamais consommé (queue, worker arrêté)
SELECT job_id, job_type, status, worker_id, current_attempt, error_message, started_at, finished_at
FROM job_audit WHERE job_id = '<jobs_outbox.id>';

-- 3. L'événement est-il parti ?  PENDING qui vieillit = outbox-<d> arrêté ou Redis injoignable
SELECT id, type, status, target_services, attempts, "lastError", correlation_id, processed_at
FROM event_queue WHERE type = '<type>' ORDER BY created_at DESC LIMIT 20;
```

| Observation | Maillon en cause |
| :--- | :--- |
| `jobs_outbox` en `PENDING` qui vieillit | `outbox-<d>` arrêté ou ne voit pas la base |
| `jobs_outbox` en `COMPLETED`, aucune ligne `job_audit` | Job dans BullMQ mais non consommé : `worker-<d>` arrêté, mauvaise queue (`target`) |
| `job_audit` en `FAILED` | Erreur du handler : `error_message`, logs de `worker-<d>` |
| `job_audit` en `COMPLETED`, `jobs_outbox` toujours présent | Le `DELETE` de `JobOutboxSuccessPostProcessor` n'a pas eu lieu : stream `<d>:job:outbox:success` ou post-processor commun |
| `event_queue` en `COMPLETED`, aucun effet | Consommateur : groupe du stream, filtre `shouldProcess`, DLQ |

`jobs_outbox` passe `COMPLETED` dès le push vers BullMQ[^dispatcher], pas après l'exécution : seul `job_audit` dit si le job a tourné.

## 4. Redis Streams et pièges connus

```bash
redis-cli XINFO GROUPS <stream>           # groupes, lag, pending
redis-cli XPENDING <stream> <groupe>      # messages réclamés non acquittés
redis-cli XRANGE <stream>-dlq - + COUNT 20  # messages abandonnés après maxRetries
```

- **Noms des streams** : valeurs de l'enum `Streams` (`@volontariapp/shared`)[^streams], conventions mélangées (`user:created`, `post-created`, `event:successfully_created`, `ws:event-created-feedback`). Le README de `post-processors-runner` (`stream:ms-user`...) est faux.
- **DLQ** : après `maxRetries` tentatives, le message part dans `<stream>-dlq` et il est acquitté[^retry]. Aucun rejeu automatique : un événement en DLQ est perdu pour son consommateur (problème P2)[^panne].
- **Bug P4** : le trigger émet `<d>:job:outbox:failure` mais `JobOutboxFailedPostProcessor` n'accepte que `:job:outbox:failed`[^pp-failed]. Aucun feedback d'échec de job n'existe aujourd'hui : un job `FAILED` reste silencieux côté client.
- **Saga** : un échec de création d'événement passe `saga_status` à `CANCEL` (post-processor-event) ; un post en échec reste `PENDING`, aucun consommateur ne le compense.

### Contexte de trace des lignes outbox (`traceparent`)

- `jobs_outbox.traceparent` et `event_queue.traceparent` (`varchar(55)` NULL, migration commune `1791900000000-AddTraceparentToJobsOutboxAndEventQueue`) contiennent le contexte W3C (`00-<trace-id>-<span-id>-<flags>`) capturé par `captureTraceparent()` (`@volontariapp/database`) dans `EventQueueEntity.createEvent` et `JobsOutboxEntity.createJob`. `traceId` (uuid) est l'ancien champ, conservé.
- NULL est normal : ligne écrite par un trigger SQL (dont `notify_job_audit_status_change`), tâche planifiée, ou tracing désactivé. Ne pas y voir un bug d'émission.
- Transport : champ `traceparent` du stream Redis (chaîne vide si absent) et dans le JSON `event` ; champ `traceparent` de `JobEnvelope` dans les données du job BullMQ. Les consommateurs doivent traiter `''` et l'absence (messages antérieurs) comme « pas de contexte ».
- Un événement déclenché par un autre hérite du `traceparent` de la source via `EventQueueEntity.createFollowUp` (comme `traceId` et `correlationId`) ; `correlationId` sert au Scatter-Gather de `ws-service`, `traceparent` à la trace Datadog, les deux n'ont pas le même rôle.
- Restauration du contexte (tâche 2.11) : `BaseWorker.process` exécute le job dans un span `job <type>` enfant du `traceparent` de `JobEnvelope` ; `SinglePostProcessor` ouvre un span `event <type>` enfant du `traceparent` de l'événement ; `BatchPostProcessor` ouvre un span par message (chacun dans la trace de son message) plus un span `batch <groupe>` qui les référence par liens et qui est actif pendant `processEvents`. Helpers `runInTraceContext` / `runBatchInTraceContext` de `@volontariapp/database`, tracer `@volontariapp/async`, spans `CONSUMER`, attributs `type`, `emitter`, `correlation_id` (absent pour un job : `JobEnvelope` n'a pas de `correlationId`). Dans un lot, les spans de message durent autant que le lot (le handler reçoit tous les messages en un appel). Sans `traceparent` (message antérieur, trigger SQL) : nouvelle trace. Jusqu'à `@volontariapp/database` 3.10.13, un `createFollowUp` appelé dans le handler recopie le `traceparent` de la source, pas celui du span courant, et les pushers recopient celui de la ligne : tous les sauts asynchrones d'une requête sont alors des enfants directs du même span (observé en prod le 2026-10-29 sur `POST /api/v1/events` : 14 sauts `Producer`/`Consumer` enfants du span gRPC `ms-event`), donc la Flow Map Datadog dessine une étoile `ms-event -> chaque runner` et non la chaîne `outbox -> post-processor -> ws-service`. Correctif en cours (branche `fix/trace-parent-child-async-hops` de `npm-packages`, non publié au 2026-10-29) : `continueTraceparent(origin)` renvoie le span actif s'il est dans la même trace que `origin`, sinon `origin` ; `EventQueuePusher`, `JobsOutboxPusher` et `createFollowUp` l'utilisent. Un `BatchPostProcessor` ouvre son span `batch` comme enfant du span du premier message (correctif `@volontariapp/database` 3.11.1, publié le 2026-10-29) : le travail du lot (appels, écritures, événements de suite, jobs) reste dans la trace de ce premier message, et `continueTraceparent` chaîne dessus ; les autres messages du lot gardent leur span et un lien, et leurs événements de suite retombent sur le `traceparent` d'origine (frères). Avant 3.11.1, le span `batch` était une racine d'une autre trace.

### Configuration du tracing (`initTracing`, `@volontariapp/monitoring` 2.2.0)

- Échantillonnage `ParentBased(TraceIdRatioBased)` : option `sampleRatio` ou `OTEL_TRACES_SAMPLER_ARG` (0 à 1, défaut 1 ; valeur invalide : retour à 1 avec avertissement). Seules les traces racines sont tirées ; une saga asynchrone suit la décision de son parent, donc une trace écartée à la gateway reste écartée dans les workers et post-processors. Le défaut reste à fixer avec les quotas Datadog (ticket 0.4 : quotas non documentés).
- Attribut `deployment.environment` : option `environment` ou `DD_ENV`, absent sinon (jamais déduit de `NODE_ENV`). `DD_ENV` n'est injecté ni dans `deploy` (YAML) ni dans `ci-tools/docker-compose.yml` : à ajouter dans les manifests pour que l'attribut apparaisse.
- SIGTERM : le SDK est vidé sans `process.exit`. Si un autre listener SIGTERM existe au moment du signal (NestJS `enableShutdownHooks`) il termine le processus, sinon le signal est renvoyé après le vidage. Piège : un seul listener SIGTERM sans `exit` fige le processus (Node n'applique plus l'arrêt par défaut) ; au 2026-10-13 seuls `ws-service` appelle `enableShutdownHooks`, pas les autres services.

## 5. Règles

- [ ] Ne jamais supposer qu'un service pousse directement dans Redis : partir de la table outbox de sa base.
- [ ] Toujours `analyze_impact` avant d'ouvrir un runner, puis SQL, puis Redis, dans cet ordre.
- [ ] Les runners `outbox-*` (Node pur, sans NestJS) n'ont pas de logique propre : tout est dans `@volontariapp/outbox` et `@volontariapp/database`. Une modification du polling doit garder `FOR UPDATE SKIP LOCKED` : livraison au moins une fois, sans double publication quand le runner est répliqué.
- [ ] Un diagnostic qui révèle un nouveau piège devient une leçon : `evolve.py learn --skill volontariapp-trace-async-flow --kind pitfall`.

[^migrations]: Migrations communes (jobs_outbox, job_audit, event_queue, triggers)
[^status]: OutboxStatus
[^dispatcher]: OutboxDispatcher (COMPLETED après push)
[^streams]: Enum Streams
[^retry]: RetryHelper (DLQ <stream>-dlq)
[^panne]: Scénarios de panne, problèmes P2 et P4
[^pp-failed]: JobOutboxFailedPostProcessor (bug P4)
