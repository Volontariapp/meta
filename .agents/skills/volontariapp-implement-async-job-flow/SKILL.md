---
name: volontariapp-implement-async-job-flow
description: "Guide pas-à-pas pour concevoir, émettre et consommer un Job d'arrière-plan (BullMQ, BaseWorker, IJobHandler, job_audit loop et Fallbacks)."
type: Agent Skill
title: Implement Async Job Flow
tags: [async, jobs, bullmq, outbox, workers]
status: stable
paths:
  - "npm-packages/packages/messaging/src/jobs/**"
  - "npm-packages/packages/workers/src/**"
  - "workers-runners/*/src/**"
mesh_keys:
  - workers-runners
  - outbox-runners
  - messaging/src/jobs
  - fallback_
  - jobtype
  - jobmessagingtype
  - ijobhandler
  - baseworker
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:22:12Z"
sources:
  - id: jobs
    resource: npm-packages/packages/messaging/src/jobs
    title: Contrats de jobs
  - id: workers
    resource: npm-packages/packages/workers/src
    title: "@volontariapp/workers"
  - id: c3-async
    resource: docs/C3-Async-Patterns-And-Flows.md
    title: C3 Async Patterns and Flows
  - id: base-cmd
    resource: ms-event/src/modules/event/controllers/commands/base.command.controller.ts
    title: BaseCommandController.withFallback (ms-event)
  - id: dispatcher
    resource: npm-packages/packages/database/src/outbox/dispatchers/outbox.dispatcher.ts
    title: "OutboxDispatcher : COMPLETED après le push"
  - id: pp-success
    resource: npm-packages/packages/post-processors/src/common/job-outbox-success.post-processor.ts
    title: JobOutboxSuccessPostProcessor
  - id: pp-failed
    resource: npm-packages/packages/post-processors/src/common/job-outbox-failed.post-processor.ts
    title: JobOutboxFailedPostProcessor
  - id: base-worker
    resource: npm-packages/packages/workers/src/core/base.worker.ts
    title: "BaseWorker (garde d'idempotence job_audit)"
  - id: catalogue
    resource: .agents/skills/volontariapp-implement-async-job-flow/scripts/job_catalogue.py
    title: job_catalogue.py
verified:
  - by: claude-code/claude-opus-5-5
    at: "2026-10-06T09:00:38Z"
    digest: 20a2c5ba4fcf1ea2
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T16:07:49Z"
    digest: 345152032d485017
  - by: claude-code/agent
    at: "2026-10-07T09:33:28Z"
    digest: ecd7f271c01ebcc3
  - by: claude-code/agent
    at: "2026-10-07T10:22:48Z"
    digest: ecd7f271c01ebcc3
  - by: claude-code/agent
    at: "2026-10-07T15:04:15Z"
    digest: 3e1ad8843770396a
---

# Guide : Implémenter un Job Asynchrone End-to-End

Dans Volontariapp, un **Job** représente une opération asynchrone **1 : 1** (garantie qu'un seul worker l'exécutera). Il passe par le **Transactional Outbox**, une file **BullMQ**, un **Worker Runner** (`BaseWorker` + `IJobHandler`), puis est audité via un **Trigger SQL PostgreSQL** avant son nettoyage automatique.

---

## Vue d'Ensemble du Cycle de Vie d'un Job

```
[1. Contrat SSOT]      npm-packages/packages/messaging (JobMessagingType, JobRegistry, Queues)
         ↓
[2. Émetteur]          ms-* / domain-* (JobsOutboxEntity.createJob dans jobs_outbox)
         ↓
[3. Démon Outbox]      outbox-* runner (Pousse vers BullMQ Queue Redis)
         ↓
[4. Worker Runner]     workers-runners/worker-* (BaseWorker + IJobHandler)
         ↓
[5. Table job_audit]   Worker met à jour le statut (PROCESSING -> COMPLETED / FAILED)
         ↓
[6. SQL Trigger DB]    Déclencheur auto sur job_audit -> insère dans event_queue
         ↓
[7. Post-Processor]    Nettoyage automatique (Hard Delete de jobs_outbox)
```

---

