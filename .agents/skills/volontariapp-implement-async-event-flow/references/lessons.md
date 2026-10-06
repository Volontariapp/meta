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
---

# Leçons

## 2026-10-06 - post.liked : authorId est le liker, outbox en best effort

- **Type :** pitfall
- **Leçon :** Dans interaction.service.ts (domain-social), le payload de post.liked porte authorId = id de celui qui like (pas l'auteur du post), identique a emitterId. L'ecriture outbox est faite apres la relation Neo4j dans un try/catch qui journalise et ignore l'erreur : un like peut exister sans evenement. Pour un consommateur, compter l'etat courant (RPC Admin* avec pagination.total) plutot que les evenements recus. Voir docs/badges/10-guide-technique-pp-user.md.[^src-2d73ed86]
- **Consigné par :** claude-code/agent

[^src-2d73ed86]: npm-packages/packages/domain-social/src/services/interaction.service.ts
