# Historique

## 2026-10-07

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
