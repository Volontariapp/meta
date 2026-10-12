# Historique

## 2026-10-13

- **Vérification** - Validation trigger notify_job_audit_status_change avec emitterId safe (claude-code/agent)
- **Vérification** - BaseWorker fallback emitter (claude-code/agent)
- **Vérification** - Fallback pour emitter dans recordAuditStart et correction des tests pour contrainte NOT NULL sur job_audit.emitter (claude-code/agent)
- **Vérification** - Chargement dynamique des migrations dans le test data-source de workers (claude-code/agent)
- **Vérification** - Relu apres realignement de workers/src/test/migrations sur les migrations communes (dont traceparent): aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - lecons: precision que l'exemple ms-event n'est verifie qu'en local (claude-code/agent)
- **Vérification** - worker-event: resolution retiree, alignement par versions (domain-event 3.10.1); lecons corrigees (pas de resolutions) (claude-code/agent)
- **Vérification** - worker-event: resolution database 3.4.32 (copies multiples); skill inchangee, piege consigne (claude-code/agent)
- **Leçon** - Une seule copie de @volontariapp/database dans un worker, sinon 'No mapping registered' (pitfall) (claude-code/agent)
- **Vérification** - worker-event: limite eslint default project relevee a 20; skill inchangee, piege consigne (claude-code/agent)
- **Leçon** - worker-event: limite de 8 specs pour le lint typed (pitfall) (claude-code/agent)
- **Vérification** - worker-event: handler fallback delete avec acteur et refus des anciens jobs, test:unit ajoute, workers 1.3.37 (claude-code/agent)
- **Leçon** - Un handler fallback rejoue avec l'acteur d'origine et refuse les anciens jobs (rule) (claude-code/agent)
- **Vérification** - Bump messaging 2.24.0 et domain-event 3.10.0 dans worker-event: skill inchangee; piege de test worker-event consigne (claude-code/agent)
- **Leçon** - worker-event: yarn test est casse, test:integration fait DROP SCHEMA (pitfall) (claude-code/agent)
- **Vérification** - withFallback ms-event: 403 hors fallback, extraPayload; deleteEvent passe l'acteur au service (claude-code/agent)
- **Vérification** - Ajout du piege 403 hors liste de court-circuit withFallback et de userRole obligatoire dans IFallbackDeleteEventJobPayload (messaging 2.24.0) (claude-code/agent)

## 2026-10-12

- **Vérification** - worker-social app.module: commentaire trigger, aucune regle modifiee (claude-code/agent)

## 2026-10-11

- **Leçon** - Notification WebSocket de fin de job: mapping messaging obligatoire (pitfall) (claude-code/agent)
- **Leçon** - Outbox: un push BullMQ en echec laisse le job FAILED, jamais repousse (pitfall) (claude-code/agent)

## 2026-10-07

- **Vérification** - Add EventQueueModel provider and entity registration in worker-social for domain services (claude-code/agent)
- **Vérification** - Relu : workers-runners bump @volontariapp/* (logger 0.3.0) et factories de test worker-event alignees (idempotencyKey, eventId, coverStatus), aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu contre messaging/jobs : arborescence storage (SCAN_FILE, CLEANUP_FILES, StorageQueue) toujours exacte, aucun changement necessaire (claude-code/agent)

## 2026-10-06

- **Vérification** - Relu apres ajout du domaine storage dans messaging (jobs et events), procedure inchangee; arborescence des jobs completee (claude-code/claude-sonnet-5-5)
- **Vérification** - faits vérifiés (IJobHandler local, statuts outbox, bug P4, handlers sans producteur), job_catalogue.py, liens et erreurs typées corrigés (claude-code/claude-opus-5-5)
- **Vérification** - migration au format OKF v0.2 (setup agentique repris d'Aureum, multi-repo) (claude-code/claude-opus-5-5)