> [!TIP]
> **Guides Approfondis (Deep-Dive) :**
> Si vous êtes bloqué sur une étape précise ou avez besoin d'exemples de code exhaustifs, consultez les fiches dédiées dans `references/` :
> - 01-job-messaging-contracts.md ([`references/01-job-messaging-contracts.md`](/volontariapp-implement-async-job-flow/references/01-job-messaging-contracts.md)) (Enums, Registres, Queues, Payloads)
> - 02-emitting-jobs-and-fallbacks.md ([`references/02-emitting-jobs-and-fallbacks.md`](/volontariapp-implement-async-job-flow/references/02-emitting-jobs-and-fallbacks.md)) (Jobs classiques vs `withFallback` en controller)
> - 03-worker-and-handlers.md ([`references/03-worker-and-handlers.md`](/volontariapp-implement-async-job-flow/references/03-worker-and-handlers.md)) (BaseWorker, IJobHandler, Idempotence)
> - 04-audit-loop-and-cleanup.md ([`references/04-audit-loop-and-cleanup.md`](/volontariapp-implement-async-job-flow/references/04-audit-loop-and-cleanup.md)) (SQL Trigger, job_audit, nettoyage automatique)

---

## Étape 1 : Définir le Job dans `npm-packages/packages/messaging` (SSOT)
> 📖 *Détails complets :* 01-job-messaging-contracts.md ([`references/01-job-messaging-contracts.md`](/volontariapp-implement-async-job-flow/references/01-job-messaging-contracts.md))

1. **Ajouter la constante de Job** dans `packages/messaging/src/jobs/<domaine>/payloads.ts` :
   ```typescript
   export const EventsJobType = {
     // ...
     SYNC_EXTERNAL_CALENDAR: 'event.sync_external_calendar',
   } as const;
   ```

2. **Définir l'interface du Payload** dans le même fichier :
   ```typescript
   export interface ISyncExternalCalendarPayload {
     eventId: string;
     calendarUrl: string;
     syncRequestedBy: string;
   }
   ```

3. **Enregistrer dans `JobRegistry`** (`packages/messaging/src/jobs/index.ts`) :
   ```typescript
   export interface JobRegistry {
     // ...
     [JobMessagingType.SYNC_EXTERNAL_CALENDAR]: ISyncExternalCalendarPayload;
   }
   ```

4. **Vérifier ou définir la Queue BullMQ** (`packages/messaging/src/jobs/<domaine>/queue.ts`) :
   ```typescript
   export enum EventsQueue {
     EVENTS = 'events-queue',
     FALLBACK_EVENTS = 'fallback-events-queue',
   }
   ```

> [!CAUTION]
> ### 🛑 POINT DE BLOCAGE CRITIQUE : LE STOP IMMÉDIAT
> **Tu viens de modifier `npm-packages/packages/messaging` ? TU DOIS T'ARRÊTER.**
> 1. Valide la compilation locale dans `npm-packages` : `yarn build && yarn test`.
> 2. Génère le changeset et le bump : `yarn changeset add` puis `yarn changeset version` (une seule fois par branche).
> 3. **STOP TOTAL :** Interdiction formelle de passer à l'Étape 2 (`ms-*`) ou l'Étape 3 (`workers-runners`) immédiatement !
> 4. Passe la main au Lead Dev pour qu'il pousse sur une PR et que la CI publie la version snapshot `<version>-snap-<sha court>`, publiée sous le dist-tag `next` et listée en commentaire de la PR (ex: `@volontariapp/messaging@2.17.1-snap-a1b2c3d`).
> 5. **Ce n'est qu'après publication par la CI** que tu pourras lancer `yarn up @volontariapp/messaging` dans les microservices et continuer les étapes ci-dessous.

---

## Étape 2 : Émettre le Job en Base (`ms-*` ou `domain-*`)
> 📖 *Détails complets :* 02-emitting-jobs-and-fallbacks.md ([`references/02-emitting-jobs-and-fallbacks.md`](/volontariapp-implement-async-job-flow/references/02-emitting-jobs-and-fallbacks.md))

Le job est inséré dans la table `jobs_outbox` lors de la transaction PostgreSQL.

### Option A : Job Standard (Opération de fond planifiée)
```typescript
import { JobsOutboxEntity, JobsOutboxModel } from '@volontariapp/database';
import { JobsOutboxRepository } from '@volontariapp/outbox';
import { EventsQueue, JobMessagingType } from '@volontariapp/messaging';

const job = JobsOutboxEntity.createJob<typeof JobMessagingType.SYNC_EXTERNAL_CALENDAR>({
  type: JobMessagingType.SYNC_EXTERNAL_CALENDAR,
  emitter: 'ms-event',
  emitterId: userId,
  scheduledAt: new Date(),
  target: EventsQueue.EVENTS,
  payload: {
    eventId,
    calendarUrl,
    syncRequestedBy: userId,
  },
});

const jobsRepo = new JobsOutboxRepository(queryRunner.manager.getRepository(JobsOutboxModel));
await jobsRepo.create(job);
```

