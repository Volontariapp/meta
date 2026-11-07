---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-async-remediation, du plus récent au plus ancien."
tags: [lessons, volontariapp-async-remediation]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-12T11:59:43Z"
sources:
  - id: src-d5381e8a
    resource: post-processors-runner/post-processor-social/src/post-processors/events/event-created.post-processor.ts
    title: post-processors-runner/post-processor-social/src/post-processors/events/event-created.post-processor.ts
---

# Leçons

## 2026-11-07 - Echec Neo4j d'un post-processor: retry puis DLQ au lieu d'une perte silencieuse

- **Type :** rule
- **Leçon :** Depuis le correctif de post-processor-social, un echec Neo4j dans EventCreatedPostProcessor leve l'erreur: BatchPostProcessor (post-processors) rejoue le lot avec backoff via RetryHelper, puis l'envoie dans la DLQ <stream>-dlq une fois les tentatives epuisees, sans emettre le feedback WebSocket (le gather EVENT_CREATION n'est alors pas complete ; son delai d'expiration n'a pas ete verifie). Un message en DLQ pour event-created cote social signifie donc un noeud SocialEvent absent du graphe: rejouer apres avoir verifie que Neo4j repond, le cypher etant idempotent (MERGE).[^src-d5381e8a]
- **Consigné par :** claude-code/agent

## 2026-10-12 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : post-processors-runner/**, workers-runners/**, npm-packages/packages/post-processors/**.
- **Consigné par :** claude-code/agent

[^src-d5381e8a]: post-processors-runner/post-processor-social/src/post-processors/events/event-created.post-processor.ts
