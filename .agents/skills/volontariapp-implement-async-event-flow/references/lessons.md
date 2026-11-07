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
  - id: src-7746ea1d
    resource: ws-service/config/default.config.json
    title: ws-service/config/default.config.json
  - id: src-b571b8b4
    resource: ws-service/src/core/services/gather-state.service.ts
    title: ws-service/src/core/services/gather-state.service.ts
  - id: src-b66d36a3
    resource: npm-packages/packages/domain-user/src/database/triggers/index.ts
    title: npm-packages/packages/domain-user/src/database/triggers/index.ts
  - id: src-01a2dc3c
    resource: "https://github.com/Volontariapp/post-processors-runner/pull/63"
    title: "https://github.com/Volontariapp/post-processors-runner/pull/63"
  - id: src-fbe43ef3
    resource: npm-packages/packages/post-processors/src/core/processors/base.post-processor.ts
    title: npm-packages/packages/post-processors/src/core/processors/base.post-processor.ts
  - id: src-2957ab4a
    resource: "https://github.com/Volontariapp/post-processors-runner/pull/64"
    title: "https://github.com/Volontariapp/post-processors-runner/pull/64"
  - id: src-191c6e6a
    resource: "https://github.com/Volontariapp/ws-service/pull/52"
    title: "https://github.com/Volontariapp/ws-service/pull/52"
  - id: src-b324b54c
    resource: nativapp/src/hooks/useNotificationHandlers.ts
    title: nativapp/src/hooks/useNotificationHandlers.ts
  - id: src-ce24b10c
    resource: ws-service/src/post-processors/jobs/job-outbox-success.post-processor.ts
    title: ws-service/src/post-processors/jobs/job-outbox-success.post-processor.ts
  - id: src-7386448c
    resource: post-processors-runner/post-processor-user/src/core/services/badge-evaluator.service.ts
    title: post-processors-runner/post-processor-user/src/core/services/badge-evaluator.service.ts
  - id: src-6047c95e
    resource: post-processors-runner/post-processor-user/src/core/clients/post-author.resolver.ts
    title: post-processors-runner/post-processor-user/src/core/clients/post-author.resolver.ts
  - id: src-faf8fc8a
    resource: post-processors-runner/post-processor-user/src/config/custom-config.ts
    title: post-processors-runner/post-processor-user/src/config/custom-config.ts
  - id: src-fe4a226a
    resource: AGENT.md
    title: AGENT.md
  - id: src-4ee0f4b9
    resource: npm-packages/packages/domain-social/src/services/participation.service.ts
    title: npm-packages/packages/domain-social/src/services/participation.service.ts
  - id: src-61545c8a
    resource: ws-service/package.json
    title: ws-service/package.json
---

# Leçons

## 2026-11-07 - yarn up d'un consommateur: seuls les packages directs, et la cle resolutions

- **Type :** pitfall
- **Leçon :** Dans ws-service, la cle resolutions de package.json fixait @volontariapp/messaging a ^2.33.0: yarn up messaging@2.34.0 laissait l'ancienne version sans erreur; relever aussi la resolution puis yarn install. yarn up refuse un package transitif (outbox n'est pas une dependance directe de ws-service: 'doesn't match any packages referenced by any workspace'): ne monter que les dependances declarees (database, post-processors, domain-event, auth) et verifier ensuite avec find node_modules -path '*@volontariapp/shared/package.json' qu'une seule copie reste. tsc le signale sinon par 'Streams is not assignable to Streams'.[^src-61545c8a]
- **Consigné par :** claude-code/agent

## 2026-11-07 - Push direct depuis un service Neo4j: outbox best effort, emitterId = acteur