### Option B : Fallback Job (En cas d'erreur dans un Command Controller)
Dans les contrôleurs héritant de `BaseCommandController` :
```typescript
return await this.withFallback(
  JobMessagingType.FALLBACK_SYNC_CALENDAR,
  userId,
  { eventId, calendarUrl },
  async () => {
    return await this.calendarService.sync(eventId);
  },
);
```

> [!NOTE]
> **Le Runner Outbox est 100% transparent :** `outbox-runners/outbox-<domaine>` scrute `jobs_outbox` avec `SELECT ... FOR UPDATE SKIP LOCKED` et pousse le job dans la queue BullMQ correspondante sur Redis. Aucun code supplémentaire n'est nécessaire dans l'outbox runner !

---

## Étape 3 : Créer le Handler Unitaire dans `workers-runners`
> 📖 *Détails complets :* 03-worker-and-handlers.md ([`references/03-worker-and-handlers.md`](/volontariapp-implement-async-job-flow/references/03-worker-and-handlers.md))

Emplacement : `workers-runners/worker-<domaine>/src/workers/handlers/<nom-du-job>.handler.ts`.

Chaque job possède sa propre classe implémentant `IJobHandler` :

```typescript
import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType, JobRegistry } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from './interfaces/job-handler.interface.js';

@Injectable()
export class SyncExternalCalendarHandler implements IJobHandler<typeof JobMessagingType.SYNC_EXTERNAL_CALENDAR> {
  private readonly logger = new Logger({ context: SyncExternalCalendarHandler.name });
  
  readonly jobType = JobMessagingType.SYNC_EXTERNAL_CALENDAR;

  async handle(job: JobOf<typeof JobMessagingType.SYNC_EXTERNAL_CALENDAR>): Promise<{
    originalPayload: JobRegistry[typeof JobMessagingType.SYNC_EXTERNAL_CALENDAR];
  }> {
    const { eventId, calendarUrl } = job.data.payload;
    this.logger.info(`Syncing external calendar for event ${eventId}`, { calendarUrl });

    // Exécution du traitement lourd (ex: parsing iCal, appel réseau)
    await this.performSync(eventId, calendarUrl);

    this.logger.info(`Calendar synced successfully for ${eventId}`);
    
    // Renvoyer obligatoirement le payload d'origine pour l'enregistrement d'audit
    return { originalPayload: job.data.payload };
  }

  private async performSync(eventId: string, url: string): Promise<void> {
    // Logique métier
  }
}
```

---

## Étape 4 : Raccorder le Handler au Worker NestJS

Dans le Worker principal du domaine (`workers-runners/worker-<domaine>/src/workers/<domaine>.worker.ts`) :

1. **Injecter le nouveau handler dans la `handlerMap`** :
   ```typescript
   @Injectable()
   @Processor(EventsQueue.EVENTS)
   export class EventWorker extends BaseWorker<JobMessagingType> {
     private readonly handlerMap: Map<JobMessagingType, IJobHandler>;

     constructor(
       @Inject(JobAuditRepository) auditRepo: JobAuditRepository,
       @Inject(PublishEventHandler) publishHandler: PublishEventHandler,
       @Inject(SyncExternalCalendarHandler) syncHandler: SyncExternalCalendarHandler, // ← Nouveau
     ) {
       super(auditRepo);
       const handlers: IJobHandler[] = [publishHandler, syncHandler];
       this.handlerMap = new Map(handlers.map((h) => [h.jobType, h]));
     }

     protected async processJob(job: JobOf<JobMessagingType>) {
       const handler = this.handlerMap.get(job.name as JobMessagingType);
       if (!handler) {
         throw new InternalServerError(`Unhandled job type: ${job.name}`, 'UNHANDLED_JOB_TYPE', { jobName: job.name });
       }
       return handler.handle(job);
     }
   }
   ```

2. **Déclarer le handler comme Provider** dans `app.module.ts` de ce worker.

---

## Étape 5 : La Boucle d'Audit et le Nettoyage Automatique
> 📖 *Détails complets :* 04-audit-loop-and-cleanup.md ([`references/04-audit-loop-and-cleanup.md`](/volontariapp-implement-async-job-flow/references/04-audit-loop-and-cleanup.md))

