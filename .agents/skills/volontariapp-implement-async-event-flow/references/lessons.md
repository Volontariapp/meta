---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-implement-async-event-flow, du plus récent au plus ancien."
tags: [lessons, volontariapp-implement-async-event-flow]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-06T13:13:13Z"
sources:
  - id: src-2d73ed86
    resource: npm-packages/packages/domain-social/src/services/interaction.service.ts
    title: npm-packages/packages/domain-social/src/services/interaction.service.ts
  - id: src-be2f6941
    resource: npm-packages/packages/messaging/src/events/storage/payloads.ts
    title: npm-packages/packages/messaging/src/events/storage/payloads.ts
  - id: src-6dd92801
    resource: post-processors-runner/post-processor-user/src/post-processors/options/event-creation-successfull-badge-options.ts
    title: post-processors-runner/post-processor-user/src/post-processors/options/event-creation-successfull-badge-options.ts
  - id: src-57587df4
    resource: npm-packages/packages/messaging/src/sagas/gather-registry.ts
    title: npm-packages/packages/messaging/src/sagas/gather-registry.ts
  - id: src-cd3f14ee
    resource: npm-packages/packages/domain-user/src/repositories/postgres-user.repository.ts
    title: npm-packages/packages/domain-user/src/repositories/postgres-user.repository.ts
  - id: src-92a40169
    resource: post-processors-runner/post-processor-social/src/post-processors/users/user-deleted.post-processor.ts
    title: post-processors-runner/post-processor-social/src/post-processors/users/user-deleted.post-processor.ts
  - id: src-4f6a6ae1
    resource: workers-runners/worker-event/package.json
    title: workers-runners/worker-event/package.json
  - id: src-3e2c0d08
    resource: ws-service/src/core/services/gather-reaper.service.ts
    title: ws-service/src/core/services/gather-reaper.service.ts
  - id: src-8f29c4a0
    resource: post-processors-runner/post-processor-storage/src/post-processors/user-deleted.post-processor.ts
    title: post-processors-runner/post-processor-storage/src/post-processors/user-deleted.post-processor.ts
---

# Leçons

## 2026-10-19 - Un nouveau domaine consommateur de user.deleted a besoin de son stream, et ses demandes de calcul s'ecrivent en transaction

- **Type :** rule
- **Leçon :** Pour post-processor-ranking : Streams.USER_DELETED_RANKING (user:deleted:ranking) est le stream propre au domaine, et l'acquittement USER_RANKING_DELETED part vers WS_USER_DELETED_FEEDBACK ; ws-service ne doit attendre cet acquittement qu'apres le deploiement du post-processor (deux vagues). Un declencheur qui doit produire un calcul ecrit la demande (ranking_request) et la ligne jobs_outbox dans UNE transaction ; les interfaces de payload de messaging n'ont pas de signature d'index, donc la ligne est ecrite avec un payload JSON explicite plutot qu'avec un cast. Tous les evenements du flux portent leur donnee dans event.payload.after. Modele : post-processor-storage ; vu le 2026-10-19 (PR post-processors-runner 28).[^src-8f29c4a0]
- **Consigné par :** claude-code/agent

## 2026-10-18 - Ajouter un retour attendu au gather : déployer l'émetteur avant la config ws-service

- **Type :** rule
- **Leçon :** GatherReaperService (ws-service/src/core/services/gather-reaper.service.ts:45-47,58-81) tourne toutes les 10 s et passe en FAILED toute clé PENDING de plus de 60 s. Ajouter une clé à scatterGather.aggregations[].expects (ws-service/config/default.config.json) avant que le post-processor émetteur de l'acquittement soit déployé fait donc échouer chaque saga de ce déclencheur au bout de 60 s (inférence d'après le reaper, non testée). Pour user.deleted, finalizeDeletion n'étant appelé que sur user.deletion_successfull, le compte resterait PENDING_DELETION. Ordre : déployer le post-processor émetteur, puis la config ws-service. La leçon qui dit qu'aucun reaper n'existe (lessons.md) est périmée.[^src-3e2c0d08]
- **Consigné par :** claude-code/agent

