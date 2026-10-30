---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-api-gateway, du plus récent au plus ancien."
tags: [lessons, volontariapp-api-gateway]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:54:04Z"
sources:
  - id: src-56a989ad
    resource: npm-packages/packages/contracts/src/gateway/post/request/post.request.ts
    title: npm-packages/packages/contracts/src/gateway/post/request/post.request.ts
  - id: src-19b99ae6
    resource: api-gateway/src/modules/storage/common/storage-grpc-errors.ts
    title: api-gateway/src/modules/storage/common/storage-grpc-errors.ts
  - id: src-f8351f3e
    resource: api-gateway/scripts/check-dto-architecture.ts
    title: api-gateway/scripts/check-dto-architecture.ts
  - id: src-4b588a55
    resource: npm-packages/packages/contracts-nest/src/grpc.helpers.ts
    title: npm-packages/packages/contracts-nest/src/grpc.helpers.ts
  - id: src-f7793da4
    resource: api-gateway/src/modules/user/dto/request/update-user.request.dto.ts
    title: api-gateway/src/modules/user/dto/request/update-user.request.dto.ts
  - id: src-1621f3ee
    resource: api-gateway/src/modules/storage/public-file-url.service.ts
    title: api-gateway/src/modules/storage/public-file-url.service.ts
  - id: src-93be79ac
    resource: api-gateway/src/config/base-config.ts
    title: api-gateway/src/config/base-config.ts
  - id: src-873fb5db
    resource: api-gateway/src/modules/post/dto/common/post.dto.ts
    title: api-gateway/src/modules/post/dto/common/post.dto.ts
  - id: src-64ff0419
    resource: api-gateway/src/modules/post/dto/common/post-media.dto.ts
    title: api-gateway/src/modules/post/dto/common/post-media.dto.ts
  - id: src-7d7d341e
    resource: api-gateway/src/modules/event/dto/common/event.dto.ts
    title: api-gateway/src/modules/event/dto/common/event.dto.ts
---

# Leçons

## 2026-10-30 - DTO de reponse: implements du contrat obligatoire (check-arch)

- **Type :** pitfall
- **Leçon :** Le job CI Architecture Check (scripts/check-dto-architecture.ts) exige pour chaque DTO de reponse un import de @volontariapp/contracts et un 'implements X {'. Convertir Timestamp en Date en retirant implements fait echouer la CI et saute ci, ci-docker et e2e. Garder implements sur un type Omit du contrat et convertir dans un from() (modele: event.dto.ts, GrpcDateMapper.toDate).[^src-f8351f3e]
- **Consigné par :** claude

## 2026-10-17 - Photo d'evenement: coverUrl calculee seulement si READY

- **Type :** rule
- **Leçon :** EventResponseDTO.fromResponse(event, urls) prend un EventCoverUrlBuilder (PublicFileUrlService.forEventCover, EVENT_COVER). Le statut arrive sous son nom ('COVER_STATUS_READY', enums: String) : toCoverStatusWeb accepte les deux formes et renvoie NONE/PENDING/READY/REJECTED. coverUrl n'est calculee que pour READY avec un coverFileId, sinon absente. Tout appelant de EventDTO.fromResponse (events, post embarquant son event) doit passer les urls. coverFileId (IsUUID) et idempotencyKey (IsNotEmpty) sont valides sur la creation.[^src-7d7d341e]
- **Consigné par :** claude-code/agent

## 2026-10-16 - Les enums gRPC arrivent en NOMS dans la gateway (enums: String), pas en nombres

- **Type :** pitfall
- **Leçon :** getGrpcOptions (contracts-nest, grpc.helpers.ts) charge les protos avec enums: String et la gateway l'utilise pour tous ses clients (grpc-client.options.ts). A l'execution, un champ enum d'une reponse gRPC est donc une chaine ('POST_MEDIA_STATUS_READY'), meme si les types generes le declarent numerique. Un switch ou une comparaison sur PostMediaStatus.POST_MEDIA_STATUS_READY (nombre) ne matche jamais et retombe sur le defaut : le statut de media valait toujours NONE et media[].url n'etait jamais calculee, alors que les tests unitaires, ecrits avec des enums numeriques, passaient. Regle: tout mapping d'enum cote gateway accepte les deux formes (PostMediaStatus | keyof typeof PostMediaStatus), et les tests couvrent la forme en noms (PostFactory.createWirePost). Meme piege deja note cote nativapp pour ScanStatus (storage-status.ts). Les types PostOnWire et les entrees des DTO de reponse portent cette realite.[^src-64ff0419]
- **Consigné par :** claude-code/agent

## 2026-10-16 - URL des medias de post: PostMediaUrlBuilder, PostDTO.fromPost, URL seulement si READY

