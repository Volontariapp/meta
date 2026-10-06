# Implement Async Event Flow

Guide pas-à-pas pour concevoir et implémenter un flux asynchrone complet (messaging -> outbox -> post-processors -> ws-service -> client).

## Concepts

- [SKILL.md](/volontariapp-implement-async-event-flow/SKILL.md) - point d'entrée de la skill
- [Deep-Dive : Étape 1 - Contrats & Typage dans `messaging`](/volontariapp-implement-async-event-flow/references/01-messaging-contracts.md) - Étape détaillée de volontariapp-implement-async-event-flow.
- [Deep-Dive : Étape 2 - Transactional Outbox & Émission BDD](/volontariapp-implement-async-event-flow/references/02-transactional-outbox.md) - Étape détaillée de volontariapp-implement-async-event-flow.
- [Deep-Dive : Étape 3 - Consommation & Post-Processors](/volontariapp-implement-async-event-flow/references/03-post-processors.md) - Étape détaillée de volontariapp-implement-async-event-flow.
- [Deep-Dive : Étape 4 - Scatter-Gather & Passerelle WebSocket (`ws-service`)](/volontariapp-implement-async-event-flow/references/04-scatter-gather-ws.md) - Étape détaillée de volontariapp-implement-async-event-flow.
- [Deep-Dive : Étape 5 - Réception Client dans `nativapp`](/volontariapp-implement-async-event-flow/references/05-nativapp-handling.md) - Étape détaillée de volontariapp-implement-async-event-flow.
- [Deep-Dive : Le Pattern Saga en Chorégraphie (Compensations & Rollback)](/volontariapp-implement-async-event-flow/references/06-saga-pattern-choreography.md) - Étape détaillée de volontariapp-implement-async-event-flow.
- [Leçons apprises](/volontariapp-implement-async-event-flow/references/lessons.md) - Règles et pièges découverts en travaillant sur volontariapp-implement-async-event-flow, du plus récent au plus ancien.

Historique : [log.md](/volontariapp-implement-async-event-flow/log.md)
