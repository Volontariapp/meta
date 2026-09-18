# Deep-Dive : Le Pattern Saga en Chorégraphie (Compensations & Rollback)

Ce document détaille la gestion des transactions distribuées dans Volontariapp via le **Saga Pattern en mode Chorégraphie** et le suivi d'état `SagaStatus`.

---

## 1. Pourquoi des Sagas en Chorégraphie ?

Dans une architecture microservices sans transaction distribuée 2PC (Two-Phase Commit, trop lent et bloquant) :
- Une action (ex: "Créer un Événement") implique plusieurs bases distinctes :
  - **PostgreSQL** (`ms-event`) : Création de la ligne d'événement.
  - **Neo4j** (`ms-social`) : Création des nœuds et relations sociales.
  - **OpenStreetMap** (`post-processor-event`) : Résolution des coordonnées GPS.
- **Le Mode Chorégraphie** : Il n'y a **aucun orchestrateur central**. Chaque microservice et post-processor écoute des événements et publie de nouveaux événements de manière autonome pour faire avancer la saga ou la compenser.

---

## 2. La Triade des Événements Métiers

Pour chaque mutation distribuée, le registre [`@volontariapp/messaging`](file:///Users/victoragahi/Developer/meta/npm-packages/packages/messaging) définit systématiquement une **triade d'événements** :

```
             ┌─────────────────────────┐
             │      EVENT_CREATED      │  (Déclenchement : saga_status = PENDING)
             └────────────┬────────────┘
                          │
           ┌──────────────┴──────────────┐
           ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│ EVENT_CREATION_SUCCESSFULL│ │   EVENT_CREATION_FAILED   │ (Compensation / Rollback)
│   (saga_status = DONE)    │ │   (saga_status = CANCEL)  │
└───────────────────────────┘ └───────────────────────────┘
```

### Exemples dans les différents domaines :
| Déclenchement (Init) | Succès Global (Commit) | Échec / Compensation (Rollback) |
| :--- | :--- | :--- |
| `EVENT_CREATED` | `EVENT_CREATION_SUCCESSFULL` | `EVENT_CREATION_FAILED` |
| `EVENT_DELETED` | `EVENT_DELETION_SUCCESSFULL` | `EVENT_DELETION_FAILED` |
| `POST_CREATED` | `POST_CREATION_SUCCESSFULL` | `POST_CREATION_FAILED` |
| `USER_CREATED` | `USER_CREATION_SUCCESSFULL` | `USER_CREATION_FAILED` |
| `USER_DELETED` | `USER_DELETION_SUCCESSFULL` | `USER_DELETION_FAILED` |

---

## 3. Le Cycle de Vie `SagaStatus` dans PostgreSQL

L'enum `SagaStatus` est centralisé dans [`@volontariapp/shared`](file:///Users/victoragahi/Developer/meta/npm-packages/packages/shared) :

```typescript
export enum SagaStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  CANCEL = 'CANCEL',
}
```

Toutes les entités soumises à une saga possèdent une colonne `saga_status` en base :
1. **À la création (`ms-*`)** : L'entité est insérée avec `saga_status = SagaStatus.PENDING`.
2. **Si tout réussit** : Le processeur de succès passe le statut à `SagaStatus.DONE`.
3. **Si une étape échoue** : Le processeur d'échec passe le statut à `SagaStatus.CANCEL` (l'entité est marquée annulée et n'apparaît plus dans les requêtes de lecture).

---

## 4. Anatomie d'un Processeur de Succès de Saga

Emplacement type : `post-processors-runner/post-processor-event/src/post-processors/event-creation-successfull.post-processor.ts`.

```typescript
import { EventEventMessagingType } from '@volontariapp/messaging';
import { BatchPostProcessor, type BatchEventItem, type PostProcessorOptions } from '@volontariapp/post-processors';
import { PostgresEventRepository, EventModel } from '@volontariapp/domain-event';
import { SagaStatus } from '@volontariapp/shared';
import type { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';

export class EventCreationSuccessfullPostProcessor extends BatchPostProcessor<EventEventMessagingType.EVENT_CREATION_SUCCESSFULL> {
  private readonly eventRepository: PostgresEventRepository;

  constructor(db: DataSource, redis: Redis, options: PostProcessorOptions) {
    super(redis, options);
    this.eventRepository = new PostgresEventRepository(db.getRepository(EventModel));
  }

  protected override shouldProcess(eventType: string): boolean {
    return eventType === EventEventMessagingType.EVENT_CREATION_SUCCESSFULL.toString();
  }

  protected async processEvents(events: BatchEventItem<EventEventMessagingType.EVENT_CREATION_SUCCESSFULL>[]): Promise<void> {
    for (const { event, messageId } of events) {
      const { eventId } = event.payload.after;
      
      // Validation définitive de la Saga
      await this.eventRepository.update(eventId, {
        saga_status: SagaStatus.DONE,
      });

      this.logger.info(`Saga validée (DONE) pour l'événement ${eventId}`, { messageId });
    }
  }
}
```

---

## 5. Anatomie d'un Processeur d'Échec (Compensation / Rollback)

Emplacement type : `post-processors-runner/post-processor-event/src/post-processors/event-creation-failed.post-processor.ts`.

```typescript
import { EventEventMessagingType } from '@volontariapp/messaging';
import { BatchPostProcessor, type BatchEventItem, type PostProcessorOptions } from '@volontariapp/post-processors';
import { PostgresEventRepository, EventModel } from '@volontariapp/domain-event';
import { SagaStatus } from '@volontariapp/shared';
import type { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';

export class EventCreationFailedPostProcessor extends BatchPostProcessor<EventEventMessagingType.EVENT_CREATION_FAILED> {
  private readonly eventRepository: PostgresEventRepository;

  constructor(db: DataSource, redis: Redis, options: PostProcessorOptions) {
    super(redis, options);
    this.eventRepository = new PostgresEventRepository(db.getRepository(EventModel));
  }

  protected override shouldProcess(eventType: string): boolean {
    return eventType === EventEventMessagingType.EVENT_CREATION_FAILED.toString();
  }

  protected async processEvents(events: BatchEventItem<EventEventMessagingType.EVENT_CREATION_FAILED>[]): Promise<void> {
    for (const { event, messageId } of events) {
      const { eventId } = event.payload.after;

      // Annulation logique de la Saga
      await this.eventRepository.update(eventId, {
        saga_status: SagaStatus.CANCEL,
      });

      this.logger.warn(`Saga annulée (CANCEL) pour l'événement ${eventId}`, { messageId });
    }
  }
}
```

---

## 6. Compensation Cross-Microservices (Exemple Neo4j)

Que se passe-t-il dans `ms-social` lorsque `ms-event` échoue ?

1. Le `post-processor-event` n'arrive pas à géocoder l'adresse (timeout OSM après 3 retries).
2. Il émet un événement `EventEventMessagingType.EVENT_CREATION_FAILED` sur le stream.
3. Le `post-processor-social` écoute également cet événement d'échec :
   - Il localise le nœud Neo4j créé quelques millisecondes plus tôt.
   - Il exécute la requête Cypher de rollback :
     ```cypher
     MATCH (e:Event {id: $eventId}) DETACH DELETE e
     ```
4. Le `ws-service` capte l'échec et envoie la notification WebSocket `status: 'error'` au client mobile.

---

## Règles d'Or pour les Sagas

- [ ] **Toujours initialiser avec `saga_status: SagaStatus.PENDING`** lors du premier `INSERT` dans le microservice API.
- [ ] **Définir les deux branches dans `messaging` :** Toute action asynchrone majeure doit avoir son `*_SUCCESSFULL` ET son `*_FAILED`.
- [ ] **Filtrer les lectures :** Les endpoints de lecture (GraphQL / REST / gRPC) doivent toujours filtrer `where: { saga_status: SagaStatus.DONE }` pour ne jamais exposer d'entités non finalisées ou annulées aux utilisateurs.
