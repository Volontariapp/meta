# Historique

## 2026-10-14

- **Vérification** - Document outbox producer spans and exponential backoff (claude-code/agent)

## 2026-10-13

- **Vérification** - Tache 2.11: restauration du contexte de trace (BaseWorker, SinglePostProcessor, BatchPostProcessor) via runInTraceContext / runBatchInTraceContext de database (claude-code/agent)
- **Vérification** - Correction: seul ws-service a une base propre a migrer; post-processor-event et worker-event partagent ms_event avec ms-event (claude-code/agent)
- **Vérification** - Migration commune a copier aussi dans ws-service, post-processor-event et worker-event (8 dossiers); gather: traceparent stocke puis rejoue via createFollowUp (claude-code/agent)
- **Vérification** - GatherStateMetadata.traceparent devient requis (lignes anterieures sans le champ: normalizeTraceparent) (claude-code/agent)
- **Vérification** - GatherStateMetadata.traceparent (jsonb, sans migration) rejoue sur l'evenement de completion du gather (claude-code/agent)
- **Vérification** - createFollowUp pour les evenements declenches, traceparent requis sur RedisEventMessage (legacy sans champ), DeepPartial de save n'impose rien (claude-code/agent)
- **Vérification** - Ajout du contexte de trace des lignes outbox: traceparent capture, transporte (stream, JobEnvelope), NULL attendu, restauration en 2.11 (claude-code/agent)
- **Vérification** - Trigger job_audit résilient aux job_id non-UUID (claude-code/agent)
- **Vérification** - Relu apres ajout de la migration commune AddTraceparent et de la colonne traceparent sur OutboxModel: aucune regle ni commande de la skill ne change (claude-code/agent)

## 2026-10-07

- **Vérification** - Add learnings about outbox redis-master host, getEventStreamName prefix, and gather completion streams (claude-code/agent)
- **Leçon** - Diagnostic flux : inspecter le stream écouté par le post-processor et l'instance Redis (pitfall) (claude-code/agent)

## 2026-10-06

- **Vérification** - contenu des CLAUDE.md des repos rapatrié (fiches par service, carte des routes), sources repointées vers le code (claude-code/claude-opus-5-5)
- **Vérification** - réécrite : statuts réels, requêtes SQL, streams et DLQ, bugs P2 et P4 (claude-code/claude-opus-5-5)
- **Vérification** - migration au format OKF v0.2 (setup agentique repris d'Aureum, multi-repo) (claude-code/claude-opus-5-5)
