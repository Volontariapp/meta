---
name: volontariapp-file-storage-flow
description: "Playbook pour tout travail sur le stockage de fichiers (upload, scan, réservation, rattachement, nettoyage) - ms-storage, worker-storage, post-processor-storage, et rattachement d'une image à une entité métier (post, event, avatar, badge)."
type: Agent Skill
title: File Storage Flow
tags: [storage, upload, files]
status: stable
paths:
  - "docs/stockage-fichiers/**"
  - "npm-packages/packages/domain-storage/src/**"
  - "ms-storage/src/**"
mesh_keys:
  - storage
  - file_id
  - upload
  - confirmfileattachment
  - quarantine
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:22:12Z"
sources:
  - id: storage-docs
    resource: docs/stockage-fichiers
    title: Architecture du stockage de fichiers
  - id: domain-storage
    resource: npm-packages/packages/domain-storage/src
    title: "@volontariapp/domain-storage"
verified:
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T22:27:14Z"
    digest: 823ef71100fce341
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T22:31:08Z"
    digest: 823ef71100fce341
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T22:51:24Z"
    digest: 823ef71100fce341
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T22:53:46Z"
    digest: 823ef71100fce341
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T23:30:15Z"
    digest: 823ef71100fce341
---

# Playbook : Stockage de Fichiers

La référence d'architecture est `docs/stockage-fichiers/` (repo `Volontariapp/docs`). Ce playbook en est le résumé opérationnel. **Lis le document du flux concerné avant de coder.**

