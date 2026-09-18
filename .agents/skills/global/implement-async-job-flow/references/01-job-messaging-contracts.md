# Deep-Dive : Étape 1 - Contrats de Jobs dans `messaging`

Ce document détaille chaque manipulation dans [`npm-packages/packages/messaging`](file:///Users/victoragahi/Developer/meta/npm-packages/packages/messaging) pour la déclaration d'un Job BullMQ.

---

## 1. Arborescence des Jobs dans `messaging`

```
npm-packages/packages/messaging/src/jobs/
├── event/
│   ├── payloads.ts       # Enums et interfaces pour le domaine Event
│   └── queue.ts          # Noms de files BullMQ (EventsQueue)
├── user/
│   ├── payloads.ts       # Enums et interfaces pour User
│   └── queue.ts          # UserQueue
├── social/
│   ├── payloads.ts       # Enums et interfaces pour Social
│   └── queue.ts          # SocialQueue
├── post/
│   ├── payloads.ts       # Enums et interfaces pour Post
│   └── queue.ts          # PostQueue
├── envelope.ts           # JobEnvelope wrapper générique
└── index.ts              # JobMessagingType et JobRegistry
```

---

## 2. Déclaration Pas-à-Pas d'un Job

### A. Ajouter la constante du Job
Dans `src/jobs/<domaine>/payloads.ts` :

```typescript
export const EventsJobType = {
  // ...
  EXPORT_EVENTS_REPORT: 'event.export_report',
  FALLBACK_EXPORT_EVENTS_REPORT: 'event.fallback.export_report',
} as const;

export type EventsJobType = (typeof EventsJobType)[keyof typeof EventsJobType];
```

### B. Définir l'Interface du Payload
Dans le même fichier :

```typescript
export interface IExportEventsReportPayload {
  organizerId: string;
  startDate: string; // ISO 8601
  endDate: string;
  format: 'csv' | 'pdf';
  targetEmail: string;
}
```

> [!TIP]
> Si c'est un job de fallback déclenché en cas d'erreur API, suffixer l'interface par `JobPayload` (ex: `IFallbackExportEventsReportJobPayload`).

### C. Enregistrer dans `JobRegistry`
Dans `src/jobs/index.ts` :

```typescript
import { EventsJobType, IExportEventsReportPayload } from './event/payloads.js';

export interface JobRegistry {
  // ...
  [JobMessagingType.EXPORT_EVENTS_REPORT]: IExportEventsReportPayload;
}
```

### D. Vérifier le Nom de la File BullMQ
Dans `src/jobs/<domaine>/queue.ts` :

```typescript
export enum EventsQueue {
  EVENTS = 'events-queue',
  FALLBACK_EVENTS = 'fallback-events-queue',
}
```

Les files BullMQ séparent généralement les jobs standards des retries/fallbacks pour éviter que des échecs répétés n'encombrent le traitement normal.