## 2026-10-17 - Retirer une epingle resolutions perimee dans un runner

- **Type :** rule
- **Leçon :** Un resolutions annule silencieusement la version declaree : worker-event declarait database 3.10.10 mais un resolutions la fixait a 3.8.0 (ajoute en 601ac5c pour obtenir le mapping traceparent, jamais retire apres 35b7b8c), ce qui gardait aussi une copie de messaging 2.25.0. Methode : lire l'historique de l'entree (git log -S '"resolutions"' -- package.json) pour comprendre pourquoi elle existe, comparer version declaree et installee (find node_modules -path '*@volontariapp/database/package.json'), retirer l'entree, yarn install, verifier qu'il ne reste qu'une copie de database et de messaging, puis tsc --noEmit --incremental false et les tests d'integration sur base et Redis jetables. Le retrait change le comportement reel du runner : le dire dans la PR.[^src-4f6a6ae1]
- **Consigné par :** claude-code/agent

## 2026-10-12 - Service de domaine avec EventQueueModel: forFeature dans le module qui le declare

- **Type :** rule
- **Leçon :** Un service de domain-social (ParticipationService, InteractionService) injecte @InjectRepository(EventQueueModel). Le module Nest qui le declare en provider doit lui-meme importer TypeOrmModule.forFeature([EventQueueModel]); l'import dans un module voisin (PostProcessorsModule) ne suffit pas. Sinon: Nest can't resolve dependencies ... EventQueueModelRepository au demarrage (post-processor-social, corrige dans DomainSocialModule). Un worker sans TypeOrmModule fournit getRepositoryToken(EventQueueModel) dans AppModule, et son image deployee doit contenir ce provider (deploy/ pointe un sha d'image).
- **Consigné par :** claude-code/agent

## 2026-10-11 - TypeORM forFeature et relations par chaine

- **Type :** rule
- **Leçon :** Dans un post-processor avec TypeOrmModule.forRoot en autoLoadEntities, chaque modele cible d'une relation par chaine (ex: UserModel.userBadges -> UserBadgeModel) doit etre dans un forFeature, sinon 'Entity metadata for UserModel#userBadges was not found' au demarrage. Corrige dans post-processor-user (DomainUserModule) et post-processor-post (DomainPostModule, PostModel.media -> PostMediaModel).
- **Consigné par :** claude-code/agent

## 2026-10-11 - post-processor-social avale les erreurs de USER_DELETED

- **Type :** pitfall
- **Leçon :** UserDeletedPostProcessor (post-processor-social) capture les erreurs sans les relancer: le message est acquitté, USER_SOCIAL_DELETED n'est jamais émis et le gather user.deleted reste PENDING. Aucun reaper de gather_state trouvé. SocialUserService.deleteUser lève SOCIAL_USER_NOT_FOUND si le noeud n'existe pas, donc un retry après succès partiel échoue.[^src-92a40169]
- **Consigné par :** claude-code/agent

## 2026-10-11 - Suppression de compte en deux temps

- **Type :** decision
- **Leçon :** Le user passe en PENDING_DELETION et user.deleted est écrit dans l'outbox dans la même transaction (requestDeletionWithUserDeleted). La ligne users n'est supprimée (finalizeDeletion) qu'après le succès du gather ws, pour pouvoir rejouer en cas d'échec d'un pp. Décisions produit : events du user supprimés même avec participants, likes supprimés (DETACH DELETE), commentaires conservés avec authorId sentinelle et contenu remplacé.[^src-cd3f14ee]
- **Consigné par :** claude-code/agent

## 2026-10-11 - Payloads POST_LIKED et COMMENT_CREATED: authorId est l'acteur, pas l'auteur du post

- **Type :** pitfall
- **Leçon :** Dans interaction.service.ts (domain-social) le payload de POST_LIKED/POST_UNLIKED est { postId, authorId: userId.value } : authorId est l'utilisateur qui like, userId n'est jamais renseigne et l'auteur du post est absent. Dans postgres-comment.repository.ts (domain-post) COMMENT_CREATED porte authorId = auteur du commentaire, sans l'auteur du post. COMMENT_DELETED n'a pas d'acteur dans le payload. L'acteur et la date se lisent dans l'enveloppe du message (emitterId, createdAt). Ne pas deduire le sens d'un champ de son nom: lire le producteur. Verifie en session le 2026-10-11.[^src-2d73ed86]
- **Consigné par :** claude-code/agent

## 2026-10-07 - Complétion de saga gather : stream de sortie versus trigger initial

- **Type :** pitfall
- **Leçon :** Dans gather-registry.ts (SAGA_GATHER_COMPLETION_MAPPING), le champ stream définit la destination du message de succès ou d'échec de la saga (ex: Streams.EVENT_SUCCESSFULLY_CREATED). Il ne doit JAMAIS pointer sur le stream déclencheur initial de la saga (ex: event:created), sinon le message de complétion est injecté sur le mauvais canal et les post-processors de finalisation (comme la mise à jour de saga_status ou l'attribution de badges) ne sont jamais déclenchés.[^src-57587df4]
- **Consigné par :** claude-code/agent

