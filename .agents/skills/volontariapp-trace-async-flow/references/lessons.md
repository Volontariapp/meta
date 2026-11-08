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
  - id: src-7e76d015
    resource: .agents/skills/volontariapp-trace-async-flow/SKILL.md
    title: .agents/skills/volontariapp-trace-async-flow/SKILL.md
---

# Leçons

## 2026-11-08 - L'historique des lignes terminees dure un jour

- **Type :** rule
- **Leçon :** Les runners d'outbox purgent les lignes COMPLETED de event_queue, jobs_outbox et job_audit apres un jour (OutboxRunnerConfig.purge). Aucune ligne pour un evenement ancien veut dire purgee, pas jamais emis ; PENDING, PROCESSING et FAILED restent visibles.[^src-7e76d015]
- **Consigné par :** claude-code/agent

## 2026-10-07 - Diagnostic flux : inspecter le stream écouté par le post-processor et l'instance Redis

- **Type :** pitfall
- **Leçon :** Pour vérifier quel stream un post-processor écoute réellement, inspecter les logs du pod (ex: [WARN] ... STREAMS <stream_name> >). Si le nom affiché n'a pas le préfixe stream:, getEventStreamName n'a pas été appelé dans le provider d'options. Si l'outbox indique COMPLETED mais que xlen est à 0 sur redis-master, vérifier si l'outbox n'est pas connectée à une instance Redis isolée (ex: ws-service-redis).[^src-6dd92801]
- **Consigné par :** claude-code/agent

[^src-6dd92801]: post-processors-runner/post-processor-user/src/post-processors/options/event-creation-successfull-badge-options.ts
[^src-7e76d015]: .agents/skills/volontariapp-trace-async-flow/SKILL.md
