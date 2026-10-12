# Historique

## 2026-10-13

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