- **Type :** pitfall
- **Leçon :** ms-social ecrit dans Neo4j, sans transaction SQL: l'evenement outbox est pousse apres l'ecriture, en best effort (log d'un warning si le push echoue, l'ecriture reste acquise), comme wishEvent. L'emitterId est une colonne uuid de event_queue: une operation sans acteur dans sa signature (setEventAttendance) doit recevoir l'utilisateur authentifie depuis le controleur (@CurrentUser), sans quoi l'emitter est inventé. Cote ws-service, le push a un seul destinataire n'utilise pas le gather: un BatchPostProcessor qui boucle sur les utilisateurs et appelle notifyUser, comme user.badge_awarded. Cas de reference: event_social.attendance_set (pointage organisateur vers event.attendance_updated).[^src-4ee0f4b9]
- **Consigné par :** claude-code/agent

## 2026-11-07 - Module ws-service : structure AGENT.md et classes SOLID

- **Type :** rule
- **Leçon :** Un nouveau module de ws-service suit AGENT.md section 3 (src/modules/<domaine>/ avec controllers, gateways, guards, dto/request, services, repositories/interfaces et repositories/redis, domain). Le controleur HTTP et le gateway socket ne font que du transport ; les regles vont dans des services de cas d'usage et des objets du domaine ; Redis est derriere des interfaces de repository injectees par jeton (une interface par preoccupation : autorisation, position, cadence). Correction de Victor sur ws-service#54 (2026-11-07) : un module plat src/live/ avec un service Redis fourre-tout et la logique metier dans le gateway a ete refuse.[^src-fe4a226a]
- **Consigné par :** Victor

## 2026-11-06 - ranking.ready est partage par les deux listes : le type de liste est ajoute dans originalPayload

- **Type :** rule
- **Leçon :** COMPUTE_USER_RANKING et COMPUTE_USER_FEED se mappent sur la meme notification ranking.ready (mapping par type de job), donc le client ne savait pas quelle liste etait prete. ws-service emet { isEmitter: true, ...originalPayload } : tout champ ajoute a originalPayload par JobOutboxSuccessPostProcessor (npm-packages) arrive au client sans changement de ws-service. Le champ listKind (EVENT ou POST) est optionnel : absent veut dire emetteur ancien, rafraichir les deux listes.[^src-ce24b10c]
- **Consigné par :** claude-code/claude-sonnet-5-5

## 2026-11-06 - Un 206 FALLBACK_ACTIVATED ne doit pas allumer un indicateur que seul un evenement WebSocket eteint

- **Type :** pitfall
- **Leçon :** Cote nativapp, apiFetch allumait l'indicateur global Synchronisation en cours sur tout 206, et seuls les evenements *.fallback.* le coupaient. Une lecture de ranking en 206 (compte neuf, liste pas encore calculee) le laissait allume pour toujours, et un ranking.ready perdu (socket pas encore connecte) laissait l'app sur la liste de repli. Regle : le client gere un 206 de lecture dans la requete elle-meme (option signalSyncPending false, polling avec backoff tant que isFallback), le WebSocket n'est qu'un accelerateur, et tout indicateur piloté par evenement a un delai maximum.[^src-b324b54c]
- **Consigné par :** claude-code/claude-sonnet-5-5
## 2026-11-06 - Une fonctionnalité qui crédite des points se déploie derrière un flag éteint

- **Type :** rule
- **Leçon :** BADGE_POINTS_ENABLED vaut false par défaut. Ordre de mise en production: migration du ms, déploiement du post-processor flag éteint, dry-run puis rattrapage des compteurs, contrôle de quelques comptes, puis activation dans deploy. Le rattrapage n'attribue aucun badge et ne crédite aucun point (pas de rétroactivité).[^src-faf8fc8a]
- **Consigné par :** claude-code/agent

## 2026-11-06 - Résoudre une donnée manquante dans le post-processor plutôt qu'enrichir l'événement

- **Type :** decision
- **Leçon :** post.liked ne porte pas l'auteur du post et likePost vit dans npm-packages (domain-social): l'enrichir imposait un nouveau tour de la règle du STOP. Le post-processor appelle PostService.GetPost avec le token interne et cache l'auteur dans Redis (immuable). NOT_FOUND ne compte pas le like; toute autre erreur est relancée pour que le message du flux soit rejoué, rien n'est perdu ni compté à tort.[^src-6047c95e]
- **Consigné par :** claude-code/agent

