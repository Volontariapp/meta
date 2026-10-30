---
name: volontariapp-async-remediation
description: "Playbook opérationnel pas-à-pas pour diagnostiquer, débloquer et réconcilier les pannes asynchrones (Poison pills DLQ, Redis Streams XCLAIM/XACK, réconciliation SQL outbox)."
type: Playbook
title: "Remédiation et Dépilement des Files Asynchrones (DLQ & Streams)"
tags: [async, remediation, dlq, redis-streams, xclaim, xack, outbox, playbook]
status: stable
paths:
  - "post-processors-runner/**"
  - "workers-runners/**"
  - "npm-packages/packages/post-processors/**"
mesh_keys:
  - dlq-remediation
  - xclaim-recovery
  - stream-remediation
generated:
  by: claude-code/agent
  at: "2026-10-12T11:58:00Z"
verified:
  - by: claude-code/agent
    at: "2026-10-19T14:40:40Z"
    digest: e0b7dd13208aafa6
  - by: claude-code/agent
    at: "2026-10-19T16:33:35Z"
    digest: 373788ccadc9e8ef
  - by: claude-code/agent
    at: "2026-10-27T23:00:38Z"
    digest: 323f151a7195b968
  - by: claude-code/agent
    at: "2026-10-29T12:13:52Z"
    digest: 87674249a3a40cbb
  - by: claude-code/agent
    at: "2026-10-29T15:10:20Z"
    digest: a48ce569428f51b5
sources:
  - id: retry
    kind: local_file
    resource: npm-packages/packages/post-processors/src/core/helpers/retry.helper.ts
    title: "RetryHelper (DLQ <stream>-dlq)"
  - id: outbox-status
    kind: local_file
    resource: npm-packages/packages/database/src/outbox/types/outbox.status.ts
    title: OutboxStatus
  - id: panne
    kind: local_file
    resource: docs/stockage-fichiers/11-scenarios-de-panne.md
    title: "Scénarios de panne, problèmes P2 et P4"
---

# Remédiation et Dépilement des Files Asynchrones (DLQ & Streams)

## Quand utiliser ce playbook

Utiliser ce playbook pour intervenir en production ou en environnement de test en cas d'incident sur un flux asynchrone :
- Messages arrivés en fin de tentatives et routés vers la Dead Letter Queue (`<stream>-dlq`)[^retry].
- Blocage d'un groupe de consommateurs Redis Streams (consommateur crashé, PEL saturée).
- Erreur récurrente sur un Job BullMQ sans reprise automatique.
- Désynchronisation ou blocage persistant de statut dans `jobs_outbox`, `event_queue` ou `job_audit`[^outbox-status].

*(Pour une phase d'audit passif préalable sans action corrective, se référer à la skill d'investigation `volontariapp-trace-async-flow`).*

---

## Règles d'or d'intervention

1. **Aucune suppression aveugle** : Ne jamais exécuter un `XDEL` ou purger une DLQ sans avoir copié et sauvegardé le payload JSON incriminé.
2. **Idempotence des consommateurs** : Tout rejeu de message (`replay`) suppose que le consommateur cible supporte d'être appelé deux fois pour la même action (gestion du « déjà traité »).
3. **Consistance transactionnelle bilatérale** : Débloquer un message dans Redis nécessite systématiquement de vérifier et réconcilier l'état de la ligne correspondante dans la base PostgreSQL du microservice émetteur (`event_queue` ou `jobs_outbox`)[^panne].

---

## Procédure pas-à-pas

### Étape 1 : Inspection de la Poison Pill dans la DLQ

Lorsqu'un post-processor échoue après `maxRetries` (par défaut 5 tentatives), `RetryHelper` bascule le message dans `<stream>-dlq`[^retry].

1. Se connecter à l'instance Redis :
   ```bash
   redis-cli
   ```
2. Inspecter les derniers messages en DLQ :
   ```text
   XRANGE <stream>-dlq - + COUNT 10
   ```
3. Chaque entrée contient :
   - `messageId` : ID d'origine du message dans le flux initial.
   - `error` : Message et stacktrace de l'exception ayant provoqué l'échec.
   - `payload` : Contenu JSON complet de l'événement d'origine.
   - `timestamp` : Horodatage du basculement en DLQ.
4. Sauvegarder localement le `payload` et analyser la racine de l'échec (ex. entité introuvable, schéma désynchronisé, contrainte de clé étrangère violée).

---

### Étape 2 : Déblocage des messages orphelins (Pending Entries List)

