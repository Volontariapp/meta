---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-file-storage-flow, du plus récent au plus ancien."
tags: [lessons, volontariapp-file-storage-flow]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-07T08:42:02Z"
sources:
  - id: src-3aa1bf0d
    resource: ci-tools/scripts/init-buckets.sh
    title: ci-tools/scripts/init-buckets.sh
  - id: src-a764acb3
    resource: ms-event/src/modules/event/storage-client-config.module.ts
    title: ms-event/src/modules/event/storage-client-config.module.ts
  - id: src-72fc2346
    resource: npm-packages/packages/storage-client/src/services/storage-client.service.ts
    title: npm-packages/packages/storage-client/src/services/storage-client.service.ts
  - id: src-83b1d550
    resource: ms-post/src/modules/post/controllers/post.command.controller.ts
    title: ms-post/src/modules/post/controllers/post.command.controller.ts
  - id: src-02475a1a
    resource: ms-post/src/modules/post/controllers/post.query.controller.ts
    title: ms-post/src/modules/post/controllers/post.query.controller.ts
  - id: src-64ff0419
    resource: api-gateway/src/modules/post/dto/common/post-media.dto.ts
    title: api-gateway/src/modules/post/dto/common/post-media.dto.ts
  - id: src-aa248434
    resource: ms-event/src/modules/event/controllers/commands/event.command.controller.ts
    title: ms-event/src/modules/event/controllers/commands/event.command.controller.ts
---

# Leçons

## 2026-10-17 - ms-event: jeton interne et statut de scan en nom d'enum

- **Type :** pitfall
- **Leçon :** Dans ms-event comme dans ms-post, l'appel ConfirmFileAttachment doit recevoir le x-internal-token (@InternalToken() puis { internalToken } en options du client storage), sinon ms-storage repond UNAUTHENTICATED. Le statut de scan arrive sous son nom ('SCAN_STATUS_CLEAN', enums: String) : comparer aux deux formes. La photo d'un event ne passe que par EventService.updateCover (champ coverFileId dans update_mask, camelCase) ; le update generique ne doit jamais l'ecrire.[^src-aa248434]
- **Consigné par :** claude-code/agent

## 2026-10-16 - ms-post: le statut de scan de ms-storage arrive en NOM d'enum, sinon tout post avec image reste PENDING

- **Type :** pitfall
- **Leçon :** Le client gRPC de ms-storage (storage-client, getGrpcOptions) charge les protos avec enums: String : files[].scanStatus de ConfirmFileAttachment arrive en nom ('SCAN_STATUS_CLEAN'). mapScanStatus de ms-post ne comparait que des nombres et retombait sur AWAITING_UPLOAD : post_media.scan_status valait AWAITING_UPLOAD et posts.media_status PENDING alors que le fichier etait CLEAN et RESERVED dans ms-storage (SYNC pipeline succeeded dans les logs). Constate sur le cluster : aucun post READY dans la base, les deux posts de test PENDING. Les tests existants n'assertaient que media_status != NONE et utilisaient des nombres. Regle: tout mapping d'enum recu d'un client gRPC accepte nombre et nom, et le test assert la valeur transmise au domaine (fileScanStatuses), avec PostCommandFactory.createConfirmResponseOnWire. Diagnostic sans toucher aux donnees: kubectl exec dans ms-post-db-postgresql-0 avec PGPASSWORD depuis la variable POSTGRES_PASSWORD du pod, psql en SELECT sur posts.media_status et post_media.scan_status, a comparer a files.scan_status cote ms-storage. Les fichiers restent RESERVED (attached_at nul) apres le rattachement: ce qui les passe en ATTACHED n'a pas ete determine.[^src-83b1d550]
- **Consigné par :** claude-code/agent

## 2026-10-16 - Livrer un champ de bout en bout: lire la reponse reelle, pas seulement les types declares

