# Deep-Dive : Étape 1 - Contrats & Typage dans `messaging`

Ce document détaille chaque manipulation dans [`npm-packages/packages/messaging`](file:///Users/victoragahi/Developer/meta/npm-packages/packages/messaging) et [`npm-packages/packages/shared`](file:///Users/victoragahi/Developer/meta/npm-packages/packages/shared).

---

## 1. Arborescence du Package `messaging`

```
npm-packages/packages/messaging/src/
├── events/
│   ├── event/payloads.ts       # Événements propres au domaine Event
│   ├── user/payloads.ts        # Événements propres au domaine User
│   ├── social/payloads.ts      # Événements propres au domaine Social
│   ├── post/payloads.ts        # Événements propres au domaine Post
│   ├── common/payloads.ts      # Audits et feedbacks génériques
│   └── index.ts                # EventRegistry (Le registre central)
├── jobs/
│   ├── <domaine>/payloads.ts   # Payloads des BullMQ Jobs
│   └── index.ts                # JobRegistry
├── websockets/
│   ├── <domaine>/index.ts      # Payloads des messages Socket.io
│   └── index.ts                # WebsocketEventRegistry
└── index.ts                    # Barrels exports
```

---

## 2. Déclaration Pas-à-Pas d'un Événement

### A. Ajouter la constante d'événement
Dans `src/events/<domaine>/payloads.ts` :

```typescript
export const EventEventMessagingType = {
  // ... existants
  EVENT_PUBLISHED: 'event.published',
  EVENT_PUBLICATION_FAILED: 'event.publication.failed',
} as const;

export type EventEventMessagingType =
  (typeof EventEventMessagingType)[keyof typeof EventEventMessagingType];
```

> [!IMPORTANT]
> Respecter la convention de nommage kebab/dot-case pour la valeur string : `<domaine>.<action>`.

### B. Définir l'Interface du Payload
Dans le même fichier :

```typescript
export interface IEventPublishedPayload {
  eventId: string;
  organizerId: string;
  publishedAt: string; // ISO 8601 string pour les dates sérialisées en JSON
  tags: string[];
}

export interface IEventPublicationFailedPayload {
  eventId: string;
  reason: string;
  failedAt: string;
}
```

> [!WARNING]
> Les payloads transitent par PostgreSQL (JSONB) puis Redis (JSON strings). Ne jamais utiliser d'instances de classes ou d'objets `Date` dans les payloads ; privilégier des types primitifs (`string`, `number`, `boolean`, `string[]`).

### C. Enregistrer dans `EventRegistry`
Dans `src/events/index.ts` :

```typescript
import { EventEventMessagingType, IEventPublishedPayload, IEventPublicationFailedPayload } from './event/payloads.js';

export interface EventRegistry {
  // ...
  [EventEventMessagingType.EVENT_PUBLISHED]: IEventPublishedPayload;
  [EventEventMessagingType.EVENT_PUBLICATION_FAILED]: IEventPublicationFailedPayload;
}
```

> [!NOTE]
> `EventRegistry` est ce qui permet à TypeScript d'inférer statiquement le type du payload lors de l'appel à `EventQueueEntity.createEvent<T>()` ou dans les `BatchPostProcessor<T>`. Oublier cette étape produit une erreur de compilation TS immédiate.

---

## 3. Déclaration du Stream Redis

Les noms de streams Redis sont centralisés dans [`npm-packages/packages/shared/src/enums/streams.enum.ts`](file:///Users/victoragahi/Developer/meta/npm-packages/packages/shared/src/enums/streams.enum.ts).

Vérifier si le stream existe déjà ou l'ajouter :

```typescript
export enum Streams {
  // ...
  EVENT_PUBLISHED = 'stream:event-published',
  WS_FEEDBACK = 'stream:ws-feedback',
}
```

---

## 4. Déclaration du Retour WebSocket (si applicable)

Si le client `nativapp` doit être notifié de la fin de cette opération via WebSockets :

1. Dans `src/websockets/<domaine>/index.ts` :
   ```typescript
   export const EventWebsocketMessagingType = {
     // ...
     EVENT_PUBLISHED: 'event.published.ws',
   } as const;

   export interface IEventPublishedWebsocketPayload {
     eventId: string;
     status: 'success' | 'error';
   }
   ```
2. Dans `src/websockets/index.ts` :
   ```typescript
   export interface WebsocketEventRegistry {
     // ...
     [EventWebsocketMessagingType.EVENT_PUBLISHED]: IEventPublishedWebsocketPayload;
   }
   ```

---

## 5. Compilation & Vérification des NPM Packages

Une fois les modifications effectuées dans `npm-packages` :

```bash
# Se placer dans le package modifié
cd /Users/victoragahi/Developer/meta/npm-packages/packages/messaging
yarn build

# Si le package shared a aussi été modifié
cd ../shared && yarn build
```

Pour la CI/CD : toute modification dans `npm-packages` génère un snapshot utilisable par les autres repos pendant les Pull Requests.