- **Type :** rule
- **Leçon :** PostDTO.fromPost(post, urls, event?) est la fabrique unique des reponses create, update, get et list (PostResponseDTO, GetPostResponseDTO, ListPostsResponseDTO lui deleguent) et recoit un PostMediaUrlBuilder; BasePostGrpcController injecte PublicFileUrlService comme BaseUserGrpcController, les controleurs passent this.publicFileUrls. PublicFileUrlService.forPostMedia utilise EntityType.POST (sortie {base}/post/{fileId}.webp) via un build prive partage avec forUserAvatar. media[].url n'est calculee que si mediaStatus vaut READY: le builder n'est meme pas appele pour PENDING, REJECTED ou NONE. Le statut proto (PostMediaStatus) est converti en chaine PostMediaStatusWeb (UNSPECIFIED devient NONE) et media est trie par position. Les champs contract PostWeb.media et mediaStatus viennent de @volontariapp/contracts >= 4.7.0. Piege de test: un champ de classe url? est une propriete propre valant undefined, donc not.toHaveProperty echoue; asserter sur JSON.parse(JSON.stringify(dto)), qui est ce que recoit le client. MAX_FILES_PER_POST = 10 est une constante locale car domain-storage n'exporte pas de sous-chemin policies; ms-storage reste l'autorite (maxPerEntity POST). Le e2e de la gateway n'a aucun flux de stockage, le cas READY avec fichier reel n'y est pas couvert.[^src-873fb5db]
- **Consigné par :** claude-code/agent

## 2026-10-16 - storage.publicBaseUrl: valeur locale uniquement, jamais dans default ou production

- **Type :** pitfall
- **Leçon :** La config gateway est fusionnee en profondeur (default, environnement, variables). storage.publicBaseUrl (env S3_PUBLIC_BASE_URL, optionnel) est place dans local, development et test seulement: dans default.config.json il s'appliquerait aussi en production et produirait des URLs localhost silencieuses. Sans la variable, la gateway demarre et avatarUrl est omise avec un avertissement. A declarer cote deploy pour l'image gateway (non verifie dans le checkout local de deploy).[^src-93be79ac]
- **Consigné par :** claude-code/agent

## 2026-10-16 - Exposer une URL de fichier public: UserAvatarUrlBuilder et PublicFileUrlService

- **Type :** rule
- **Leçon :** Les DTO de reponse utilisateur sont des fabriques statiques sans acces a la config: UserDTO.fromUser(user, avatarUrls) et UserPublicDTO.fromUserPublic(user, avatarUrls) recoivent un UserAvatarUrlBuilder, et chaque controleur passe this.publicFileUrls (PublicFileUrlService, module global PublicFileUrlModule). Six controleurs appellent ces DTO dont relationship.query-controller du module social. Le service calcule l'URL avec buildPublicFileUrl (@volontariapp/domain-storage >= 0.12.0, sous-chemins /enums et /helpers), sans appel reseau, et omet l'URL avec un warn si la config manque ou si le fileId est invalide, pour ne jamais casser une reponse. Reutilisable pour les medias de post et la cover d'evenement.[^src-1621f3ee]
- **Consigné par :** claude-code/agent

## 2026-10-16 - avatarFileId se relaie par UpdateUserRequestDTO.toCommand

- **Type :** rule
- **Leçon :** Un champ du contrat UpdateUserCommand n'atteint ms-user que s'il est declare dans UpdateUserRequestDTO ET copie dans toCommand(): la gateway ne fait aucun passe-plat. avatarFileId y est valide par @IsOptional() et @IsUUID('4'). Tester en espionnant userService.updateUser du client gRPC mocke, avec la factory src/test/helpers/factories/user.factory.ts.[^src-f7793da4]
- **Consigné par :** claude-code/agent

## 2026-10-16 - domain-storage: la racine ne se charge pas dans la gateway, seul /helpers