- **Type :** rule
- **Leçon :** Le champ media[].url d'un post a ete livre avec des tests unitaires verts et n'a jamais fonctionne : la gateway recoit les enums gRPC en noms (enums: String) alors que les types generes les declarent numeriques, et les tests utilisaient des nombres. Pour tout champ calcule qui traverse ms-* puis la gateway puis nativapp (media[].url, mediaStatus, avatarUrl), ne pas conclure sur les seuls tests unitaires : apres deploiement, lire une reponse reelle de GET /posts?authorId= et verifier la valeur du champ, et verifier cote cluster (kubectl -n prod logs du service, HEAD sur l'URL publique du fichier) avant de dire que ca marche. Les tests doivent construire l'entree sous la forme recue a l'execution (PostFactory.createWirePost cote gateway), pas la forme des types. Un symptome visible cote app (image de remplacement affichee a la place de l'image envoyee) pointe d'abord vers le champ absent de la reponse, pas vers l'ecran.[^src-64ff0419]
- **Consigné par :** claude-code/agent

## 2026-10-16 - Un auteur doit lire ses propres posts PENDING: ms-post transmet readerId au domaine

- **Type :** rule
- **Leçon :** Le repository domain-post cache les posts dont media_status n'est ni NONE ni READY, sauf si readerId est l'auteur. getPost et listPosts de ms-post doivent donc lire l'utilisateur du token interne (@CurrentUser() renvoie undefined sans utilisateur, GrpcInternalGuard est un APP_GUARD qui renseigne user dans le contexte RPC) et passer user?.id : findById(id, readerId, relations) et listPosts(page, limit, authorId, readerId). Sans readerId, un post en traitement (image au dela de 1 Mo, ou ms-storage injoignable) disparait pour son auteur avec un 200 et une liste vide, contrairement a docs/stockage-fichiers/04-flux-post.md. Un appel sans utilisateur garde la vue publique. Corriger cote ms-post suffit: le domaine gere deja readerId, pas de changement dans npm-packages.[^src-02475a1a]
- **Consigné par :** claude-code/agent

## 2026-10-16 - Le garde 'failed to insert but was not found' de ms-post est actif, ne pas le supprimer

- **Type :** pitfall
- **Leçon :** domain-post createWithPostCreated leve un new Error simple ('failed to insert but was not found') quand ON CONFLICT DO NOTHING touche une autre contrainte (titre duplique) et qu'aucune ligne n'existe pour cet id. PostService.create l'enveloppe en DATABASE_ERROR (BaseError) dont le message contient toujours ce texte. Le garde isBaseError(error) && error.message.includes('failed to insert but was not found') du controleur ms-post est donc ACTIF et produit le 409 (POST_ALREADY_EXISTS). L'avoir juge mort en lisant seulement le repository a fait passer 3 e2e (post-errors, post-lifecycle) de 409 a 500 : verifier aussi la couche PostService avant de conclure. Un vrai reessai avec la meme idempotencyKey renvoie le post existant par le repository et ne passe pas par ce garde.
- **Consigné par :** claude-code/agent

## 2026-10-16 - ms-post transmet le token interne a ConfirmFileAttachment

- **Type :** rule
- **Leçon :** ms-storage applique GrpcInternalGuard en APP_GUARD: un appel confirmPostAttachment sans x-internal-token est rejete UNAUTHENTICATED puis releve en STORAGE_ATTACHMENT_FAILED, ce qui casserait chaque post avec image. Le controleur createPost recoit @InternalToken() et passe { internalToken } en troisieme argument. Utiliser isStorageUnavailable de @volontariapp/storage-client (>= 0.3.0) plutot qu'une copie locale.[^src-83b1d550]
- **Consigné par :** claude-code/agent

## 2026-10-16 - media_status NONE est truthy: ne jamais le passer avec des fileIds

- **Type :** pitfall
- **Leçon :** domain-post createWithPostCreated ne calcule READY, PENDING ou REJECTED que si media_status est falsy. PostMediaStatus.NONE vaut la chaine 'NONE', donc la passer avec des fileIds fige le post en NONE et le rend visible meme si un fichier est SCANNING ou REJECTED. ms-post ne passe NONE que sans fileIds, passe undefined sinon, et PENDING seulement quand ms-storage est indisponible. Les tests qui mockent postService.create ne le voient pas: asserter l'argument media_status transmis.[^src-83b1d550]
- **Consigné par :** claude-code/agent