Si un worker ou post-processor a crashé pendant le traitement, le message reste bloqué dans la Pending Entries List (PEL) sans être ni acquitté ni retenté.

1. Vérifier les messages en souffrance pour le groupe consommateur :
   ```text
   XPENDING <stream> <nom-du-groupe>
   ```
2. Lister les identifiants et les consommateurs assignés :
   ```text
   XPENDING <stream> <nom-du-groupe> - + 10
   ```
3. Si un consommateur est inactif depuis plus de 5 minutes (300 000 ms), réclamer le message au profit d'un consommateur sain via `XCLAIM` :
   ```text
   XCLAIM <stream> <nom-du-groupe> <nouveau-consommateur> 300000 <messageId>
   ```
4. Si le message a été traité avec succès de manière externe, l'acquitter manuellement :
   ```text
   XACK <stream> <nom-du-groupe> <messageId>
   ```

---

### Étape 3 : Correction de la cause racine

Avant toute réinjection :
1. **Si bug de logique applicative** : Livrer le correctif dans le microservice ou le post-processor (`post-processors-runner`), redémarrer le pod.
2. **Si anomalie de données en base** : Corriger la donnée orpheline ou invalide directement dans la base PostgreSQL du service concerné.

---

### Étape 4 : Réinjection sécurisée (Replay) depuis la DLQ

Une fois le correctif en place :
1. Rejouer l'événement dans le flux nominal :
   ```text
   XADD <stream> * payload '<json-payload-corrigé>'
   ```
2. Confirmer la prise en charge et le traitement réussi par le post-processor via les logs applicatifs.
3. Purger le message résolu de la DLQ pour maintenir la file propre :
   ```text
   XDEL <stream>-dlq <id-du-message-dlq>
   ```
4. Nettoyer les clés de métadonnées de retry résiduelles créées par `RetryHelper`[^retry] :
   ```text
   DEL retry:post-processor:<groupe>:<messageId>
   DEL retry:post-processor:<groupe>:<messageId>:attempt
   DEL retry:post-processor:<groupe>:<messageId>:lastError
   ZREM retry-queue:post-processor:<groupe> <messageId>
   ```

---

### Étape 5 : Réconciliation transactionnelle SQL

Pour garantir la cohérence des compteurs et des sagas métier :
1. Identifier la ligne dans la base du microservice émetteur (`event_queue` ou `jobs_outbox`)[^outbox-status] :
   ```sql
   SELECT id, event_name, status, retry_count, last_error
   FROM event_queue
   WHERE id = '<id-evenement>';
   ```
2. Si le message a été réinjecté et traité, synchroniser le statut :
   ```sql
   UPDATE event_queue
   SET status = 'COMPLETED', updated_at = NOW()
   WHERE id = '<id-evenement>' AND status = 'FAILED';
   ```
3. Vérifier la table `job_audit` pour confirmer la clôture propre du cycle d'exécution.

---

### Étape 6 : Enregistrement du piège (Boucle de progrès)

Si la panne a révélé une vulnérabilité d'architecture ou un comportement inattendu, consigner immédiatement la leçon apprise :
```bash
python3 .agents/skills/volontariapp-skill-evolution/scripts/evolve.py learn \
  --skill volontariapp-async-remediation \
  --kind pitfall \
  --rule "Description de la cause racine et de la règle pour éviter la récidive."
```

---

## Checklist de remédiation

- [ ] Le payload du message en échec a été exporté et analysé depuis `<stream>-dlq`[^retry].
- [ ] La PEL Redis a été auditée (`XPENDING`) et les messages orphelins réclamés (`XCLAIM`) ou acquittés (`XACK`).
- [ ] La cause racine (applicative ou modèle de données) a été corrigée et vérifiée.
- [ ] Le message a été réinjecté (`XADD`) et traité avec succès par les consommateurs.
- [ ] Le message traité a été supprimé de la DLQ (`XDEL`) et les clés de retry nettoyées.
- [ ] Les statuts de l'outbox relationnelle (`event_queue` / `jobs_outbox`) ont été réconciliés (`COMPLETED`)[^outbox-status].
- [ ] La leçon a été consignée via `evolve.py learn` si un piège structurel a été mis en évidence.

---

## Références

[^retry]: npm-packages/packages/post-processors/src/core/helpers/retry.helper.ts
[^outbox-status]: npm-packages/packages/database/src/outbox/types/outbox.status.ts
[^panne]: docs/stockage-fichiers/11-scenarios-de-panne.md
