# Historique

## 2026-10-14

- **Vérification** - Bump post-processors for logger 0.4.0 (claude-code/agent)
- **Vérification** - Verify post-processors runner and dlq remediation dependencies (claude-code/agent)

## 2026-10-13

- **Vérification** - Lockfile regenere: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Runners instrumentes (tracing.ts, monitoring, service.datadog.yaml): aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Migration traceparent copiee dans post-processor-event: la skill db-migration la liste deja (claude-code/agent)
- **Vérification** - Migration traceparent copiee dans worker-event: la skill db-migration la liste deja (claude-code/agent)
- **Vérification** - Montee de post-processors/database dans les post-processors: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Montee de workers/database dans les worker-*: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Tache 2.11: restauration du contexte de trace (BaseWorker, SinglePostProcessor, BatchPostProcessor) via runInTraceContext / runBatchInTraceContext de database (claude-code/agent)
- **Vérification** - GatherStateMetadata.traceparent devient requis (lignes anterieures sans le champ: normalizeTraceparent) (claude-code/agent)
- **Vérification** - Relu apres bump database 3.7.0 et cascade des dependants: aucune regle ne change (claude-code/agent)
- **Vérification** - Relu apres traceparent requis sur RedisEventMessage et createFollowUp: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Relu apres capture du traceparent et migration job_audit trigger (ms-user 6c360de): aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Relu apres bump de version et changelogs (changeset version sur database, cascade domain-*, outbox, workers, post-processors): aucune regle ni commande de la skill ne change (claude-code/agent)
- **Vérification** - worker-event: resolution retiree, alignement par versions (domain-event 3.10.1); lecons corrigees (pas de resolutions) (claude-code/agent)
- **Vérification** - worker-event: resolution database 3.4.32 (copies multiples); skill inchangee, piege consigne (claude-code/agent)
- **Vérification** - worker-event: limite eslint default project relevee a 20; skill inchangee, piege consigne (claude-code/agent)
- **Vérification** - worker-event: handler fallback delete avec acteur et refus des anciens jobs, test:unit ajoute, workers 1.3.37 (claude-code/agent)
- **Vérification** - Bump messaging 2.24.0 et domain-event 3.10.0 dans worker-event: skill inchangee; piege de test worker-event consigne (claude-code/agent)
- **Vérification** - Relu apres bump de versions (messaging 2.24.0 et dependants) par changeset : skill inchangee (claude-code/agent)

## 2026-10-12

- **Vérification** - Création du playbook de remédiation asynchrone DLQ et Streams (claude-code/agent)
- **Création** - squelette OKF généré par evolve.py new (claude-code/agent)
- **Leçon** - Création de la skill (decision) (claude-code/agent)