> [!IMPORTANT]
> **Statut au 2026-10-06 : architecture cible (RFC), presque rien n'est implémenté.** `ms-storage` démarre en hybride (gRPC sur `microServices.msStorageUrl`, `0.0.0.0:5006`, plus HTTP `/health` sur 3006, `GrpcInternalGuard` global) mais n'a encore aucun handler gRPC ; sa migration de production `ms-storage/src/migrations/domain/1791300000000-CreateFilesAndReleasedEntities.ts` crée `files` (7 index dont 5 partiels) et `released_entities` ; son test (`yarn test:migration`, opt-in via `MS_STORAGE_MIGRATION_TEST_DB_HOST`, base locale jetable qu'il vide) compare le schéma à `FileModel` ; sa configuration porte `s3.privateBucket`, `s3.publicEndpoint` (signature uniquement), `s3.publicBaseUrl` et `scanner.host` / `scanner.port` / `scanner.timeoutMs` (validés, variables `S3_PRIVATE_BUCKET`, `S3_PUBLIC_ENDPOINT`, `S3_PUBLIC_BASE_URL`, `SCANNER_*`), `S3Module` est importé dans `AppModule` mais `S3Service` ne signe pas encore avec `publicEndpoint` ni ne gère la quarantaine ; `domain-storage` (tickets 1.6 à 1.10, mergés sur `main` : 0.7.0 publiée, 0.8.0 en cours de publication) a les enums `ScanStatus` / `ValidationMode` / `RejectionReason`, `FileStatus.RESERVED`, `VALIDATION_POLICY_BY_ENTITY` et `resolveValidationMode` (SVG retiré) et les helpers purs `buildQuarantineObjectKey` / `buildPublicObjectKey` / `buildPublicFileUrl` (`src/helpers/`) et les modèles TypeORM `FileModel` (table `files`) et `ReleasedEntityModel` (table `released_entities`, colonnes en snake_case explicites, `src/models/`, sous-chemin `./models`), et un `PostgresFileRepository` partiel (sous-chemin `./repositories`, jamais réexporté par la racine, `src/repositories/`), refactoré en 0.9.0 sur le pattern de `domain-user` : `FileEntity` (classe pure `src/entities/`, exportée par la racine ; `FileEntity.create` porte les invariants : MIME autorisé, mode SYNC/ASYNC depuis la taille déclarée, clé de quarantaine, `uploadExpiresAt` = création (toujours l'heure courante, jamais fournie par l'appelant) + `presignedUrlTtlSeconds` (au plus `MAX_PRESIGNED_URL_TTL_SECONDS`, 7 jours, sinon `BadRequestError`) + 5 min) et `ReleasedEntityEntity`, `registerStorageMappings()` (`src/models/mapper.ts`, appelé à l'import du sous-chemin `./models`, enregistre aussi les paires outbox ; contrairement à `domain-post` et `domain-event`, qui l'appellent à l'import de leur racine, la racine de domain-storage ne doit pas charger typeorm ; `domain-user` laisse l'appel au consommateur), `IFileRepository` (renvoie des entités), `PostgresFileRepository extends BaseRepository<FileModel, FileEntity>` (`@Injectable`, constructeur `@InjectRepository(FileModel) Repository<FileModel>`, plus de `DataSource`), outbox écrite via `JobsOutboxRepository` / `EventQueueRepository` de `@volontariapp/outbox` sur `manager.getRepository(...)` de la transaction ; `typeorm` est résolu en deux copies (Yarn instancie un peer par jeu de peers) : le `tsconfig.json` de domain-storage mappe `typeorm` vers la copie hissée pour que `Repository` / `EntityManager` restent assignables à ceux de `database` / `outbox` (sans ça TS2345 "Property 'findOptions' is protected") ; le TS2589 invoqué avant n'a pas pu être reproduit. Méthodes : `createPending`, `confirmUpload`, `switchToAsync`, `resetToAwaitingUpload`, `completeScan`, `rejectScan`. Chaque transition est un `UPDATE ... RETURNING` conditionnel en READ COMMITTED, renvoie `null` / `false` si aucune ligne ne correspond, et écrit `jobs_outbox` (`storage.scan_file`) ou `event_queue` (`storage.file_scanned` / `storage.file_rejected`, seulement si la ligne est `ATTACHED`) dans la même transaction. Les tests d'intégration (`yarn test:integration`, base `postgres-storage` sur `localhost:5437`, qui fait un `dropDatabase()` : refusé hors hôte local) chargent la migration de test `src/test/migrations/domain/` puis les migrations communes copiées de domain-post (`src/test/migrations/common/`). **Limite connue** : `@volontariapp/shared` n'a pas encore d'enum `StorageStream`, donc les événements storage sont écrits avec `targetServices` vide (`FILE_SCAN_RESULT_TARGET_SERVICES`, `src/repositories/file-outbox.builders.ts`) : le pusher les ignore tant que la constante n'est pas renseignée. ATTENTION : avec `targetServices` vide, le pusher d'outbox saute la ligne sans erreur et le consommateur la marque `COMPLETED` : l'événement est perdu en silence et le média du post reste `PENDING`, donc ne pas brancher `completeScan` / `rejectScan` dans `ms-storage` ou `worker-storage` avant que `StorageStream` existe. `reserve` (ticket 1.10, domain-storage 0.8.0) existe : `reserve({ fileIds, entityType, entityId, ownerId })` dedoublonne, refuse au-dela de `maxPerEntity` (`TooManyFilesException`, ids distincts de l'appel, pas le cumul en base : un avatar remplace peut coexister avec l'ancien `ATTACHED`), verrouille en `SELECT ... FOR UPDATE ORDER BY id`, classe chaque fichier avec la regle pure `classifyFileForAttachment` (`src/policies/attachment-validation.rule.ts`, a reutiliser telle quelle dans `attachFromConfirmationEvent` : verdicts `RESERVE` / `ALREADY_HELD` / `NOT_FOUND` / `REFUSED` + `AttachmentRefusalReason`), puis un seul `UPDATE ... WHERE status = 'PENDING'` pour tout reserver ; tout ou rien, `FileNotFoundException` (404, prioritaire) ou `FileAttachmentRefusedException` (422, `code` `FILE_ATTACHMENT_REFUSED`, `details.reason` ; son `grpcCode` est FAILED_PRECONDITION : elle étend `BaseApiError` directement, car `UnprocessableEntityError` fixe INVALID_ARGUMENT et le filtre global renvoie `grpcCode` tel quel, il n'existe aucun mapping par `code`) ; aucun evenement ecrit. `attachFromConfirmationEvent`, `releaseForEntity`, `releaseFile`, `releaseForOwner` (ticket 1.11, domain-storage 0.10.0, PR en cours de publication) existent : `attachFromConfirmationEvent({ fileIds, entityType, entityId, ownerId })` tourne dans une transaction sous `pg_advisory_xact_lock(hashtext(entity_type:entity_id))` (verrou par entité, doc 11 P1) ; si l'entité a une pierre tombale, les fichiers nommés `PENDING` / `RESERVED` du propriétaire passent `ORPHANED` sans événement ; sinon `SELECT ... FOR UPDATE ORDER BY id`, classement par `classifyFileForConfirmation` (`src/policies/attachment-validation.rule.ts`, qui délègue à `classifyFileForAttachment` pour tout fichier que l'entité ne tient pas déjà ; un fichier déjà tenu par la même entité est jugé sur son statut seul : `RESERVED` à rattacher, `ATTACHED` rejeu, `ORPHANED` / `DELETED` libération arrivée avant), puis un seul `UPDATE ... RETURNING` vers `ATTACHED` ; un fichier rattaché dont le scan est terminal écrit `storage.file_scanned` / `storage.file_rejected`, un fichier refusé écrit `storage.attachment_rejected` (raisons `NOT_FOUND`, `WRONG_ENTITY_TYPE`, `NOT_CONFIRMED`, `CONTENT_REJECTED`, `ALREADY_ATTACHED`, via `toAttachmentRejectionReason`), un rejeu n'écrit rien ; résultat `FileAttachmentResult[]` (`FileAttachmentOutcome`) ; une pierre tombale ne produit pas de `attachment_rejected` (messaging 2.19.0 n'a pas `ENTITY_RELEASED`) ; un rejeu d'un refus réécrit un `attachment_rejected` (pas d'état pour dédupliquer). `releaseForEntity({ entityType, entityId })` écrit la pierre tombale (`ReleasedEntityEntity`, `ON CONFLICT DO NOTHING`) et passe `RESERVED` / `ATTACHED` de l'entité en `ORPHANED`, même verrou, aucun événement. `releaseFile({ fileId, entityType, entityId, ownerId?, newFileId? })` : un `UPDATE` conditionnel depuis `PENDING` (propriétaire obligatoire, `entity_id` renseigné), `RESERVED` ou `ATTACHED` (condition sur l'entité, propriétaire facultatif pour un événement sans propriétaire comme l'icône de badge, doc 11 P7), ignoré si `newFileId` est le même fichier. `releaseForOwner({ ownerId })` passe en `ORPHANED` tout `PENDING` / `RESERVED` / `ATTACHED` du propriétaire sauf `BADGE_ICON` (`OWNER_RELEASE_EXCLUDED_ENTITY_TYPES`), sans pierre tombale. Ces événements storage (`file_scanned`, `file_rejected` et désormais `attachment_rejected`) sont tous écrits avec `targetServices` vide tant que `StorageStream` n'existe pas : ne pas brancher ces méthodes dans `post-processor-storage` avant le ticket 1.14. `user.badge_created` ne porte pas de `userId` : le ticket 4.x doit décider du propriétaire. Aucune base `ms-storage` dans `deploy`. Le symbole `useUploadFile` **n'existe pas encore** : c'est un nom à créer. Toujours partir de `01-etat-des-lieux.md` et de `10-plan-implementation.md` (vagues, chacune terminée par la règle du STOP).

| Besoin | Document |
| :--- | :--- |
| État réel du code | `docs/stockage-fichiers/01-etat-des-lieux.md` |
| Responsabilités, packages, buckets, modes, pipeline, ids d'entité, visibilité | `docs/stockage-fichiers/02-architecture-cible.md` |
| `FileStatus`, `ScanStatus`, réservation, règle d'émission, commutativité | `docs/stockage-fichiers/03-cycle-de-vie-fichier.md` |
| Images d'un post (ASYNC) | `docs/stockage-fichiers/04-flux-post.md` |
| Photo d'un événement (ASYNC) | `docs/stockage-fichiers/05-flux-event.md` |
| Avatar et icône de badge (SYNC) | `docs/stockage-fichiers/06-flux-avatar.md` |
| Libération, suppression de compte, purge | `docs/stockage-fichiers/07-nettoyage-et-orphelins.md` |
| Proto, messaging, shared, domain-*, SQL, configuration | `docs/stockage-fichiers/08-contrats-et-evolutions.md` |
| Menaces, codes d'erreur | `docs/stockage-fichiers/09-securite.md` |
| Ordre des tickets | `docs/stockage-fichiers/10-plan-implementation.md` |
| Comportement en panne | `docs/stockage-fichiers/11-scenarios-de-panne.md` |

---

## Invariants (non négociables)

1. **Aucun octet de fichier ne transite par `api-gateway` ni par un `ms-*` métier.** Le client uploade directement sur S3 via un POST signé, signé avec `s3.publicEndpoint`.
2. **Tout upload arrive en quarantaine** (`volontariapp-private`, clé `quarantine/{fileId}`). Seule une version traitée (magic bytes, clamd, ré-encodage) est écrite dans le bucket public, qui n'autorise que `s3:GetObject` anonyme.
3. **Traitement SYNC par défaut, ASYNC si le fichier dépasse le seuil SYNC de son `EntityType` ou si le pipeline synchrone échoue techniquement.** Le mode vient de `domain-storage` (`resolveValidationMode`, taille déclarée), jamais du client. Avatar et badge : toujours SYNC, 503 sur erreur technique. SVG refusé.
4. **Les services métier stockent des `file_id`, jamais d'URL.** L'URL publique se calcule avec `buildPublicFileUrl` (`domain-storage`).
5. **`owner_id` vient de l'`INTERNAL_TOKEN`** (`CurrentUser`), jamais du payload. Le client storage partagé propage `x-internal-token` dans les `Metadata`.
6. **Rattachement synchrone par défaut : `ConfirmFileAttachment` (deadline 2 s), avant l'écriture de l'entité et avant tout `withFallback`.** Sur `UNAVAILABLE` / `DEADLINE_EXCEEDED` : post et event passent en rattachement asynchrone (entité écrite avec statut média `PENDING`, validation par `pp-storage`), avatar et badge répondent 503. Les erreurs `NOT_FOUND` / `FAILED_PRECONDITION` ne déclenchent jamais de fallback. Une politique SYNC exige `scan_status = CLEAN`, une politique ASYNC accepte `SCANNING`. `VerifyFilesExist` est déprécié.
7. **L'id d'entité est calculé avant l'écriture** : `UUID v5(ownerId, idempotencyKey)` à la création. Il est transporté dans les payloads de fallback. La création est idempotente : `INSERT ... ON CONFLICT (id) DO NOTHING`, sans réémettre l'événement de création si 0 ligne (jamais `manager.save`).
8. **L'événement de création ou de remplacement est écrit dans `event_queue` dans la même transaction que l'entité, avec les `fileIds` et le propriétaire.** C'est lui qui confirme le rattachement (`RESERVED` ou `PENDING` validé vers `ATTACHED`). La règle de validation est unique, dans `PostgresFileRepository`, partagée par `reserve` et `attachFromConfirmationEvent`.
9. **Rattachement depuis `RESERVED` (même entité) ou `PENDING` validé, libération par entité avec pierre tombale (`released_entities`), libération d'un fichier nommé depuis `PENDING` / `RESERVED` / `ATTACHED`, `ORPHANED` absorbant.** Jamais de condition de date sur le rattachement. Aucun `*_replaced` si le fichier ne change pas (`newFileId = oldFileId`).
10. **`storage.file_scanned` / `storage.file_rejected` ne sont émis que pour un fichier `ATTACHED` au `scan_status` terminal**, par la transition qui arrive en second (fin de traitement ou rattachement). Conditions : READ COMMITTED, un seul `UPDATE ... RETURNING` par transition, écriture `event_queue` dans la même transaction.
11. **Fin de traitement par `UPDATE` conditionnel** (`scan_status = 'SCANNING' AND status NOT IN ('ORPHANED','DELETED')`). Si 0 ligne, supprimer l'objet public écrit, sauf exécution en double d'un fichier toujours `CLEAN` et non libéré. En SYNC, une erreur technique remet le fichier en `AWAITING_UPLOAD` (échéance repoussée de 15 min) avant le 503. La purge relance un `SCANNING` bloqué une seule fois, via `rescan_scheduled_at`.
12. **Un post-processor métier qui ne trouve plus l'entité acquitte avec un log `warn`** : la règle d'émission garantit qu'elle existait, elle a donc été supprimée depuis.
13. **`FileStatus` et `ScanStatus` sont deux axes distincts. `media_status` / `cover_status` sont distincts de `saga_status`.**
14. **`ws-service` n'est jamais un maillon métier.**
15. **Persistance `files` dans `domain-storage`** (`FileModel`, `PostgresFileRepository`, `./repositories`), partagée par `ms-storage`, `worker-storage` et `post-processor-storage`. Le pipeline S3 / clamd / ré-encodage vit dans le package d'infrastructure storage.
16. **La table d'événements s'appelle `event_queue`**, pas `event_outbox`.

---

## Recette : rattacher une image à un nouveau type d'entité

Exemple : ajouter une image à une "organisation".

1. **`proto-registry`** (skill `volontariapp-proto-contract-evolution`) :
   - nouvelle valeur `EntityType` (additive) ;
   - numéros de champs fixés au-dessus du maximum actuel, `reserved` sur tout numéro supprimé sans réservation ;
   - `optional string <x>_file_id` dans l'entité, et dans la commande de création avec `string idempotency_key` ;
   - pour une mise à jour par `Entity` + `update_mask`, le champ va **uniquement** dans l'entité ;
   - statut média (enum préfixé, `_UNSPECIFIED = 0`) si le mode est ASYNC ;
   - **STOP**.
2. **`npm-packages`** (skill `volontariapp-shared-npm-package-change`) :
   - `domain-storage` : entrée dans `VALIDATION_POLICY_BY_ENTITY` (mode, taille, MIME, format, maximum par entité) et préfixe de clé publique ;
   - `messaging` : événements `<domaine>.<x>_replaced` `{ <entity>Id, newFileId?, oldFileId? }` et, si absents, `created` / `deleted` ; payloads de fallback avec l'id calculé ;
   - `shared` : streams correspondants ;
   - `domain-<x>` : id fourni à la création, colonne `<x>_file_id` (+ statut si ASYNC), écriture de l'entité et de l'événement dans la même transaction, lecture de l'ancien `file_id` sous `SELECT ... FOR UPDATE` lors d'un remplacement ;
   - **STOP**.
3. **Service métier** : calcul de l'id, appel `ConfirmFileAttachment` via le client storage partagé avant `withFallback`, statut initial selon le `scan_status` renvoyé. Décider si l'entité supporte le rattachement asynchrone (elle doit alors avoir un statut média) ou répond 503 quand `ms-storage` est indisponible.
4. **`post-processor-storage`** (skill `volontariapp-implement-async-event-flow`) : consommer création, remplacement, suppression et échec de saga de l'entité. Les échecs de saga (`*.creation_failed`) sont émis par `ws-service` sur les streams partagés `ws:*-created-feedback` : filtrer par type.
5. **Si l'entité a un statut média** : le post-processor du domaine consomme `storage.file_scanned` / `storage.file_rejected` / `storage.attachment_rejected`, filtre sur `entityType`, ignore les `fileId` qui ne sont plus courants, met à jour le statut de façon idempotente, acquitte avec `warn` si l'entité a été supprimée.
6. **`api-gateway`** : relayer `<x>FileId` et `idempotencyKey`, exposer l'URL calculée par `buildPublicFileUrl`.
7. **`nativapp`** : réutiliser `useUploadFile(entityType)`, générer une `idempotencyKey` par formulaire, gérer `SCANNING` / `REJECTED` si ASYNC.
8. **Suppression de compte** : décider si les fichiers de ce type sont libérés par `user.deleted` (par défaut oui, sauf ressources de la plateforme comme `BADGE_ICON`).

---

## Checklist de revue

- [ ] Aucun `any`, aucun `as unknown as`, aucun cast sur les erreurs gRPC (type guard dans le client storage partagé).
- [ ] Aucune duplication du pipeline entre `ms-storage` (SYNC) et `worker-storage` (ASYNC), ni de la persistance `files`.
- [ ] Codes d'erreur conformes à `09-securite.md` (aucun 500 pour un fichier invalide, `NOT_FOUND` pour le fichier d'un autre).
- [ ] Toute transition est un `UPDATE` conditionnel, idempotent et loggé via `@volontariapp/logger`.
- [ ] Les deux ordres "scan puis rattachement" et "rattachement puis scan" sont couverts par des tests, pour les chemins de rattachement synchrone et asynchrone.
- [ ] Les scénarios de `11-scenarios-de-panne.md` concernés par le changement sont testés (clamd arrêté, `ms-storage` arrêté).
- [ ] Mocks dans `*.mock.ts`, factories dans `*.factory.ts`, `jest.spyOn` + `restoreAllMocks()`.
- [ ] Noms de fichiers et de répertoires en kebab-case.

## Diagnostic

- Fichier bloqué en `SCANNING` : vérifier `jobs_outbox` / `job_audit` de `ms_storage` (skill `volontariapp-trace-async-flow`). La purge relance un job après 2 h et rejette après 12 h.
- Fichier resté `RESERVED` : l'événement de confirmation n'a pas été émis (entité jamais écrite, fallback en attente) ou `pp-storage` ne le consomme pas. Libéré automatiquement après 7 jours.
- Entité restée `PENDING` alors que le fichier est `CLEAN` : vérifier que le fichier est bien `ATTACHED`, puis que `storage.file_scanned` a été écrit dans `event_queue`.
- Qui produit / consomme un événement : `analyze_impact({ target: "storage.file_scanned" })` (mesh-mcp).
- Qui appelle `StorageService` : `analyze_grpc({ target: "StorageService" })` (mesh-mcp).
