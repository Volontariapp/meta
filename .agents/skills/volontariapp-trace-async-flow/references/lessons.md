---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-trace-async-flow, du plus récent au plus ancien."
tags: [lessons, volontariapp-trace-async-flow]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-07T14:11:43Z"
sources:
  - id: src-6dd92801
    resource: post-processors-runner/post-processor-user/src/post-processors/options/event-creation-successfull-badge-options.ts
    title: post-processors-runner/post-processor-user/src/post-processors/options/event-creation-successfull-badge-options.ts
  - id: src-d5381e8a
    resource: post-processors-runner/post-processor-social/src/post-processors/events/event-created.post-processor.ts
    title: post-processors-runner/post-processor-social/src/post-processors/events/event-created.post-processor.ts
---

# Leçons

## 2026-11-07 - EventCreatedPostProcessor (social) avale les erreurs Neo4j puis acquitte

- **Type :** pitfall
- **Leçon :** Dans post-processor-social, createEventsBatch est dans un try/catch qui journalise 'Error processing EVENT_CREATED batch in Neo4j' puis continue : le feedback WS est emis et le message acquitte, donc un deadlock Neo4j (ForsetiClient ... NODE_RELATIONSHIP_GROUP_DELETE) perd definitivement le noeud SocialEvent et le lien CREATED, sans rejeu. Symptome: evenement present en Postgres et sur l'app, absent du graphe social. Cause racine corrigee cote domain-social: Neo4jBaseRepository.write() utilise session.executeWrite (retry des erreurs transitoires) au lieu de session.run. Le catch du post-processor reste a durcir (relancer pour laisser le message en attente).[^src-d5381e8a]
- **Consigné par :** claude-code/agent

## 2026-10-07 - Diagnostic flux : inspecter le stream écouté par le post-processor et l'instance Redis

- **Type :** pitfall
- **Leçon :** Pour vérifier quel stream un post-processor écoute réellement, inspecter les logs du pod (ex: [WARN] ... STREAMS <stream_name> >). Si le nom affiché n'a pas le préfixe stream:, getEventStreamName n'a pas été appelé dans le provider d'options. Si l'outbox indique COMPLETED mais que xlen est à 0 sur redis-master, vérifier si l'outbox n'est pas connectée à une instance Redis isolée (ex: ws-service-redis).[^src-6dd92801]
- **Consigné par :** claude-code/agent

[^src-6dd92801]: post-processors-runner/post-processor-user/src/post-processors/options/event-creation-successfull-badge-options.ts
[^src-d5381e8a]: post-processors-runner/post-processor-social/src/post-processors/events/event-created.post-processor.ts
