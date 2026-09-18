# Deep-Dive : Étape 3 - Consommation & Post-Processors

Ce document détaille l'implémentation des processeurs asynchrones dans [`post-processors-runner`](file:///Users/victoragahi/Developer/meta/post-processors-runner) via la bibliothèque `@volontariapp/post-processors`.

---

## 1. Rôle des Post-Processors

Les **Post-Processors** consomment les événements depuis les **Redis Streams**. Ils exécutent les effets de bord distribués :
- Synchronisation multi-bases (ex: insertion d'un nœud dans la base graphe **Neo4j** de `ms-social`).
- Appels d'APIs tierces lentes (ex: géocodage OpenStreetMap / Google Maps).
- Nettoyage et archivage de l'Outbox (hard delete des jobs terminés).
- Émission de flux de compensation en cas d'erreur (Chorégraphie de Sagas).

---

## 2. Structure dans `post-processors-runner`

```
post-processors-runner/
├── post-processor-event/       # Traitements liés au domaine Event
├── post-processor-social/      # Traitements Neo4j & graphe d'abonnements
├── post-processor-user/        # Traitements profil & identité
├── post-processor-post/        # Traitements feed & commentaires
└── post-processor-storage/     # Traitements médias S3/MinIO
```

Chaque sous-dossier possède sa propre configuration de stream et son module NestJS.

---

## 3. Template Complet d'un Post-Processor

Voici l'anatomie standard d'un post-processor par lots (`BatchPostProcessor`) :

```typescript
import { Injectable } from '@nestjs/common';
import {
  BatchPostProcessor,
  type BatchEventItem,
  type PostProcessorOptions,
} from '@volontariapp/post-processors';
import {
  EventEventMessagingType,
  IEventPublishedPayload,
  SocialEventMessagingType,
} from '@volontariapp/messaging';
import { EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import { EventQueueRepository } from '@volontariapp/outbox';
import { Streams } from '@volontariapp/shared';
import type { Redis } from 'ioredis';
import type { DataSource } from 'typeorm';

@Injectable()
export class EventPublishedPostProcessor extends BatchPostProcessor<EventEventMessagingType.EVENT_PUBLISHED> {
  constructor(
    private readonly db: DataSource,
    redisDriver: Redis,
    options: PostProcessorOptions,
  ) {
    super(redisDriver, options);
  }

  /**
   * Filtre d'acceptation : détermine si ce processeur doit traiter ce type d'événement
   */
  protected override shouldProcess(
    eventType: EventEventMessagingType | string,
  ): boolean {
    return eventType === EventEventMessagingType.EVENT_PUBLISHED.toString();
  }

  /**
   * Traitement par lots (Batch) pour maximiser le débit
   */
  protected async processEvents(
    events: BatchEventItem<EventEventMessagingType.EVENT_PUBLISHED>[],
  ): Promise<void> {
    for (const { event, messageId } of events) {
      const payload: IEventPublishedPayload = event.payload.after;

      try {
        this.logger.info(`Processing EVENT_PUBLISHED for eventId=${payload.eventId}`, { messageId });

        // 1. Règle d'Idempotence (au cas où le message est re-délivré par Redis)
        const alreadyProcessed = await this.checkIfAlreadyProcessed(payload.eventId);
        if (alreadyProcessed) {
          this.logger.warn(`Event ${payload.eventId} already processed, skipping.`, { messageId });
          continue;
        }

        // 2. Traitement métier (ex: appel service de domaine ou base Neo4j)
        await this.applyBusinessLogic(payload);

        // 3. Émission d'un événement secondaire de succès si nécessaire
        await this.emitSuccessFeedback(payload);

      } catch (error) {
        this.logger.error(`Error processing EVENT_PUBLISHED for ${payload.eventId}`, {
          messageId,
          error: error instanceof Error ? error.message : String(error),
        });

        // 4. Gestion de la Compensation (Saga Rollback)
        await this.emitCompensationEvent(payload, error);
      }
    }
  }

  private async checkIfAlreadyProcessed(eventId: string): Promise<boolean> {
    // Vérification en BDD ou cache Redis
    return false;
  }

  private async applyBusinessLogic(payload: IEventPublishedPayload): Promise<void> {
    // Logique métier
  }

  private async emitCompensationEvent(payload: IEventPublishedPayload, error: unknown): Promise<void> {
    // Émission dans event_outbox d'un événement *_FAILED
    // Les autres post-processors écouteront cet échec pour annuler leurs actions
  }
}
```

---

## 4. Enregistrement dans `post-processors.module.ts`

Dans le module du runner concerné (`src/post-processors/post-processors.module.ts`) :

```typescript
@Module({
  providers: [
    EventPublishedPostProcessor,
    // Fournir les options et la connexion Redis
    {
      provide: 'POST_PROCESSOR_OPTIONS',
      useValue: {
        streamName: Streams.EVENT_PUBLISHED,
        groupName: 'group:post-processor-event',
        batchSize: 10,
        blockMs: 2000,
      },
    },
  ],
})
export class PostProcessorsModule {}
```

---

## 5. Bonnes Pratiques & Pièges à Éviter

1. **Idempotence Obligatoire :** Redis Streams garantit une distribution *At-Least-Once*. Un message peut être rejoué après un crash de pod ou un timeout réseau. Votre logique doit tolérer les doublons.
2. **Ne jamais bloquer indéfiniment la boucle :** Si une API externe timeout, utiliser un timeout explicite (ex: 5s via `AbortSignal`) pour ne pas bloquer l'ensemble du batch.
3. **Traçabilité :** Toujours propager `messageId` et `correlationId` dans les logs Winston.
