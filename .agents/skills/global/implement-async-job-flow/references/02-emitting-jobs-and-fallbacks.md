# Deep-Dive : Étape 2 - Émission de Jobs & Fallbacks

Ce document détaille l'insertion des jobs dans PostgreSQL via `JobsOutboxEntity` et l'utilisation du pattern `withFallback` dans les Command Controllers.

---

## 1. Deux Modes d'Émission de Jobs

Dans Volontariapp, les jobs sont émis selon deux intentions métiers :
1. **Job Prévu (Background Work)** : Une action intentionnellement différée (ex: exporter un rapport lourd, envoyer un email de bienvenue).
2. **Fallback Job (Auto-Cicatrisation)** : Une commande synchrone qui a échoué en raison d'un aléa technique (timeout externe, conflit temporaire) et qui est automatiquement transformée en job d'arrière-plan.

---

## 2. Émission d'un Job Prévu (Standard)

Dans un service ou repository de domaine (`npm-packages/packages/domain-*`) :

```typescript
import { JobsOutboxEntity, JobsOutboxModel } from '@volontariapp/database';
import { JobsOutboxRepository } from '@volontariapp/outbox';
import { EventsQueue, JobMessagingType, IExportEventsReportPayload } from '@volontariapp/messaging';
import type { QueryRunner } from 'typeorm';

async scheduleExport(queryRunner: QueryRunner, organizerId: string, options: ExportOptions): Promise<void> {
  const payload: IExportEventsReportPayload = {
    organizerId,
    startDate: options.startDate.toISOString(),
    endDate: options.endDate.toISOString(),
    format: options.format,
    targetEmail: options.targetEmail,
  };

  // 1. Création de l'entité de Job
  const job = JobsOutboxEntity.createJob<typeof JobMessagingType.EXPORT_EVENTS_REPORT>({
    type: JobMessagingType.EXPORT_EVENTS_REPORT,
    emitter: 'ms-event',
    emitterId: organizerId,
    scheduledAt: new Date(), // ou date future pour exécution différée
    target: EventsQueue.EVENTS, // File BullMQ de destination
    payload,
  });

  // 2. Persistance dans la table jobs_outbox
  const jobsRepo = new JobsOutboxRepository(
    queryRunner.manager.getRepository(JobsOutboxModel),
  );
  await jobsRepo.create(job);
}
```

---

## 3. Émission d'un Fallback Job (`BaseCommandController`)

Dans les microservices (`ms-*/src/modules/*/controllers/commands/`), les contrôleurs étendent `BaseCommandController`.

La méthode `withFallback` encapsule l'opération :
- Si l'erreur est une erreur client (`400`, `404`, `409`), aucune tâche de fallback n'est créée et l'erreur est renvoyée au client.
- Si l'erreur est un crash inattendu (`500`, timeout), elle intercepte l'erreur, persiste un job dans `jobs_outbox` ciblant `EventsQueue.FALLBACK_EVENTS`, et lève `FALLBACK_ACTIVATED`.

```typescript
@Controller()
export class EventCommandController extends BaseCommandController {
  @GrpcMethod('EventService', 'CreateEvent')
  async createEvent(data: CreateEventDto, metadata: Metadata) {
    const userId = this.extractUserId(metadata);

    return await this.withFallback(
      JobMessagingType.FALLBACK_CREATE_EVENT,
      userId,
      data,
      async () => {
        // Opération synchrone principale
        return await this.eventService.createEvent(data, userId);
      },
    );
  }
}
```

---

## 4. Structure de la Table `jobs_outbox`

Chaque ligne de `jobs_outbox` contient :
- `id` : UUID unique du job.
- `type` : Chaîne de caractères correspondant à `JobMessagingType`.
- `emitter` : Nom du microservice émetteur (`ms-user`, `ms-event`).
- `emitterId` : ID de l'utilisateur ou entité à l'origine de l'action.
- `target` : Nom de la queue Redis BullMQ (`events-queue`).
- `status` : `pending` -> `processing` -> `done` -> supprimé par post-processor.
- `payload` : JSONB contenant les arguments nécessaires au worker.
