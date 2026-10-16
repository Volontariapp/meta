# Historique

## 2026-10-17

- **Vérification** - ticket 5.9: updateEvent cover via update_mask, jeton interne et statut de scan en nom d'enum dans ms-event; relu, aucune regle de la skill ne change (claude-code/agent)
- **Leçon** - ms-event: jeton interne et statut de scan en nom d'enum (pitfall) (claude-code/agent)

## 2026-10-16

- **Vérification** - ms-post: mapScanStatus accepte les noms d'enum gRPC; lecon ajoutee (claude-code/agent)
- **Leçon** - ms-post: le statut de scan de ms-storage arrive en NOM d'enum, sinon tout post avec image reste PENDING (pitfall) (claude-code/agent)
- **Vérification** - lecon: verifier la reponse reelle d'un champ de bout en bout; aucune autre regle modifiee (claude-code/agent)
- **Leçon** - Livrer un champ de bout en bout: lire la reponse reelle, pas seulement les types declares (rule) (claude-code/agent)
- **Vérification** - gateway: media[].url calculee aussi quand mediaStatus arrive en nom d'enum; aucune autre regle modifiee (claude-code/agent)
- **Vérification** - ms-post: getPost et listPosts passent readerId (CurrentUser); aucune autre regle modifiee (claude-code/agent)
- **Leçon** - Un auteur doit lire ses propres posts PENDING: ms-post transmet readerId au domaine (rule) (claude-code/agent)
- **Vérification** - ms-post createPost: garde 409 sur titre duplique restaure (il etait actif via DATABASE_ERROR), lecon corrigee (claude-code/agent)
- **Vérification** - ms-post createPost: garde mort retire, stack conservee dans le log, helpers de test renommes en post-command.*; aucune regle modifiee (claude-code/agent)
- **Leçon** - isBaseError ne capte pas les Error simples de domain-post (pitfall) (claude-code/agent)
- **Vérification** - ms-post: deux lecons ajoutees (media_status NONE truthy, token interne vers ms-storage) (claude-code/agent)
- **Leçon** - ms-post transmet le token interne a ConfirmFileAttachment (rule) (claude-code/agent)
- **Leçon** - media_status NONE est truthy: ne jamais le passer avec des fileIds (pitfall) (claude-code/agent)
- **Vérification** - storage-client 0.3.0: relais des erreurs metier de ms-storage, isStorageUnavailable et StorageUnavailableError; ligne ajoutee au catalogue (claude-code/sonnet-5-5)
- **Leçon** - Le client storage-client relaie les erreurs metier de ms-storage, pas les pannes de transport (pitfall) (claude-code/sonnet-5-5)
- **Vérification** - ms-storage: implement GetFileMetadata and DeleteFile handlers (ticket 3.8) (human:victoragahi)

## 2026-10-15

- **Vérification** - ms-storage confirmUpload: chemin SYNC et bascule ASYNC ticket 3.7 (human:victoragahi)
- **Vérification** - Use RejectionReason.MALWARE enum in confirm-upload integration test (process:fix-rejection-reason)
- **Vérification** - Implement gRPC ConfirmUpload handler and ASYNC pipeline in ms-storage (ticket 3.6) (process:implement-confirm-upload)
- **Vérification** - Expose models and repositories from @volontariapp/domain-storage root entrypoint (human:victor)
- **Vérification** - Export models and repositories from root of domain-storage (process:export-domain-storage-root)
- **Vérification** - Implement ConfirmFileAttachment gRPC handler in ms-storage (ticket 3.5) (process:implement-confirm-file-attachment)
- **Vérification** - Migrate storage service and controller tests to jest.spyOn without unbound-method exception (process:spies-refactor)
- **Vérification** - Cleaned test mock typing using createMock and excluded src/test from tsconfig.build.json (process:ms-storage-test-mock-fix)
- **Vérification** - ms-storage directly configures PresignedPostSigner in StorageModule; deprecated s3 provider removed (process:ms-storage-s3-refactor)
- **Vérification** - Add test:integration script (claude-code/agent)
- **Vérification** - Implement ms-storage GenerateUploadUrl (ticket 3.4) (claude-code/agent)
- **Vérification** - Storage pipeline client and Apple HEIC/HEIF format (process:agent)
- **Vérification** - Add @volontariapp/storage-pipeline with S3 client, presigned POST, magic bytes, clamd, and sharp transformer (claude-code/agent)

## 2026-10-14

- **Leçon** - Résolution DI ClientsModule dans StorageClientModule.registerAsync (pitfall) (human:victoragahi)