## 2026-11-06 - Écrire le cache Redis après le commit, jamais dans la transaction

- **Type :** pitfall
- **Leçon :** badges:owned:<user> était écrit dans le callback de transaction: après un rollback le cache disait possédé et le badge n'était jamais attribué. Tout cache qui sert à court-circuiter un traitement s'écrit après le commit, par une méthode appelée sur le résultat de db.transaction.[^src-7386448c]
- **Consigné par :** claude-code/agent

## 2026-11-06 - Compteur de progression: une ligne de dédup par objet compté

- **Type :** rule
- **Leçon :** Un compteur alimenté par un événement non idempotent (like, souhait) s'incrémente seulement si l'insertion dans badge_progress_dedup (user_id, metric, ref_id) est nouvelle, dans la même transaction que l'attribution. Un like, unlike, like ne recompte pas; le compteur ne décrémente jamais. Le rattrapage des utilisateurs existants remplit les mêmes lignes, ce qui le rend idempotent.[^src-7386448c]
- **Consigné par :** claude-code/agent

## 2026-11-05 - Une mise a jour de gather doit etre atomique (G8)

- **Type :** rule
- **Leçon :** Les acquittements d'un meme gather sont consommes par des post-processors distincts, donc en parallele. GatherStateService.updateEventState faisait lecture puis reecriture du JSON gather_events_state entier : deux acquittements a 1 ms d'ecart (user_ranking.deleted, user_storage.deleted) se sont ecrases, USER_RANKING_DELETED est reste PENDING et la suppression de compte n'a jamais abouti. Toute ecriture d'etat partage par plusieurs consommateurs se fait en une instruction conditionnelle (UPDATE ... jsonb_set ... RETURNING) et la decision (completude) se prend sur l'etat renvoye. Corrige par ws-service#52.[^src-191c6e6a]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-11-04 - Un drapeau booleen de config lu depuis l'environnement

- **Type :** pitfall
- **Leçon :** @volontariapp/config charge avec enableImplicitConversion : la variable d'environnement "false" devient true. Lire un booleen avec @Transform(booleanFlag('cle')) + @IsBoolean() (config/helpers/boolean-flag.helpers.ts, copie de worker-ranking), comme GEOCODING_ENABLED dans post-processor-event.[^src-2957ab4a]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-11-04 - Erreur d'infrastructure dans un post-processor : relancer, jamais avaler

- **Type :** rule
- **Leçon :** Depuis npm-packages@ec4945d3, BatchPostProcessor et SinglePostProcessor reconnaissent une erreur d'infrastructure (isInfrastructureError de @volontariapp/errors : base ou Redis injoignable, timeout) : pas d'ACK, pas de tentative comptee, pas de DLQ, le message reste pending et est relu apres claimIntervalMs. Un processor doit donc relancer ces erreurs ; un catch qui les avale acquitte le message et le perd.[^src-fbe43ef3]
- **Consigné par :** claude-code/agent

## 2026-11-04 - Creation et suppression d'une meme entite se croisent dans un post-processor

- **Type :** pitfall
- **Leçon :** Les groupes de consommateurs Created/Deleted d'un post-processor tournent en parallele (meme stream pour les users, deux streams pour posts et events) : une suppression peut etre appliquee avant la creation, qui recree un noeud orphelin (G3, G4). Remede de post-processor-social (tombstone.ts) : la suppression pose un marqueur Redis avant d'effacer, la creation verifie apres avoir cree et efface a nouveau. Toujours envoyer la confirmation de creation meme dans ce cas, sinon le gather ws-service reste PENDING et le reaper envoie un faux creation_failed.[^src-01a2dc3c]
- **Consigné par :** claude-code/agent

## 2026-11-04 - Saga event.deleted : un seul feedback attendu, cle EVENT_SOCIAL_DELETED