- **Type :** pitfall
- **Leçon :** Dans api-gateway, import('@volontariapp/domain-storage') echoue (ERR_MODULE_NOT_FOUND @nestjs/typeorm) car la racine exporte les modeles et repositories typeorm. Le sous-chemin @volontariapp/domain-storage/helpers se charge mais n'exporte que buildPublicFileUrl, buildPublicObjectKey et buildQuarantineObjectKey, pas l'enum EntityType que ces fonctions attendent. Calculer une URL publique (avatarUrl, medias de post, cover d'evenement) exige donc un export de EntityType depuis /helpers ou un sous-chemin ./enums dans npm-packages (regle du STOP), sans cast ni dependance a @nestjs/typeorm. L'ajout du package cree aussi des doublons de errors et shared dans node_modules.[^src-f7793da4]
- **Consigné par :** claude-code/agent

## 2026-10-16 - La gateway renvoie les enums gRPC en noms, les types de contracts les declarent numeriques

- **Type :** pitfall
- **Leçon :** Le loader gRPC de contracts-nest (getGrpcOptions, loader enums: String) fait que les reponses REST de api-gateway portent les enums sous forme de chaines ('SCAN_STATUS_CLEAN'), alors que les types de @volontariapp/contracts les declarent numeriques (ScanStatus.SCAN_STATUS_CLEAN = 3). Cote front, ne jamais comparer a la valeur numerique seule : accepter les deux formes (voir EventDetailScreen et describeFileInfo dans nativapp/src/screens/debug/storage-debug.constants.ts). Les requetes, elles, acceptent les nombres (entityType: 2). Constate sur le test de bout en bout du stockage (ticket 5.1).[^src-4b588a55]
- **Consigné par :** claude-code/sonnet-5-5

## 2026-10-16 - check-arch: un seul export class par fichier dto, nom derive du fichier

- **Type :** rule
- **Leçon :** yarn check-arch (api-gateway/scripts/check-dto-architecture.ts, requis par la CI) impose dans src/**/dto/ : fichier en *.request.dto.ts ou *.response.dto.ts, exactement un export class, nom egal au nom de fichier en PascalCase + RequestDTO/ResponseDTO (get-file-metadata.response.dto.ts donne GetFileMetadataResponseDTO), requests avec implements + import de @volontariapp/contracts + toCommand()/toQuery(), responses avec implements. Les DTO imbriques (ex. FileMetadataDTO, PostDTO) vont dans dto/common/, dossier exempte. Lancer yarn check-arch avant de pousser.[^src-f8351f3e]
- **Consigné par :** claude-code/sonnet-5-5

## 2026-10-16 - Brancher un nouveau microservice: msXxxUrl, erreurs gRPC brutes et 503

- **Type :** pitfall
- **Leçon :** MSURLsConfig de @volontariapp/config n'a pas msStorageUrl: etendre localement (ExtendedMSURLsConfig dans src/config/base-config.ts, comme ms-storage) plus config/*.json, custom-env-vars.json et la variable dans deploy. Le GlobalExceptionFilter relaie les BaseApiError (statusCode) mais transforme un gRPC UNAVAILABLE ou DEADLINE_EXCEEDED brut en 500: mapper en ServiceUnavailableException (503) avec src/modules/storage/common/storage-grpc-errors.ts. FILE_NOT_FOUND vient de @volontariapp/errors-nest >= 0.14.0.[^src-19b99ae6]
- **Consigné par :** claude-code/sonnet-5-5

## 2026-10-16 - Les DTO de requete gateway implementent des Request partagees de @volontariapp/contracts

- **Type :** pitfall
- **Leçon :** Chaque DTO de requete de api-gateway fait implements <X>Request importe de @volontariapp/contracts (npm-packages/packages/contracts/src/gateway/<domaine>/request), type partage avec le front nativapp. Avant d'ajouter un module gateway, verifier que gateway/<domaine>/request et response existent dans contracts; sinon les creer d'abord dans npm-packages, ce qui declenche la regle du STOP (changeset, PR, publication CI) avant tout code dans api-gateway. Le module storage n'y figurait pas (ticket 3.9).[^src-56a989ad]
- **Consigné par :** human:victor

## 2026-10-07 - Les DTO de mise a jour heritent des champs de creation

- **Type :** rule
- **Leçon :** UpdateEventRequestDTO et UpdatePostRequestDTO etendent PartialType(OmitType(CreateXRequestDTO)). Tout champ ajoute au DTO de creation (idempotencyKey, coverFileId, fileIds) se retrouve dans la mise a jour, et pour les events il entre dans updateMask (cles definies de this) donc le PATCH est rejete par ms-event. Ajouter ces champs a la liste d'OmitType des DTO de mise a jour. Les factories e2e doivent poser idempotencyKey (event, post, badge) : ms-user, ms-event et ms-post la valident cote microservice, pas le gateway.
- **Consigné par :** claude-code/agent

## 2026-10-07 - Le contrat REST impose idempotencyKey au client

- **Type :** rule
- **Leçon :** Les interfaces REST de @volontariapp/contracts (gateway/*) etendent les commandes gRPC : CreateEventRequest, CreatePostRequest (avec fileIds) et CreateBadgeRequest exigent idempotencyKey, avec coverFileId / iconFileId optionnels, et EventResponseDTO expose coverStatus. Un bump de contracts casse donc le build du gateway et l'API REST tant que nativapp n'envoie pas idempotencyKey. Seed et factories e2e utilisent randomUUID().
- **Consigné par :** claude-code/agent

## 2026-10-06 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : api-gateway/src/**.
- **Consigné par :** claude-code/claude-opus-5-5

[^src-56a989ad]: npm-packages/packages/contracts/src/gateway/post/request/post.request.ts
[^src-19b99ae6]: api-gateway/src/modules/storage/common/storage-grpc-errors.ts
[^src-f8351f3e]: api-gateway/scripts/check-dto-architecture.ts
[^src-4b588a55]: npm-packages/packages/contracts-nest/src/grpc.helpers.ts
[^src-f7793da4]: api-gateway/src/modules/user/dto/request/update-user.request.dto.ts
[^src-1621f3ee]: api-gateway/src/modules/storage/public-file-url.service.ts
[^src-93be79ac]: api-gateway/src/config/base-config.ts
[^src-873fb5db]: api-gateway/src/modules/post/dto/common/post.dto.ts
[^src-64ff0419]: api-gateway/src/modules/post/dto/common/post-media.dto.ts
[^src-7d7d341e]: api-gateway/src/modules/event/dto/common/event.dto.ts
