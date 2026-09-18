# Deep-Dive : Étape 3 - Workers & Handlers dans `workers-runners`

Ce document détaille l'implémentation des processeurs de jobs dans [`workers-runners`](file:///Users/victoragahi/Developer/meta/workers-runners) via `@volontariapp/workers` et `@nestjs/bullmq`.

---

## 1. Architecture d'un Runner Worker

```
workers-runners/worker-event/src/
├── workers/
│   ├── event.worker.ts                   # Worker principal BullMQ (@Processor)
│   ├── fallback-event.worker.ts          # Worker dédié aux fallbacks
│   └── handlers/
│       ├── interfaces/job-handler.interface.ts
│       ├── publish-event.handler.ts      # Un handler dédié par type de job
│       └── sync-external-calendar.handler.ts
├── providers/
├── config/
└── app.module.ts                         # Enregistrement NestJS
```

---

## 2. Le Contrat `IJobHandler`

Chaque type de job est traité par une classe distincte implémentant `IJobHandler` :

```typescript
import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType, JobRegistry } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from './interfaces/job-handler.interface.js';

@Injectable()
export class ExportEventsReportHandler implements IJobHandler<typeof JobMessagingType.EXPORT_EVENTS_REPORT> {
  private readonly logger = new Logger({ context: ExportEventsReportHandler.name });
  
  // Clé d'identification correspondant à l'enum de messaging
  readonly jobType = JobMessagingType.EXPORT_EVENTS_REPORT;

  async handle(job: JobOf<typeof JobMessagingType.EXPORT_EVENTS_REPORT>): Promise<{
    originalPayload: JobRegistry[typeof JobMessagingType.EXPORT_EVENTS_REPORT];
  }> {
    // Extraction du payload typé depuis l'envelope
    const { organizerId, startDate, endDate, format, targetEmail } = job.data.payload;

    this.logger.info(`Generating ${format} report for organizer ${organizerId}`);

    try {
      // 1. Exécution de la tâche lourde
      await this.generateReportAndSendEmail(organizerId, startDate, endDate, format, targetEmail);

      this.logger.info(`Report successfully sent to ${targetEmail}`);

      // 2. OBLIGATOIRE : Renvoyer le payload d'origine
      return { originalPayload: job.data.payload };
    } catch (error) {
      this.logger.error(`Failed to export report for ${organizerId}`, error);
      throw error; // Propager pour que BaseWorker enregistre l'échec dans job_audit
    }
  }

  private async generateReportAndSendEmail(...) {
    // Logique de génération et d'envoi
  }
}
```

---

## 3. Le Raccordement dans `BaseWorker`

Le Worker principal centralise l'écoute de la file BullMQ et route vers le bon handler via une `Map` :

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { BaseWorker, JobAuditRepository, type JobOf } from '@volontariapp/workers';
import { EventsQueue, JobMessagingType } from '@volontariapp/messaging';
import { PublishEventHandler } from './handlers/publish-event.handler.js';
import { ExportEventsReportHandler } from './handlers/export-events-report.handler.js';
import type { IJobHandler } from './handlers/interfaces/job-handler.interface.js';

@Injectable()
@Processor(EventsQueue.EVENTS)
export class EventWorker extends BaseWorker<JobMessagingType> {
  private readonly handlerMap: Map<JobMessagingType, IJobHandler>;

  constructor(
    @Inject(JobAuditRepository) auditRepo: JobAuditRepository,
    @Inject(PublishEventHandler) publishHandler: PublishEventHandler,
    @Inject(ExportEventsReportHandler) exportHandler: ExportEventsReportHandler, // Ingestion du handler
  ) {
    super(auditRepo);
    const handlers: IJobHandler[] = [publishHandler, exportHandler];
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

---

## 4. Ce que `BaseWorker` gère automatiquement pour vous

En étendant `BaseWorker`, vous bénéficiez de garanties industrielles :
1. **Traçabilité du Worker Host** : Identifiant de machine (`workerId`) horodaté.
2. **Détection d'Exécution Multiple** : Vérification dans `job_audit` pour éviter qu'un job acquitté ne soit ré-exécuté.
3. **Transition Automatique d'État** :
   - Début : Enregistrement `status = WORKING`.
   - Succès : Enregistrement `status = DONE`.
   - Échec : Enregistrement `status = FAILED` avec message d'erreur et stack trace.