- **Type :** rule
- **Leçon :** event.deleted (domain-event postgres-event.repository.ts, target event:deleted) n'est consomme que par post-processor-social et ws-service (gather creator). ws-service attend une seule cle EVENT_SOCIAL_DELETED (event_social.deleted / event_social.deletion_failed sur WS_EVENT_DELETED_FEEDBACK), alignee par ws-service#50 et post-processors-runner#59 ; avant, les cles attendues (social_event.deleted_success, post_event.deleted_success) n'etaient emises par personne et le reaper fermait la saga en event.deletion_failed apres 60 s. Un post-processor ne doit pas avaler l'erreur d'insertion du feedback (sinon la saga expire en FAILED alors que l'effet est fait) : rethrow comme UserDeletedPostProcessor. Decision Lead Dev (2026-11-04) : les posts d'un event supprime sont detaches (eventId vide), via une methode domain-post et un feedback post a ajouter ensuite a expects.[^src-7746ea1d]
- **Consigné par :** claude-code/agent

## 2026-11-04 - Reaper du gather desactive en E2E

- **Type :** pitfall
- **Leçon :** Dans la stack E2E, ws-service tourne avec NODE_ENV=test, ce qui desactive le gather reaper : quand un runner qui doit renvoyer un feedback manque, le client ne recoit rien du tout (pas de *_failed). Un test WebSocket qui expire signifie donc souvent un runner absent de la stack ou une cle de feedback mal alignee (bug G1 : ws-service attend social_event.deleted_success, post-processor-social emet event_social.deleted).[^src-7746ea1d]
- **Consigné par :** claude-code/agent

## 2026-11-03 - Trigger domain-user : index.ts fait foi, pas le .sql

- **Type :** pitfall
- **Leçon :** Dans npm-packages/packages/domain-user/src/database/triggers/, la migration ms-user execute USERS_TRIGGER de index.ts (payload enveloppe dans after). users.trigger.sql est desynchronise (sans after). Modifier index.ts et aligner le .sql ; les post-processors lisent event.payload.after.[^src-b66d36a3]
- **Consigné par :** claude-code/agent

## 2026-11-03 - Le gather ws-service exige l'evenement declencheur sur son propre stream

- **Type :** pitfall
- **Leçon :** ws-service n'ouvre un gather que sur le stream de l'evenement declencheur (ex. Streams.USER_CREATED = user:created). Un feedback qui arrive sans gather ouvert est ignore (gather-state.service.ts : No active gather state, isComplete false) et aucune notification WebSocket ne part. L'emetteur doit donc cibler a la fois le stream du domaine et celui de l'evenement, comme user.deleted ([user:deleted, social:user, ...]). user.created ne ciblait que social:user : notification jamais recue, prouve en E2E local (echec sans le trigger corrige, succes avec).[^src-b571b8b4]
- **Consigné par :** claude-code/agent

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
[^src-7746ea1d]: ws-service/config/default.config.json
[^src-b571b8b4]: ws-service/src/core/services/gather-state.service.ts
[^src-b66d36a3]: npm-packages/packages/domain-user/src/database/triggers/index.ts
[^src-01a2dc3c]: https://github.com/Volontariapp/post-processors-runner/pull/63
[^src-fbe43ef3]: npm-packages/packages/post-processors/src/core/processors/base.post-processor.ts
[^src-2957ab4a]: https://github.com/Volontariapp/post-processors-runner/pull/64
[^src-191c6e6a]: https://github.com/Volontariapp/ws-service/pull/52
[^src-b324b54c]: nativapp/src/hooks/useNotificationHandlers.ts
[^src-ce24b10c]: ws-service/src/post-processors/jobs/job-outbox-success.post-processor.ts
[^src-7386448c]: post-processors-runner/post-processor-user/src/core/services/badge-evaluator.service.ts
[^src-6047c95e]: post-processors-runner/post-processor-user/src/core/clients/post-author.resolver.ts
[^src-faf8fc8a]: post-processors-runner/post-processor-user/src/config/custom-config.ts
[^src-fe4a226a]: AGENT.md
[^src-4ee0f4b9]: npm-packages/packages/domain-social/src/services/participation.service.ts
[^src-61545c8a]: ws-service/package.json
