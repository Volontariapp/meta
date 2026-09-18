---
name: Implement Async Event Flow
description: Guide pas-à-pas pour concevoir et implémenter un flux asynchrone complet (messaging -> outbox -> post-processors -> ws-service -> client).
---

# Guide : Implémenter un Flux Asynchrone End-to-End

Dans Volontariapp, **aucun microservice n'écrit directement dans Redis**. Tout traitement asynchrone (1:N) passe par le **Transactional Outbox Pattern**, consommé par les **Post-Processors**, agrégé via **Scatter-Gather** dans `ws-service`, et notifié au client `nativapp` via WebSockets.

---

## Vue d'Ensemble du Pipeline

```
[1. Contrat SSOT]   npm-packages/packages/messaging (Enum, Interface, Registre)
         ↓
[2. Émetteur]       npm-packages/packages/domain-<d> (Transaction ACID + EventQueueEntity)
         ↓
[3. Démon Outbox]   outbox-<d> runner (Automatique : Postgres -> Redis Stream)
         ↓
[4. Consommateur]   post-processors-runner/post-processor-<d> (BatchPostProcessor)
         ↓
[5. Feedback Stream] post-processor pousse l'événement de feedback (ou compensation)
         ↓
[6. Scatter-Gather] ws-service (Agrège les feedbacks 2/2 -> Push WebSocket)
         ↓
[7. Frontend]       nativapp (Écoute Socket -> Invalidation TanStack Query)
```

---

> [!TIP]
> **Guides Approfondis (Deep-Dive) :**
> Si vous êtes bloqué sur une étape précise ou avez besoin d'exemples de code exhaustifs, consultez les fiches dédiées dans `references/` :
> - [01-messaging-contracts.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-event-flow/references/01-messaging-contracts.md) (Typage, Enums, Registres)
> - [02-transactional-outbox.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-event-flow/references/02-transactional-outbox.md) (QueryRunner, ACID, Outbox)
> - [03-post-processors.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-event-flow/references/03-post-processors.md) (Batch/Single, Idempotence, Sagas)
> - [04-scatter-gather-ws.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-event-flow/references/04-scatter-gather-ws.md) (GatherStateService, Redis WS, Socket.io)
> - [05-nativapp-handling.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-event-flow/references/05-nativapp-handling.md) (HTTP 206, TanStack Query, Optimistic UI)
> - [06-saga-pattern-choreography.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-event-flow/references/06-saga-pattern-choreography.md) (Chorégraphie de Sagas, Compensations & SagaStatus)

---

## Étape 1 : Définir les Contrats dans `npm-packages/packages/messaging` (SSOT)
> 📖 *Détails complets :* [01-messaging-contracts.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-event-flow/references/01-messaging-contracts.md)

Tous les types d'événements et leurs structures de données **doivent** résider dans `messaging`.

1. **Déclarer la constante d'événement** dans `packages/messaging/src/events/<domaine>/payloads.ts` :
   ```typescript
   export const EventEventMessagingType = {
     EVENT_CREATED: 'event.created',
     EVENT_CREATION_SUCCESSFULL: 'event.creation.successfull',
     EVENT_CREATION_FAILED: 'event.creation.failed',
   } as const;
   ```

2. **Définir l'interface du Payload** dans le même fichier :
   ```typescript
   export interface IEventCreatedPayload {
     eventId: string;
     localisationName: string;
     organizerId: string;
   }
   ```

3. **Enregistrer l'événement dans le registre global** (`packages/messaging/src/events/index.ts`) :
   ```typescript
   export interface EventRegistry {
     [EventEventMessagingType.EVENT_CREATED]: IEventCreatedPayload;
     // ...
   }
   ```

4. **Si l'événement a un retour WebSocket**, l'ajouter dans `packages/messaging/src/websockets/` :
   - Déclarer dans `<domaine>/index.ts` : `EventWebsocketMessagingType.EVENT_CREATED`.
   - Enregistrer dans `WebsocketEventRegistry`.

5. **Déclarer le stream Redis** dans `npm-packages/packages/shared/src/enums/streams.enum.ts` :
   ```typescript
   export enum Streams {
     EVENT_CREATED = 'stream:event-created',
   }
   ```

---

## Étape 2 : Émettre l'Événement en BDD (`domain-<domaine>` ou `ms-<domaine>`)
> 📖 *Détails complets :* [02-transactional-outbox.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-event-flow/references/02-transactional-outbox.md)

L'émission se fait obligatoirement **au sein de la transaction SQL** de l'opération métier (garantie ACID).

Dans le repository du domaine (`npm-packages/packages/domain-<domaine>/src/repositories/`) :

```typescript
import { EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import { EventQueueRepository } from '@volontariapp/outbox';
import { EventEventMessagingType, IEventCreatedPayload } from '@volontariapp/messaging';
import { Streams } from '@volontariapp/shared';

async createWithEvent(data: Partial<EventEntity>): Promise<EventEntity> {
  return this.executeInTransaction(async (queryRunner) => {
    // 1. Sauvegarde métier dans PostgreSQL
    const saved = await queryRunner.manager.save(EventModel, data);

    // 2. Préparation du payload typé
    const payload: IEventCreatedPayload = {
      eventId: saved.id,
      localisationName: saved.localisationName,
      organizerId: saved.organizerId,
    };

    // 3. Création de l'entité Outbox
    const eventQueueEntity = EventQueueEntity.createEvent<EventEventMessagingType.EVENT_CREATED>({
      type: EventEventMessagingType.EVENT_CREATED,
      emitter: 'ms-event',
      emitterId: saved.organizerId,
      payload,
      targetServices: [Streams.EVENT_CREATED],
    });

    // 4. Écriture dans la table event_outbox
    const eventQueueRepo = new EventQueueRepository<EventEventMessagingType.EVENT_CREATED>(
      queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
    );
    await eventQueueRepo.create(eventQueueEntity);

    return saved;
  });
}
```

