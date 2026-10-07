---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-implement-async-event-flow, du plus récent au plus ancien."
tags: [lessons, volontariapp-implement-async-event-flow]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-06T13:13:13Z"
sources:
  - id: src-2d73ed86
    resource: npm-packages/packages/domain-social/src/services/interaction.service.ts
    title: npm-packages/packages/domain-social/src/services/interaction.service.ts
  - id: src-be2f6941
    resource: npm-packages/packages/messaging/src/events/storage/payloads.ts
    title: npm-packages/packages/messaging/src/events/storage/payloads.ts
  - id: src-6dd92801
    resource: post-processors-runner/post-processor-user/src/post-processors/options/event-creation-successfull-badge-options.ts
    title: post-processors-runner/post-processor-user/src/post-processors/options/event-creation-successfull-badge-options.ts
  - id: src-57587df4
    resource: npm-packages/packages/messaging/src/sagas/gather-registry.ts
    title: npm-packages/packages/messaging/src/sagas/gather-registry.ts
---

# Leçons

## 2026-10-07 - Complétion de saga gather : stream de sortie versus trigger initial

- **Type :** pitfall
- **Leçon :** Dans gather-registry.ts (SAGA_GATHER_COMPLETION_MAPPING), le champ stream définit la destination du message de succès ou d'échec de la saga (ex: Streams.EVENT_SUCCESSFULLY_CREATED). Il ne doit JAMAIS pointer sur le stream déclencheur initial de la saga (ex: event:created), sinon le message de complétion est injecté sur le mauvais canal et les post-processors de finalisation (comme la mise à jour de saga_status ou l'attribution de badges) ne sont jamais déclenchés.[^src-57587df4]
- **Consigné par :** claude-code/agent

## 2026-10-07 - Nommage de stream des post-processors : toujours getEventStreamName

- **Type :** pitfall
- **Leçon :** Les options de configuration d'un post-processor (PostProcessorOptions.streamName) doivent OBLIGATOIREMENT être enveloppées par getEventStreamName(Streams.MON_STREAM) de @volontariapp/messaging. Passer Streams.MON_STREAM directement omet le préfixe stream: que l'outbox pusher (event-queue.pusher.ts) ajoute systématiquement, rendant le post-processor sourd aux événements publiés dans Redis Streams.[^src-6dd92801]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Payloads messaging : unions de litteraux, pas d'enums nominales

- **Type :** rule
- **Leçon :** messaging ne peut pas dependre de domain-storage (domain-storage depend de messaging, outbox et database : cycle). Pour un type partage avec un domaine (EntityType, RejectionReason), declarer dans messaging un objet as const + type union de litteraux (voir packages/messaging/src/events/storage/payloads.ts, StorageEntityType et StorageFileRejectionReason) : les enums de chaines du domaine y sont assignables. Une enum TypeScript distincte est nominale et obligerait un mapping manuel ou un cast interdit (as unknown as). Ajouter un test de non-derive des valeurs.[^src-be2f6941]
- **Consigné par :** claude-code/agent

## 2026-10-06 - post.liked : authorId est le liker, outbox en best effort

- **Type :** pitfall
- **Leçon :** Dans interaction.service.ts (domain-social), le payload de post.liked porte authorId = id de celui qui like (pas l'auteur du post), identique a emitterId. L'ecriture outbox est faite apres la relation Neo4j dans un try/catch qui journalise et ignore l'erreur : un like peut exister sans evenement. Pour un consommateur, compter l'etat courant (RPC Admin* avec pagination.total) plutot que les evenements recus. Voir docs/badges/10-guide-technique-pp-user.md.[^src-2d73ed86]
- **Consigné par :** claude-code/agent

[^src-2d73ed86]: npm-packages/packages/domain-social/src/services/interaction.service.ts
[^src-be2f6941]: npm-packages/packages/messaging/src/events/storage/payloads.ts
[^src-6dd92801]: post-processors-runner/post-processor-user/src/post-processors/options/event-creation-successfull-badge-options.ts
[^src-57587df4]: npm-packages/packages/messaging/src/sagas/gather-registry.ts
