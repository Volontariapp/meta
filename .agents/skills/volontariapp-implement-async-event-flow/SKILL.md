---
name: volontariapp-implement-async-event-flow
description: "Guide pas-à-pas pour concevoir et implémenter un flux asynchrone complet (messaging -> outbox -> post-processors -> ws-service -> client)."
type: Agent Skill
title: Implement Async Event Flow
tags: [async, outbox, redis-streams, post-processors, websocket, saga]
status: stable
paths:
  - "npm-packages/packages/messaging/src/events/**"
  - "npm-packages/packages/messaging/src/websockets/**"
  - "npm-packages/packages/outbox/src/**"
  - "npm-packages/packages/post-processors/src/**"
  - npm-packages/packages/shared/src/enums/streams.enum.ts
  - "ws-service/src/post-processors/**"
  - ws-service/src/core/services/gather-state.service.ts
mesh_keys:
  - post-processors-runner
  - messaging
  - post-processor
  - postprocessor
  - streams.
  - saga
  - _failed
  - gather
  - ws-service
  - websocket
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:22:12Z"
sources:
  - id: messaging
    resource: npm-packages/packages/messaging/src/events
    title: "Contrats d'événements"
  - id: gather
    resource: ws-service/src/core/services/gather-state.service.ts
    title: Scatter-Gather ws-service
  - id: c3-async
    resource: docs/C3-Async-Patterns-And-Flows.md
    title: C3 Async Patterns and Flows
  - id: streams
    resource: npm-packages/packages/shared/src/enums/streams.enum.ts
    title: Enum Streams
  - id: gather
    resource: ws-service/src/post-processors/base-gather.post-processor.ts
    title: BaseGatherPostProcessor
  - id: gather-state
    resource: ws-service/src/core/services/gather-state.service.ts
    title: GatherStateService (table gather_state)
  - id: registry
    resource: npm-packages/packages/messaging/src/sagas/gather-registry.ts
    title: SAGA_GATHER_COMPLETION_MAPPING
verified:
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T16:17:46Z"
    digest: ba7804bbe7e048dd
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T20:55:37Z"
    digest: ba7804bbe7e048dd
  - by: claude-code/agent
    at: "2026-10-07T10:23:57Z"
    digest: c0800f1c730ed9a9
  - by: claude-code/agent
    at: "2026-10-07T10:25:46Z"
    digest: c0800f1c730ed9a9
  - by: claude-code/agent
    at: "2026-10-07T10:34:41Z"
    digest: c0800f1c730ed9a9
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
> - 01-messaging-contracts.md ([`references/01-messaging-contracts.md`](/volontariapp-implement-async-event-flow/references/01-messaging-contracts.md)) (Typage, Enums, Registres)
> - 02-transactional-outbox.md ([`references/02-transactional-outbox.md`](/volontariapp-implement-async-event-flow/references/02-transactional-outbox.md)) (QueryRunner, ACID, Outbox)
> - 03-post-processors.md ([`references/03-post-processors.md`](/volontariapp-implement-async-event-flow/references/03-post-processors.md)) (Batch/Single, Idempotence, Sagas)
> - 04-scatter-gather-ws.md ([`references/04-scatter-gather-ws.md`](/volontariapp-implement-async-event-flow/references/04-scatter-gather-ws.md)) (GatherStateService, Redis WS, Socket.io)
> - 05-nativapp-handling.md ([`references/05-nativapp-handling.md`](/volontariapp-implement-async-event-flow/references/05-nativapp-handling.md)) (HTTP 206 de fallback, listeners WebSocket, React Query)
> - 06-saga-pattern-choreography.md ([`references/06-saga-pattern-choreography.md`](/volontariapp-implement-async-event-flow/references/06-saga-pattern-choreography.md)) (Chorégraphie de Sagas, Compensations & SagaStatus)

---

## Étape 1 : Définir les Contrats dans `npm-packages/packages/messaging` (SSOT)
> 📖 *Détails complets :* 01-messaging-contracts.md ([`references/01-messaging-contracts.md`](/volontariapp-implement-async-event-flow/references/01-messaging-contracts.md))

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
   export enum EventStream {
     EVENT_CREATED = 'event:created',
   }
   // Chaque enum de domaine est fusionné dans l'objet `Streams` en bas du fichier.
   ```

> [!CAUTION]
> ### 🛑 POINT DE BLOCAGE CRITIQUE : LE STOP IMMÉDIAT
> **Tu viens de modifier `npm-packages` (`messaging`, `shared`) ? TU DOIS T'ARRÊTER.**
> 1. Valide la compilation locale dans `npm-packages` : `yarn build && yarn test`.
> 2. Génère le changeset et le bump : `yarn changeset add` puis `yarn changeset version` (une seule fois par branche).
> 3. **STOP TOTAL :** Interdiction formelle de passer à l'Étape 2 (`domain-*` si hors npm-packages, ou `ms-*`), l'Étape 3 (`post-processors-runner`), ou l'Étape 4 (`ws-service`) immédiatement !
> 4. Passe la main au Lead Dev pour qu'il pousse sur une PR et que la CI publie la version snapshot `<version>-snap-<sha court>`, publiée sous le dist-tag `next` et listée en commentaire de la PR (ex: `@volontariapp/messaging@2.17.1-snap-a1b2c3d`).
> 5. **Ce n'est qu'après publication par la CI** que tu pourras lancer `yarn up @volontariapp/messaging @volontariapp/shared` dans les microservices et continuer les étapes ci-dessous.

---

## Étape 2 : Émettre l'Événement en BDD (`domain-<domaine>` ou `ms-<domaine>`)
> 📖 *Détails complets :* 02-transactional-outbox.md ([`references/02-transactional-outbox.md`](/volontariapp-implement-async-event-flow/references/02-transactional-outbox.md))

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

    // 4. Écriture dans la table event_queue
    const eventQueueRepo = new EventQueueRepository<EventEventMessagingType.EVENT_CREATED>(
      queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
    );
    await eventQueueRepo.create(eventQueueEntity);

    return saved;
  });
}
```