> [!NOTE]
> **Le Runner Outbox est 100% transparent :** `outbox-runners/outbox-<domaine>` surveille la table `event_outbox` avec `SELECT ... FOR UPDATE SKIP LOCKED` et publie automatiquement dans le Redis Stream `Streams.EVENT_CREATED`. Aucun code n'est requis dans le runner !

---

## Étape 3 : Consommer l'Événement dans `post-processors-runner`
> 📖 *Détails complets :* [03-post-processors.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-event-flow/references/03-post-processors.md)

Chaque domaine impacté possède son propre post-processor dans `post-processors-runner/post-processor-<domaine>/src/post-processors/`.

1. **Créer le Post-Processor (héritant de `BatchPostProcessor` ou `SinglePostProcessor`)** :
   ```typescript
   import { Injectable } from '@nestjs/common';
   import { BatchPostProcessor, BatchEventItem, PostProcessorOptions } from '@volontariapp/post-processors';
   import { EventEventMessagingType } from '@volontariapp/messaging';
   import type { Redis } from 'ioredis';
   import type { DataSource } from 'typeorm';

   @Injectable()
   export class EventCreatedPostProcessor extends BatchPostProcessor<EventEventMessagingType.EVENT_CREATED> {
     constructor(private readonly db: DataSource, redisDriver: Redis, options: PostProcessorOptions) {
       super(redisDriver, options);
     }

     protected override shouldProcess(eventType: string): boolean {
       return eventType === EventEventMessagingType.EVENT_CREATED.toString();
     }

     protected async processEvents(events: BatchEventItem<EventEventMessagingType.EVENT_CREATED>[]): Promise<void> {
       for (const { event, messageId } of events) {
         try {
           const { eventId, localisationName } = event.payload.after;
           // Exécution du traitement lourd (ex: géocodage, mise à jour Neo4j)
           await this.doAsyncWork(eventId, localisationName);

           // Émission éventuelle du feedback de succès
         } catch (error) {
           this.logger.error(`Failed processing event`, { messageId, error });
           // Émission du feedback d'échec pour compensation (Saga)
         }
       }
     }
   }
   ```

2. **Enregistrer le provider** dans `post-processors.module.ts`.

### 3. Le Pattern Saga en Chorégraphie (Compensations & `SagaStatus`)
> 📖 *Détails complets :* [06-saga-pattern-choreography.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-event-flow/references/06-saga-pattern-choreography.md)

Toute mutation distribuée (touchant plusieurs bases ou services) suit la **triade d'événements** et met à jour l'enum `SagaStatus` (`PENDING` | `DONE` | `CANCEL`) :
1. **Événement Initial (`*_CREATED`)** : Le microservice insère l'entité avec `saga_status = SagaStatus.PENDING`.
2. **Succès (`*_CREATION_SUCCESSFULL`)** : Le post-processor de succès valide la saga et passe `saga_status = SagaStatus.DONE`.
3. **Échec / Compensation (`*_CREATION_FAILED`)** : En cas d'erreur dans un post-processor :
   - Le post-processor d'échec passe `saga_status = SagaStatus.CANCEL`.
   - Les processeurs partenaires (ex: `post-processor-social`) écoutent cet échec pour effectuer un **rollback logique** (ex: suppression Cypher dans Neo4j).
   - `ws-service` notifie le client mobile de l'échec.

---

## Étape 4 : Orchestration Scatter-Gather & Feedback WebSocket (`ws-service`)
> 📖 *Détails complets :* [04-scatter-gather-ws.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-event-flow/references/04-scatter-gather-ws.md)

Lorsque plusieurs post-processors travaillent en parallèle (ex: `ms-event` géocode ET `ms-social` met à jour Neo4j) :

1. Chaque post-processor émet son résultat avec le même `correlationId` sur le stream de feedback (`Streams.WS_FEEDBACK`).
2. Dans `ws-service/src/post-processors/events/` :
   - Le post-processor de feedback capte la fin d'une tâche.
   - Il notifie le `GatherStateService` :
     ```typescript
     const state = await this.gatherStateService.increment(correlationId);
     if (state.isComplete) { // ex: 2/2 reçus
       this.wsGateway.emitToUser(userId, WebsocketMessagingType.EVENT_CREATED, {
         status: 'success',
         eventId,
       });
     }
     ```

---

## Étape 5 : Réception dans le Frontend (`nativapp`)
> 📖 *Détails complets :* [05-nativapp-handling.md](file:///Users/victoragahi/Developer/meta/.agents/skills/global/implement-async-event-flow/references/05-nativapp-handling.md)

1. L'action initiale HTTP retourne un code `206 Partial Content` avec un `correlationId`.
2. L'application passe en état d'attente visuel (`Pending`).
3. Le client écoute le WebSocket :
   ```typescript
   socket.on(WebsocketMessagingType.EVENT_CREATED, (payload) => {
     queryClient.invalidateQueries({ queryKey: ['events'] });
     setPending(false);
   });
   ```

---

## Règles d'Or & Checklist Anti-Bugs

- [ ] **Pas de `any` :** Tous les payloads héritent de `EventRegistry` ou `JobRegistry`.
- [ ] **Jamais d'appel Redis direct depuis un MS :** Toujours passer par `EventQueueEntity` ou `JobsOutboxEntity`.
- [ ] **Transaction ACID obligatoire :** L'écriture métier et l'insertion outbox doivent partager le même `queryRunner`.
- [ ] **Gestion des Sagas :** Si un post-processor échoue dans un scatter-gather, émettre l'événement `*_FAILED` pour que les autres processeurs effectuent leur rollback logique.
