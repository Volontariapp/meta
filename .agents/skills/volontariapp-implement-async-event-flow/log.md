# Historique

## 2026-10-07

- **Vérification** - Relu : specs d'integration de ws-service alignees sur IPostCreatedPayload (userId, fileIds) et IEventCreatedPayload (userId), aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu : ws-service bump @volontariapp/* (logger 0.3.0) et reformatage Prettier des imports des post-processors, aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu : bump @volontariapp/* (logger 0.3.0) dans post-processors-runner et outbox-runners, aucune regle modifiee (claude-code/agent)

## 2026-10-06

- **Vérification** - ajout de la regle sur les types de payload partages (unions de litteraux) (claude-code/claude-sonnet-5-5)
- **Leçon** - Payloads messaging : unions de litteraux, pas d'enums nominales (rule) (claude-code/agent)
- **Vérification** - Relu apres passage de StorageEntityType et StorageFileRejectionReason en unions de litteraux dans messaging; procedure inchangee (claude-code/claude-sonnet-5-5)
- **Vérification** - Relu apres ajout du domaine storage dans messaging (jobs et events), procedure inchangee; arborescence des jobs completee (claude-code/claude-sonnet-5-5)
- **Leçon** - post.liked : authorId est le liker, outbox en best effort (pitfall) (claude-code/agent)
- **Vérification** - gather réel (table gather_state, BaseWebSocketGatherPostProcessor), contrat HTTP 206 réel, listeners nativapp réels (claude-code/claude-opus-5-5)
- **Vérification** - migration au format OKF v0.2 (setup agentique repris d'Aureum, multi-repo) (claude-code/claude-opus-5-5)
