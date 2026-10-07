# Trace Async Flow

Diagnostiquer un flux asynchrone qui ne produit pas son effet (job, événement, saga, notification WebSocket) : cartographie avec analyze_impact puis requêtes SQL sur jobs_outbox, job_audit, event_queue et inspection des Redis Streams et de leur DLQ. À utiliser pour un bug runtime, pas pour implémenter un flux.

## Concepts

- [SKILL.md](/volontariapp-trace-async-flow/SKILL.md) - point d'entrée de la skill
- [Leçons apprises](/volontariapp-trace-async-flow/references/lessons.md) - Règles et pièges découverts en travaillant sur volontariapp-trace-async-flow, du plus récent au plus ancien.

Historique : [log.md](/volontariapp-trace-async-flow/log.md)
