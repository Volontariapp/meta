---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-grpc-microservice, du plus récent au plus ancien."
tags: [lessons, volontariapp-grpc-microservice]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:54:04Z"
sources:
  - id: src-8d7f15d6
    resource: npm-packages/packages/errors/src/exceptions/unprocessable-entity.error.ts
    title: npm-packages/packages/errors/src/exceptions/unprocessable-entity.error.ts
  - id: src-7efaf3d0
    resource: ms-social/src/modules/participation/controllers/participation.query.controller.ts
    title: ms-social/src/modules/participation/controllers/participation.query.controller.ts
  - id: src-855ad96a
    resource: ms-post/src/modules/post/transformers/post.transformer.ts
    title: ms-post/src/modules/post/transformers/post.transformer.ts
  - id: src-c5886b21
    resource: npm-packages/packages/domain-event/src/services/event.service.ts
    title: npm-packages/packages/domain-event/src/services/event.service.ts
  - id: src-8fc3ad1d
    resource: ms-event/src/modules/event/controllers/commands/base.command.controller.ts
    title: ms-event/src/modules/event/controllers/commands/base.command.controller.ts
  - id: src-300927cf
    resource: ms-event/src/test/unit/controllers/event.command.controller.unit.spec.ts
    title: ms-event/src/test/unit/controllers/event.command.controller.unit.spec.ts
  - id: src-06c83ce2
    resource: ms-user/src/common/dto/pagination.dto.ts
    title: ms-user/src/common/dto/pagination.dto.ts
  - id: src-80c5990f
    resource: ms-post/src/modules/post/dto/common/pagination.dto.ts
    title: ms-post/src/modules/post/dto/common/pagination.dto.ts
  - id: src-89ada337
    resource: ms-social/src/providers/database/neo4j-schema.initializer.ts
    title: ms-social/src/providers/database/neo4j-schema.initializer.ts
  - id: src-01460755
    resource: "https://github.com/Volontariapp/ms-event/pull/89"
    title: "https://github.com/Volontariapp/ms-event/pull/89"
---

# Leçons

## 2026-11-05 - Le build Docker compile les tests : verifier avec tsc -p tsconfig.json, pas seulement yarn build

- **Type :** pitfall
- **Leçon :** yarn build (nest build, tsconfig.build.json) exclut les specs, mais le build Docker de ms-event les compile : un mock sans types (jest.fn<() => ...>) lu par mock.calls[0] a casse ci-docker (TS2493) alors que build, lint et tests passaient en local. Lancer npx tsc --noEmit -p tsconfig.json avant de pousser, et typer les mocks avec la signature reelle (jest.Mock<(params: SearchAdvancedVO) => Promise<...>>) ou asserter avec toHaveBeenCalledWith.[^src-01460755]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-11-04 - ms-social crée des contraintes d'unicité Neo4j au démarrage

