---
name: Implement Async Job Flow
description: Guide pas-à-pas pour concevoir, émettre et consommer un Job d'arrière-plan (BullMQ, BaseWorker, IJobHandler, job_audit loop et Fallbacks).
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
[5. Table job_audit]   Worker met à jour le statut (working -> done / failed)
         ↓
[6. SQL Trigger DB]    Déclencheur auto sur job_audit -> insère dans event_outbox
         ↓
[7. Post-Processor]    Nettoyage automatique (Hard Delete de jobs_outbox)
```

---

> [!TIP]
> **Guides Approfondis (Deep-Dive) :**
> Si vous êtes bloqué sur une étape précise ou avez besoin d'exemples de code exhaustifs, consultez les fiches dédiées dans `references/` :
> - [01-job-messaging-contracts.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-job-flow/references/01-job-messaging-contracts.md) (Enums, Registres, Queues, Payloads)
> - [02-emitting-jobs-and-fallbacks.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-job-flow/references/02-emitting-jobs-and-fallbacks.md) (Jobs classiques vs `withFallback` en controller)
> - [03-worker-and-handlers.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-job-flow/references/03-worker-and-handlers.md) (BaseWorker, IJobHandler, Idempotence)
> - [04-audit-loop-and-cleanup.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-job-flow/references/04-audit-loop-and-cleanup.md) (SQL Trigger, job_audit, nettoyage automatique)

---

## Étape 1 : Définir le Job dans `npm-packages/packages/messaging` (SSOT)
> 📖 *Détails complets :* [01-job-messaging-contracts.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-job-flow/references/01-job-messaging-contracts.md)

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

---

## Étape 2 : Émettre le Job en Base (`ms-*` ou `domain-*`)
> 📖 *Détails complets :* [02-emitting-jobs-and-fallbacks.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-job-flow/references/02-emitting-jobs-and-fallbacks.md)

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
> 📖 *Détails complets :* [03-worker-and-handlers.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-job-flow/references/03-worker-and-handlers.md)

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
         throw new Error(`Unhandled job type: ${job.name}`);
       }
       return handler.handle(job);
     }
   }
   ```

2. **Déclarer le handler comme Provider** dans `app.module.ts` de ce worker.

---

## Étape 5 : La Boucle d'Audit et le Nettoyage Automatique
> 📖 *Détails complets :* [04-audit-loop-and-cleanup.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-job-flow/references/04-audit-loop-and-cleanup.md)

Vous n'avez **aucun code de nettoyage manuel à écrire** :
1. `BaseWorker` passe le job en statut `WORKING` dans la table `job_audit` dès qu'il le prend en charge.
2. Dès que le handler retourne son résultat, `BaseWorker` passe le statut à `DONE`.
3. Un **Trigger SQL PostgreSQL** se déclenche automatiquement sur `job_audit` et insère un événement `JOB_OUTBOX_SUCCESS` dans la table `event_outbox`.
4. L'outbox-runner pousse cet événement dans Redis Stream.
5. Un post-processor central écoute ce stream et exécute le **Hard Delete** de la ligne d'origine dans `jobs_outbox`.

---

## Règles d'Or & Checklist Anti-Bugs

- [ ] **1 Job = 1 Exécution :** Si vous avez besoin de notifier plusieurs services, créez un **Event** (`EventQueueEntity`), pas un Job.
- [ ] **Toujours retourner `{ originalPayload: job.data.payload }`** à la fin du handler pour que `BaseWorker` puisse auditer l'exécution.
- [ ] **Pas d'appel Redis direct :** Toujours créer le job via `JobsOutboxEntity.createJob()` dans la transaction PostgreSQL.
- [ ] **Idempotence :** Un worker peut redémarrer en cours de traitement ; concevez le handler pour qu'il puisse être rejoué sans corrompre les données.