## 2026-10-16 - Le client storage-client relaie les erreurs metier de ms-storage, pas les pannes de transport

- **Type :** pitfall
- **Leçon :** Depuis storage-client 0.3.0, les erreurs metier de ms-storage (FILE_NOT_FOUND 404, rattachement refuse 422) sont relayees avec leur statut et leur code (StorageRelayedError). Les pannes de transport gardent STORAGE_TIMEOUT et STORAGE_ATTACHMENT_FAILED (500, raison prefixee du nom du statut gRPC) : ms-post et ms-event s'en servent pour basculer en rattachement asynchrone via isStorageUnavailable. Un consommateur sans repli (avatar et badge de ms-user) leve StorageUnavailableError (503) quand isStorageUnavailable est vrai. Avant 0.3.0, un NOT_FOUND ou un FAILED_PRECONDITION devenait un 500.[^src-72fc2346]
- **Consigné par :** claude-code/sonnet-5-5

## 2026-10-14 - Résolution DI ClientsModule dans StorageClientModule.registerAsync

- **Type :** pitfall
- **Leçon :** StorageClientModule.registerAsync délègue à ClientsModule.registerAsync avec inject: [STORAGE_CLIENT_OPTIONS]. Comme ClientsModule est un module dynamique interne isolé sans extraProviders, il ne peut pas résoudre ce symbole sauf si un module fournissant et exportant STORAGE_CLIENT_OPTIONS est passé dans imports via StorageClientConfigModule avec useExisting: StorageClientConfigService.[^src-a764acb3]
- **Consigné par :** human:victoragahi

## 2026-10-07 - Test manuel local de ms-storage : ce qui est testable et ce qui ne l'est pas

- **Type :** rule
- **Leçon :** Procedure deduite des fichiers (scripts de ms-storage/package.json, ci-tools/docker-compose.yml, ci-tools/scripts/init-buckets.sh), non executee de bout en bout. Base jetable : docker run postgres:16-alpine sur 127.0.0.1:5437 (user/password, base ms_storage) ; jamais le port 5433 (tunnel SSH et base d'un autre projet) ; le conteneur postgres-storage de ci-tools garde d'anciennes donnees. MinIO : docker compose up -d minio dans ci-tools (ports 9000 et 9001, minioadmin / minioadminpassword), puis docker compose --profile migrations up minio-init cree les buckets volontariapp-public et volontariapp-private. Service : yarn migration:run:local puis yarn start:local dans ms-storage ; verifier les logs (gRPC 0.0.0.0:5006, HTTP 3006), curl localhost:3006/health (seul Postgres est controle), Swagger sur /api. Schema : psql \d files et \d released_entities (22 colonnes, 7 index dont 5 partiels). Seul upload reel possible : le test s3.service.int.spec.ts (PUT presigne) avec MinIO. Le repository PostgresFileRepository n'a aucun point d'entree (ms-storage n'enregistre aucun handler gRPC avant les tickets 3.4 et 3.6) : l'exercer par yarn test:integration dans packages/domain-storage, ou par un script dedie. Non testable : appels gRPC, scan antivirus (pas de clamd dans ci-tools), consommation des evenements de scan (StorageStream absent), routage Kubernetes (MS_STORAGE_URL absent de deploy). Jest peut planter sur watchman (Homebrew cassé) : ajouter --watchman=false.[^src-3aa1bf0d]
- **Consigné par :** claude-code/agent

[^src-3aa1bf0d]: ci-tools/scripts/init-buckets.sh
[^src-a764acb3]: ms-event/src/modules/event/storage-client-config.module.ts
[^src-72fc2346]: npm-packages/packages/storage-client/src/services/storage-client.service.ts
[^src-83b1d550]: ms-post/src/modules/post/controllers/post.command.controller.ts
[^src-02475a1a]: ms-post/src/modules/post/controllers/post.query.controller.ts
[^src-64ff0419]: api-gateway/src/modules/post/dto/common/post-media.dto.ts
[^src-aa248434]: ms-event/src/modules/event/controllers/commands/event.command.controller.ts
