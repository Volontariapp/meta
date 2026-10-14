# Historique

## 2026-10-14

- **Vérification** - Add Logger.setDefaultConfig to microservices bootstrap (claude-code/agent)
- **Vérification** - Update logger test digest (claude-code/agent)
- **Vérification** - Bump logger to 0.4.0 in monorepo packages (claude-code/agent)
- **Vérification** - Bump dependencies across all microservices and runners (claude-code/agent)

## 2026-10-13

- **Vérification** - Lockfile regenere: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Runners instrumentes (tracing.ts, monitoring, service.datadog.yaml): aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - enableShutdownHooks ajoute dans main.ts: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - DD_ENV ajoute au compose: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - monitoring 2.2.0: echantillonnage, environnement et arret propre documentes dans trace-async-flow (claude-code/agent)
- **Vérification** - Correction: la copie de la migration commune dans worker-event et post-processor-event est necessaire (CI = base neuve reconstruite depuis leurs migrations) (claude-code/agent)
- **Vérification** - Migration traceparent copiee dans post-processor-event: la skill db-migration la liste deja (claude-code/agent)
- **Vérification** - Migration traceparent copiee dans worker-event: la skill db-migration la liste deja (claude-code/agent)
- **Vérification** - Montee de post-processors/database dans les post-processors: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Montee de workers/database dans les worker-*: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Montee de database/outbox dans les runners: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Tache 2.11: restauration du contexte de trace (BaseWorker, SinglePostProcessor, BatchPostProcessor) via runInTraceContext / runBatchInTraceContext de database (claude-code/agent)
- **Vérification** - Correction: seul ws-service a une base propre a migrer; post-processor-event et worker-event partagent ms_event avec ms-event (claude-code/agent)
- **Vérification** - Migration commune a copier aussi dans ws-service, post-processor-event et worker-event (8 dossiers); gather: traceparent stocke puis rejoue via createFollowUp (claude-code/agent)
- **Vérification** - GatherStateMetadata.traceparent devient requis (lignes anterieures sans le champ: normalizeTraceparent) (claude-code/agent)
- **Vérification** - GatherStateMetadata.traceparent (jsonb, sans migration) rejoue sur l'evenement de completion du gather (claude-code/agent)
- **Vérification** - Relu apres traceparent requis sur RedisEventMessage et createFollowUp: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Relu apres reformatage Prettier de jobs-outbox.pusher.ts (import sur plusieurs lignes): contenu de la skill inchange (claude-code/agent)
- **Vérification** - Relu apres capture du traceparent et migration job_audit trigger (ms-user 6c360de): aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Migration commune 1792000000000 répliquée (claude-code/agent)
- **Vérification** - BaseWorker fallback emitter (claude-code/agent)
- **Vérification** - Fallback pour emitter dans recordAuditStart et correction des tests pour contrainte NOT NULL sur job_audit.emitter (claude-code/agent)
- **Vérification** - Chargement dynamique des migrations dans le test data-source de workers (claude-code/agent)
- **Vérification** - Relu apres realignement de workers/src/test/migrations sur les migrations communes (dont traceparent): aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Relu apres bump de version et changelogs (changeset version sur database, cascade domain-*, outbox, workers, post-processors): aucune regle ni commande de la skill ne change (claude-code/agent)
- **Vérification** - Relu apres ajout de la migration commune AddTraceparent et de la colonne traceparent sur OutboxModel: aucune regle ni commande de la skill ne change (claude-code/agent)
- **Vérification** - worker-event: resolution retiree, alignement par versions (domain-event 3.10.1); lecons corrigees (pas de resolutions) (claude-code/agent)
- **Vérification** - worker-event: resolution database 3.4.32 (copies multiples); skill inchangee, piege consigne (claude-code/agent)
- **Vérification** - worker-event: limite eslint default project relevee a 20; skill inchangee, piege consigne (claude-code/agent)
- **Vérification** - worker-event: handler fallback delete avec acteur et refus des anciens jobs, test:unit ajoute, workers 1.3.37 (claude-code/agent)
- **Vérification** - Bump messaging 2.24.0 et domain-event 3.10.0 dans worker-event: skill inchangee; piege de test worker-event consigne (claude-code/agent)
- **Vérification** - withFallback ms-event: 403 hors fallback, extraPayload; deleteEvent passe l'acteur au service (claude-code/agent)
- **Vérification** - Relu apres bump de versions (messaging 2.24.0 et dependants) par changeset : skill inchangee (claude-code/agent)
- **Vérification** - Relu apres reformatage lint-staged de event.service.unit.spec.ts : la skill ne cite pas ce fichier de test, aucun changement (claude-code/agent)
- **Vérification** - Relu apres EventService.delete(id, actorId, actorRole) obligatoires dans domain-event 3.10.0 : la skill ne cite pas ce comportement, aucun changement (claude-code/agent)

## 2026-10-12

- **Vérification** - Création du playbook de scaffolding d'un nouveau microservice (claude-code/agent)
- **Création** - squelette OKF généré par evolve.py new (claude-code/agent)
- **Leçon** - Création de la skill (decision) (claude-code/agent)