> [!NOTE]
> **Le Runner Outbox est 100% transparent :** `outbox-runners/outbox-<domaine>` surveille la table `event_queue` avec `SELECT ... FOR UPDATE SKIP LOCKED` et publie automatiquement dans le Redis Stream `Streams.EVENT_CREATED`. Aucun code n'est requis dans le runner !

---

## Étape 3 : Consommer l'Événement dans `post-processors-runner`
> 📖 *Détails complets :* 03-post-processors.md ([`references/03-post-processors.md`](/volontariapp-implement-async-event-flow/references/03-post-processors.md))

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
> 📖 *Détails complets :* 06-saga-pattern-choreography.md ([`references/06-saga-pattern-choreography.md`](/volontariapp-implement-async-event-flow/references/06-saga-pattern-choreography.md))

Toute mutation distribuée (touchant plusieurs bases ou services) suit la **triade d'événements** et met à jour l'enum `SagaStatus` (`PENDING` | `DONE` | `CANCEL`) :
1. **Événement Initial (`*_CREATED`)** : Le microservice insère l'entité avec `saga_status = SagaStatus.PENDING`.
2. **Succès (`*_CREATION_SUCCESSFULL`)** : Le post-processor de succès valide la saga et passe `saga_status = SagaStatus.DONE`.
3. **Échec / Compensation (`*_CREATION_FAILED`)** : En cas d'erreur dans un post-processor :
   - Le post-processor d'échec passe `saga_status = SagaStatus.CANCEL`.
   - Les processeurs partenaires (ex: `post-processor-social`) écoutent cet échec pour effectuer un **rollback logique** (ex: suppression Cypher dans Neo4j).
   - `ws-service` notifie le client mobile de l'échec.

---

## Étape 4 : Orchestration Scatter-Gather & Feedback WebSocket (`ws-service`)
> 📖 *Détails complets :* 04-scatter-gather-ws.md ([`references/04-scatter-gather-ws.md`](/volontariapp-implement-async-event-flow/references/04-scatter-gather-ws.md))

Lorsque plusieurs post-processors travaillent en parallèle (ex : `post-processor-event` géocode et `post-processor-social` crée le noeud Neo4j) :

1. Chaque post-processor publie son résultat avec le même `correlationId` sur le stream de feedback du flux, par exemple `Streams.WS_EVENT_CREATED_FEEDBACK` (`ws:event-created-feedback`)[^streams].
2. Dans `ws-service`, les post-processors héritent de `BaseGatherPostProcessor` (`src/post-processors/base-gather.post-processor.ts`)[^gather] :
   - le post-processor **créateur** (`isCreator`) écoute l'événement déclencheur et appelle `gatherStateService.initializeGatherState(correlationId, triggerEvent, metadata)` ;
   - les autres appellent `gatherStateService.updateEventState(correlationId, expectedKey, status, errorReason)` ;
   - quand `result.isComplete`, `processGatherResult` notifie le client (`BaseWebSocketGatherPostProcessor` : `notificationService.notifyUser` / `broadcastExcept`).
3. L'état d'agrégation est stocké dans la table PostgreSQL **`gather_state`** de `ws-service` (`trigger_event`, `gather_events_state` en jsonb)[^gather-state] ; la liste des retours attendus vient de la configuration `scatterGather.aggregations` de `ws-service`. (`docs/C3` parle d'une clé Redis `gather:<id>` à TTL 60 s : ce n'est plus le cas.)
4. Le mapping saga vers stream et événement WebSocket final est dans `@volontariapp/messaging` : `SAGA_GATHER_COMPLETION_MAPPING` (`src/sagas/gather-registry.ts`)[^registry].

---

## Étape 5 : Réception dans le Frontend (`nativapp`)
> 📖 *Détails complets :* 05-nativapp-handling.md ([`references/05-nativapp-handling.md`](/volontariapp-implement-async-event-flow/references/05-nativapp-handling.md))

1. La requête HTTP répond 200/201 avec l'entité ; seul un fallback répond **206** (`FALLBACK_ACTIVATED`), ce qui déclenche `syncPendingBus.emit(true)` dans `apiFetch`.
2. Le résultat final de la saga arrive par WebSocket : les listeners sont centralisés dans `nativapp/src/hooks/useNotificationHandlers.ts` :
   ```typescript
   socket.on(WebsocketMessagingType.EVENT_CREATED, handleEventCreated);
   socket.on(WebsocketMessagingType.EVENT_CREATION_FAILED, handleEventFailed);
   ```
3. Le handler invalide les clés React Query concernées ; ne jamais mettre à jour l'état serveur hors React Query.

---

## Règles d'Or & Checklist Anti-Bugs

- [ ] **Pas de `any` :** Tous les payloads héritent de `EventRegistry` ou `JobRegistry`.
- [ ] **Jamais d'appel Redis direct depuis un MS :** Toujours passer par `EventQueueEntity` ou `JobsOutboxEntity`.
- [ ] **Transaction ACID obligatoire :** L'écriture métier et l'insertion outbox doivent partager le même `queryRunner`.
- [ ] **Gestion des Sagas :** Si un post-processor échoue dans un scatter-gather, émettre l'événement `*_FAILED` pour que les autres processeurs effectuent leur rollback logique.

[^streams]: Enum Streams
[^gather]: BaseGatherPostProcessor
[^gather-state]: GatherStateService (table gather_state)
[^registry]: SAGA_GATHER_COMPLETION_MAPPING