Vous n'avez **aucun code de nettoyage manuel à écrire** :
1. `BaseWorker` passe le job en statut `PROCESSING` dans la table `job_audit` dès qu'il le prend en charge.
2. Dès que le handler retourne son résultat, `BaseWorker` passe le statut à `COMPLETED` (ou `FAILED` en cas d'erreur).
3. Le **Trigger SQL PostgreSQL** `job_audit_status_trigger` se déclenche automatiquement sur `job_audit` et insère un événement `<domaine>:job:outbox:success` (ou `:failure`) dans la table `event_queue`.
4. L'outbox-runner pousse cet événement dans Redis Stream.
5. Un post-processor central écoute ce stream et exécute le **Hard Delete** de la ligne d'origine dans `jobs_outbox`.

---

## Faits vérifiés dans le code (2026-10-06)

| Sujet | Réalité | Conséquence |
| :--- | :--- | :--- |
| `IJobHandler` | Interface **locale à chaque worker**, pas exportée par `@volontariapp/workers` : `worker-user/src/handlers/interfaces/`, `worker-post` et `worker-social/src/workers/job-handler.interface.ts` | Importer celle du worker concerné. Un handler vit sous `src/handlers/` dans `worker-user`, sous `src/workers/handlers/` ailleurs. |
| `withFallback` | Dupliqué dans chaque `ms-*` (`BaseCommandController`), aucun job sur une erreur 400/404/409, sinon job `FALLBACK_*` vers la queue `FALLBACK_*` puis `FALLBACK_ACTIVATED`[^base-cmd] | Les queries n'ont pas de fallback. Le payload est `{ userId, payload }`, posé avec un `@ts-expect-error` existant : dette à ne pas recopier. |
| Statut de `jobs_outbox` | `PROCESSING` au pull, `COMPLETED` dès le push BullMQ[^dispatcher] | La ligne reste en base jusqu'au `DELETE` de `JobOutboxSuccessPostProcessor`[^pp-success]. `COMPLETED` ne veut pas dire « exécuté ». |
| Échec d'un job | Le trigger émet `<domaine>:job:outbox:failure`, `JobOutboxFailedPostProcessor` n'accepte que `:job:outbox:failed`, et son `UPDATE ... WHERE status = PENDING` ne toucherait pas une ligne déjà `COMPLETED`[^pp-failed] | **Bug P4** : aucun feedback d'échec de job sur la plateforme. Ne pas s'appuyer sur ce chemin. |
| Idempotence | `BaseWorker` saute un job déjà `COMPLETED` dans `job_audit`[^base-worker] | Un rejeu BullMQ d'un job terminé est sans effet ; un job interrompu en `PROCESSING` est rejoué. |
| Workers existants | `throw new Error` et cast `as Promise<...>` dans `processJob` | Dette : utiliser `InternalServerError` (`@volontariapp/errors`) comme dans l'exemple ci-dessus. |
| Handlers sans producteur | 8 handlers (`FALLBACK_GET_*`, `FALLBACK_SIGN_UP`) n'ont aucun producteur ; 5 jobs (`PUBLISH_EVENT`, `SEND_WELCOME_EMAIL`...) ne sont produits que par `ms-user/.../controllers/tests/user.test.controller.ts` | Vérifier avec le catalogue avant de supposer qu'un job tourne en production. |

Catalogue à jour, calculé depuis le code[^catalogue] :

```bash
python3 .agents/skills/volontariapp-implement-async-job-flow/scripts/job_catalogue.py            # tous les jobs
python3 .agents/skills/volontariapp-implement-async-job-flow/scripts/job_catalogue.py --orphans  # sans producteur ou sans handler
```

## Règles d'Or & Checklist Anti-Bugs

- [ ] **1 Job = 1 Exécution :** Si vous avez besoin de notifier plusieurs services, créez un **Event** (`EventQueueEntity`), pas un Job.
- [ ] **Toujours retourner `{ originalPayload: job.data.payload }`** à la fin du handler pour que `BaseWorker` puisse auditer l'exécution.
- [ ] **Pas d'appel Redis direct :** Toujours créer le job via `JobsOutboxEntity.createJob()` dans la transaction PostgreSQL.
- [ ] **Idempotence :** Un worker peut redémarrer en cours de traitement ; concevez le handler pour qu'il puisse être rejoué sans corrompre les données.

[^base-cmd]: BaseCommandController.withFallback (ms-event)
[^dispatcher]: OutboxDispatcher : COMPLETED après le push
[^pp-success]: JobOutboxSuccessPostProcessor
[^pp-failed]: JobOutboxFailedPostProcessor
[^base-worker]: BaseWorker (garde d'idempotence job_audit)
[^catalogue]: job_catalogue.py
