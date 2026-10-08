# Historique

## 2026-10-08

- **Vérification** - Implémentation du flux event.finished et des 9 badges de participation dans post-processor-user (claude-code/agent)
- **Vérification** - Add event.finished event and streams contracts (claude-code/agent)

## 2026-10-07

- **Vérification** - Ajout post-processor event_social.wished pour badge EVENT_WISHLIST_COUNT_10 (claude-code/agent)
- **Vérification** - Ajout des evenements et streams event_social.wished et event_social.unwished (claude-code/agent)
- **Vérification** - Fix typage et linting des tests unitaires et tsconfig pour pp-user (claude-code/agent)
- **Vérification** - Ajout du post-processor PostLikedBadgePostProcessor et SocialInteractionClient gRPC pour le badge SOCIAL_LIKE_COUNT_10 (claude-code/agent)
- **Vérification** - Ajout du post-processor post-creation-successfull et evaluation du badge COMMUNITY_POST_COUNT_1 dans post-processor-user (claude-code/agent)
- **Vérification** - Add learnings about outbox redis-master host, getEventStreamName prefix, and gather completion streams (claude-code/agent)
- **Leçon** - Complétion de saga gather : stream de sortie versus trigger initial (pitfall) (claude-code/agent)
- **Leçon** - Nommage de stream des post-processors : toujours getEventStreamName (pitfall) (claude-code/agent)
- **Vérification** - Added UserBadgeAwardedPostProcessor to ws-service (process:antigravity)
- **Vérification** - Added user.badge_awarded contracts and stream (agent:antigravity)
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