## 2026-10-07 - Nommage de stream des post-processors : toujours getEventStreamName

- **Type :** pitfall
- **Leçon :** Les options de configuration d'un post-processor (PostProcessorOptions.streamName) doivent OBLIGATOIREMENT être enveloppées par getEventStreamName(Streams.MON_STREAM) de @volontariapp/messaging. Passer Streams.MON_STREAM directement omet le préfixe stream: que l'outbox pusher (event-queue.pusher.ts) ajoute systématiquement, rendant le post-processor sourd aux événements publiés dans Redis Streams.[^src-6dd92801]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Payloads messaging : unions de litteraux, pas d'enums nominales

- **Type :** rule
- **Leçon :** messaging ne peut pas dependre de domain-storage (domain-storage depend de messaging, outbox et database : cycle). Pour un type partage avec un domaine (EntityType, RejectionReason), declarer dans messaging un objet as const + type union de litteraux (voir packages/messaging/src/events/storage/payloads.ts, StorageEntityType et StorageFileRejectionReason) : les enums de chaines du domaine y sont assignables. Une enum TypeScript distincte est nominale et obligerait un mapping manuel ou un cast interdit (as unknown as). Ajouter un test de non-derive des valeurs.[^src-be2f6941]
- **Consigné par :** claude-code/agent

## 2026-10-06 - post.liked : authorId est le liker, outbox en best effort

- **Type :** pitfall
- **Leçon :** Dans interaction.service.ts (domain-social), le payload de post.liked porte authorId = id de celui qui like (pas l'auteur du post), identique a emitterId. L'ecriture outbox est faite apres la relation Neo4j dans un try/catch qui journalise et ignore l'erreur : un like peut exister sans evenement. Pour un consommateur, compter l'etat courant (RPC Admin* avec pagination.total) plutot que les evenements recus. Voir docs/badges/10-guide-technique-pp-user.md.[^src-2d73ed86]
- **Consigné par :** claude-code/agent

[^src-2d73ed86]: npm-packages/packages/domain-social/src/services/interaction.service.ts
[^src-be2f6941]: npm-packages/packages/messaging/src/events/storage/payloads.ts
[^src-6dd92801]: post-processors-runner/post-processor-user/src/post-processors/options/event-creation-successfull-badge-options.ts
[^src-57587df4]: npm-packages/packages/messaging/src/sagas/gather-registry.ts
[^src-cd3f14ee]: npm-packages/packages/domain-user/src/repositories/postgres-user.repository.ts
[^src-92a40169]: post-processors-runner/post-processor-social/src/post-processors/users/user-deleted.post-processor.ts
[^src-4f6a6ae1]: workers-runners/worker-event/package.json
[^src-3e2c0d08]: ws-service/src/core/services/gather-reaper.service.ts
[^src-8f29c4a0]: post-processors-runner/post-processor-storage/src/post-processors/user-deleted.post-processor.ts
