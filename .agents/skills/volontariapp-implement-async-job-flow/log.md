# Historique

## 2026-10-07

- **Vérification** - Add EventQueueModel provider and entity registration in worker-social for domain services (claude-code/agent)
- **Vérification** - Relu : workers-runners bump @volontariapp/* (logger 0.3.0) et factories de test worker-event alignees (idempotencyKey, eventId, coverStatus), aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu contre messaging/jobs : arborescence storage (SCAN_FILE, CLEANUP_FILES, StorageQueue) toujours exacte, aucun changement necessaire (claude-code/agent)

## 2026-10-06

- **Vérification** - Relu apres ajout du domaine storage dans messaging (jobs et events), procedure inchangee; arborescence des jobs completee (claude-code/claude-sonnet-5-5)
- **Vérification** - faits vérifiés (IJobHandler local, statuts outbox, bug P4, handlers sans producteur), job_catalogue.py, liens et erreurs typées corrigés (claude-code/claude-opus-5-5)
- **Vérification** - migration au format OKF v0.2 (setup agentique repris d'Aureum, multi-repo) (claude-code/claude-opus-5-5)
