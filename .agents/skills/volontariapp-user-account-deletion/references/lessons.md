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
---

# Leçons

## 2026-10-11 - Mapping EventQueue obligatoire dans registerUserMappings

- **Type :** pitfall
- **Leçon :** Toute écriture outbox via EventQueueRepository dans un domain-* exige databaseMapper.registerBidirectional(EventQueueEntity, EventQueueModel) dans le mapper du package (comme domain-event et domain-post). Sans lui: 'No mapping registered from EventQueueEntity to EventQueueModel', la transaction est annulée. Révélé par la CI d'intégration de la PR 223.[^src-c9b34137]
- **Consigné par :** claude-code/agent

## 2026-10-11 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : npm-packages/packages/domain-user/src/**.
- **Consigné par :** claude-code/agent

[^src-c9b34137]: npm-packages/packages/domain-user/src/models/mapper.ts