- **Type :** decision
- **Leçon :** Le commit ms-social@0ea68bf (#60) ajoute neo4j-schema.initializer.ts, branché dans database.module.ts : au démarrage il crée des contraintes d'unicité sur les ids des noeuds sociaux, et journalise un avertissement quand elles sont ignorées faute de connexion Neo4j (d'après le message du commit ; code non relu ce jour). Inférence, non vérifiée : un nouveau domaine Neo4j voudra probablement la même initialisation.[^src-89ada337]
- **Consigné par :** claude-code/agent

## 2026-11-04 - Le plafond MAX_PAGINATION_LIMIT n'est plus 1000 partout

- **Type :** pitfall
- **Leçon :** Relevé le 2026-11-04 : ms-post (#69) et ms-event (#83) ont abaissé MAX_PAGINATION_LIMIT de 1000 à 100 ; ms-user et ms-social sont encore à 1000 ; ms-ranking et ms-storage non trouvés avec ce motif. La leçon du 2026-11-03 qui dit 'quatre ms plafonnent à 1000' est donc périmée pour ms-post et ms-event. Lire la constante du service avant de s'appuyer sur une valeur.[^src-80c5990f]
- **Consigné par :** claude-code/agent

## 2026-11-03 - Pagination : la leçon ListPosts sans tri ni plafond est périmée

- **Type :** rule
- **Leçon :** Depuis le lot pagination de novembre 2026, ListPosts et ListComments (domain-post 3.10.0) trient par createdAt DESC puis id DESC, la branche auteur=lecteur passe un ordre explicite, BaseRepository.paginate (database 3.12.0) borne page et limit et trie sur la cle primaire par defaut, et les DTO de pagination des quatre ms plafonnent limit a 1000 (la gateway ecrete a 100). Deux index existent (comments postId+createdAt, posts createdAt) mais sans EXPLAIN, et sans CONCURRENTLY. Regle: valider pagination avec PaginationRequestDTO, jamais @IsOptional seul; lectures par lot via findByIds par lots de 100 en conservant l ordre d entree.[^src-06c83ce2]
- **Consigné par :** claude-code/agent

## 2026-10-17 - Tests d'entite: toHaveProperty echoue sur un champ de classe undefined

- **Type :** pitfall
- **Leçon :** Une entite de domain-* (classe) declare ses champs comme proprietes propres: un champ non renseigne existe avec la valeur undefined. expect(entity).not.toHaveProperty('x') echoue alors (Received value: undefined). Asserter la valeur: expect(entity.x).toBeUndefined(), ou la forme serialisee JSON.stringify. Constate sur ms-event (ticket 5.9, CI).[^src-300927cf]
- **Consigné par :** claude-code/agent

## 2026-10-13 - withFallback ms-event: 403 sans job, extraPayload pour les droits au replay

- **Type :** rule
- **Leçon :** Dans ms-event, withFallback court-circuite aussi 403 (test: un ForbiddenError ne cree plus de job) et accepte extraPayload type Omit<JobRegistry[K], userId|payload> pour stocker des champs en plus de userId (userRole pour FALLBACK_DELETE_EVENT). Le controleur ramene un role inconnu a VOLUNTEER, jamais a undefined, pour garder le controle de propriete.[^src-8fc3ad1d]
- **Consigné par :** claude-code/agent

## 2026-10-13 - Le controle de propriete vit dans le service de domaine, acteur obligatoire

- **Type :** rule
- **Leçon :** Toute commande de suppression ou de modification exposee par un RPC doit verifier organisateur/auteur ou ADMIN dans le service domain-* (PostService.delete, EventService.delete), avec actorId et actorRole obligatoires et non optionnels : un parametre optionnel saute silencieusement le controle. Le contrôleur gRPC passe user.id et user.role. Les handlers fallback des workers appellent le meme service et doivent donc recevoir l'acteur dans le payload du job.[^src-c5886b21]
- **Consigné par :** claude-code/agent

## 2026-10-11 - ms-post: ListPosts sans tri ni plafond, mediaStatus jamais renseigne

- **Type :** pitfall
- **Leçon :** PostgresPostRepository.listPaginated appelle paginate({page,limit},{where}) sans ordre; defaut page 1 limit 10, aucun plafond, aucun index sur authorId ni createdAt (colonnes camelCase, timestamp sans fuseau). PostTransformer.toPostDTO ne renseigne ni media ni mediaStatus (UNSPECIFIED), donc un filtre sur NONE/READY exclurait tout. eventId n'est pas une colonne: il est resolu via ms-social si un jeton est transmis. Verifie en session le 2026-10-11.[^src-855ad96a]
- **Consigné par :** claude-code/agent

## 2026-10-11 - Les RPC Admin* n'ont aucun controle de role

- **Type :** pitfall
- **Leçon :** Dans ms-social, les handlers adminGetUser* (participation.query.controller.ts) n'ont ni UseGuards ni verification de role; seul le GrpcInternalGuard global verifie la signature du jeton interne et pose user. ms-event est identique. Un jeton interne valide de n'importe quel role peut donc appeler une RPC Admin* avec un userId arbitraire. Ne pas presenter le role ADMIN du jeton d'un service comme une protection. A signaler au Lead Dev. Verifie en session le 2026-10-11.[^src-7efaf3d0]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Code gRPC d'une erreur de domaine : etendre BaseApiError, pas de mapping par code

- **Type :** rule
- **Leçon :** Le filtre global (GlobalExceptionFilter de errors-nest) renvoie exception.grpcCode tel quel pour toute BaseApiError : il n'existe aucun mapping par code metier dans les services. Les classes du package errors fixent leur grpcCode (UnprocessableEntityError donne INVALID_ARGUMENT, avec statusCode 422). Pour un autre code gRPC (par ex. FAILED_PRECONDITION pour un rattachement refuse), etendre directement BaseApiError en declarant statusCode et grpcCode (GrpcStatus est exporte par @volontariapp/errors), comme FileAttachmentRefusedException dans domain-storage. Ne pas compter sur ms-* pour remapper.[^src-8d7f15d6]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : ms-user/src/**, ms-event/src/**, ms-post/src/**, ms-social/src/**, sync-migrations.sh.
- **Consigné par :** claude-code/claude-opus-5-5

[^src-8d7f15d6]: npm-packages/packages/errors/src/exceptions/unprocessable-entity.error.ts
[^src-7efaf3d0]: ms-social/src/modules/participation/controllers/participation.query.controller.ts
[^src-855ad96a]: ms-post/src/modules/post/transformers/post.transformer.ts
[^src-c5886b21]: npm-packages/packages/domain-event/src/services/event.service.ts
[^src-8fc3ad1d]: ms-event/src/modules/event/controllers/commands/base.command.controller.ts
[^src-300927cf]: ms-event/src/test/unit/controllers/event.command.controller.unit.spec.ts
[^src-06c83ce2]: ms-user/src/common/dto/pagination.dto.ts
[^src-80c5990f]: ms-post/src/modules/post/dto/common/pagination.dto.ts
[^src-89ada337]: ms-social/src/providers/database/neo4j-schema.initializer.ts
[^src-01460755]: https://github.com/Volontariapp/ms-event/pull/89
