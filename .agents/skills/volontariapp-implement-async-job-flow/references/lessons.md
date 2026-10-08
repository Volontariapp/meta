---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-implement-async-job-flow, du plus récent au plus ancien."
tags: [lessons, volontariapp-implement-async-job-flow]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-11T15:18:27Z"
sources:
  - id: src-9092d13d
    resource: npm-packages/packages/database/src/outbox/consumers/outbox.consumer.ts
    title: npm-packages/packages/database/src/outbox/consumers/outbox.consumer.ts
  - id: src-3281d508
    resource: npm-packages/packages/messaging/src/websockets/events/mapping.ts
    title: npm-packages/packages/messaging/src/websockets/events/mapping.ts
---

# Leçons

## 2026-10-11 - Notification WebSocket de fin de job: mapping messaging obligatoire

- **Type :** pitfall
- **Leçon :** JobOutboxSuccessPostProcessor n'emet un feedback ws:jobs-outbox-success que si getEventForJob(jobType) trouve une entree dans JOB_TO_EVENT_MAPPING (npm-packages/packages/messaging/src/websockets/events/mapping.ts), aujourd'hui uniquement des types FALLBACK_*. ws-service ne notifie ensuite que si getWsEventForEvent existe et si originalPayload.userId est present. Un nouveau type de job doit ajouter son mapping dans messaging (soumis a la regle du STOP) pour notifier le client. Verifie en session le 2026-10-11.[^src-3281d508]
- **Consigné par :** claude-code/agent

## 2026-10-11 - Outbox: un push BullMQ en echec laisse le job FAILED, jamais repousse

- **Type :** pitfall
- **Leçon :** Dans npm-packages/packages/database/src/outbox/consumers/outbox.consumer.ts, fetchPendingItems passe PENDING a PROCESSING, et processItems appelle markAsFailed si le push echoue. Seules les lignes PENDING sont relues: un job FAILED n'est jamais repousse et une ligne restee PROCESSING apres un crash n'est pas recuperee. Ne pas supposer qu'une panne Redis est rattrapee par l'outbox; prevoir une reemission applicative et surveiller jobs_outbox FAILED/PROCESSING. Verifie en session le 2026-10-11.[^src-9092d13d]
- **Consigné par :** claude-code/agent

[^src-9092d13d]: npm-packages/packages/database/src/outbox/consumers/outbox.consumer.ts
[^src-3281d508]: npm-packages/packages/messaging/src/websockets/events/mapping.ts