## 2026-10-13

- **Vérification** - enableShutdownHooks ajoute dans main.ts: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Migration commune 1792000000000 répliquée dans ms-storage et domain-storage (claude-code/agent)
- **Vérification** - Relu apres ajout de la migration commune AddTraceparent et de la colonne traceparent sur OutboxModel: aucune regle ni commande de la skill ne change (claude-code/agent)

## 2026-10-11

- **Vérification** - Fix require-await in test (claude-code/agent)
- **Vérification** - Ajout de markFilesForDeletionByOwner dans IFileRepository et PostgresFileRepository (claude-code/agent)

## 2026-10-07

- **Vérification** - Relu : ms-storage bump @volontariapp/* (logger 0.3.0) et retrait d'un optional chaining devenu inutile dans s3-error.utils.ts, aucune regle modifiee (claude-code/agent)
- **Vérification** - ajout de la procedure de test manuel local de ms-storage (claude-code/claude-sonnet-5-5)
- **Leçon** - Test manuel local de ms-storage : ce qui est testable et ce qui ne l'est pas (rule) (claude-code/agent)

## 2026-10-06

- **Vérification** - Ticket 1.11 : attachFromConfirmationEvent, releaseForEntity, releaseFile, releaseForOwner existent (domain-storage 0.10.0) ; mapper enregistre a l'import de ./models contrairement a domain-post ; now retire de createPending, TTL borne a 7 jours (claude-code/claude-sonnet-5-5)
- **Vérification** - PostgresFileRepository refactore: FileEntity, mapper, IFileRepository, BaseRepository, outbox via @volontariapp/outbox (claude-code/claude-sonnet-5-5)
- **Vérification** - passe d'evolution apres les merges du Sprint 8 (statut du repository, CI des services, worktrees) (claude-code/claude-sonnet-5-5)
- **Vérification** - FileAttachmentRefusedException: grpcCode FAILED_PRECONDITION (extends BaseApiError), pas de mapping par code (claude-code/claude-sonnet-5-5)
- **Vérification** - migration files et released_entities dans ms-storage (ticket 3.1) (claude-code/claude-sonnet-5-5)
- **Vérification** - config S3 etendue (privateBucket, publicEndpoint, publicBaseUrl, scanner) et S3Module importe (ticket 0.2) (claude-code/claude-sonnet-5-5)
- **Vérification** - ms-storage demarre en hybride gRPC 5006 + HTTP /health (ticket 0.1) (claude-code/claude-sonnet-5-5)
- **Vérification** - reserve et regle de validation du rattachement (classifyFileForAttachment) ajoutes a domain-storage 0.8.0 (ticket 1.10) (claude-code/claude-sonnet-5-5)
- **Vérification** - PostgresFileRepository : journalisation des echecs, avertissement sur targetServices vide (perte silencieuse) (claude-code/claude-sonnet-5-5)
- **Vérification** - PostgresFileRepository (ticket 1.9) : createPending, confirmUpload, switchToAsync, resetToAwaitingUpload, completeScan, rejectScan, limite StorageStream (claude-code/claude-sonnet-5-5)
- **Vérification** - domain-storage 0.6.0 mergee : sous-chemin ./models, garde INVALID_ENTITY_TYPE, FileId en minuscules (claude-code/claude-sonnet-5-5)
- **Vérification** - domain-storage 0.6.0: reformatage Prettier des modeles, contenu de la skill inchange (claude-code/claude-sonnet-5-5)
- **Vérification** - domain-storage 0.6.0 (ticket 1.8): FileModel, ReleasedEntityModel, test d'integration et migration de test (claude-code/claude-sonnet-5-5)
- **Vérification** - domain-storage: helpers buildQuarantineObjectKey, buildPublicObjectKey, buildPublicFileUrl implementes (ticket 1.7) (claude-code/claude-sonnet-5-5)
- **Vérification** - domain-storage 0.4.0: reformatage Prettier des fichiers, contenu de la skill inchange (claude-code/claude-sonnet-5-5)
- **Vérification** - domain-storage 0.4.0 (ticket 1.6): enums scan/validation/rejection, VALIDATION_POLICY_BY_ENTITY, resolveValidationMode, SVG retire (claude-code/claude-sonnet-5-5)
- **Vérification** - statut RFC explicite et symboles à créer (claude-code/claude-opus-5-5)
- **Vérification** - migration au format OKF v0.2 (setup agentique repris d'Aureum, multi-repo) (claude-code/claude-opus-5-5)
