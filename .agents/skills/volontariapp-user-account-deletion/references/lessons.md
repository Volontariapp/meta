---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-user-account-deletion, du plus récent au plus ancien."
tags: [lessons, volontariapp-user-account-deletion]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-11T16:59:33Z"
sources:
  - id: src-c9b34137
    resource: npm-packages/packages/domain-user/src/models/mapper.ts
    title: npm-packages/packages/domain-user/src/models/mapper.ts
  - id: src-344cd746
    resource: post-processors-runner/post-processor-user/src/post-processors/users/user-deletion-success.post-processor.ts
    title: post-processors-runner/post-processor-user/src/post-processors/users/user-deletion-success.post-processor.ts
---

# Leçons

## 2026-10-13 - finalizeDeletion est appele depuis post-processors-runner, pas ms-user/ws-service

- **Type :** pitfall
- **Leçon :** Le hard delete final passe par user.deletion_successfull (stream USER_DELETION_SUCCESS, emis par le gather ws-service) consomme par UserDeletionSuccessPostProcessor dans post-processors-runner/post-processor-user, qui appelle userService.finalizeDeletion. Un rg sur ms-user, ws-service et api-gateway conclut a tort que finalizeDeletion n'est jamais appele, et find_dependents ne le voit pas (appel d'instance). Pour une absence de caller, utiliser analyze_impact sur l'evenement (user.deletion_successfull) sur toutes les racines.[^src-344cd746]
- **Consigné par :** claude-code/agent

## 2026-10-11 - Mapping EventQueue obligatoire dans registerUserMappings

- **Type :** pitfall
- **Leçon :** Toute écriture outbox via EventQueueRepository dans un domain-* exige databaseMapper.registerBidirectional(EventQueueEntity, EventQueueModel) dans le mapper du package (comme domain-event et domain-post). Sans lui: 'No mapping registered from EventQueueEntity to EventQueueModel', la transaction est annulée. Révélé par la CI d'intégration de la PR 223.[^src-c9b34137]
- **Consigné par :** claude-code/agent

## 2026-10-11 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : npm-packages/packages/domain-user/src/**.
- **Consigné par :** claude-code/agent

[^src-c9b34137]: npm-packages/packages/domain-user/src/models/mapper.ts
[^src-344cd746]: post-processors-runner/post-processor-user/src/post-processors/users/user-deletion-success.post-processor.ts
