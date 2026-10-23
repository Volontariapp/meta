# Historique

## 2026-10-19

- **Vérification** - relu apres le commit fc51d42 de sync-migrations.sh, aucune regle changee (claude-code/agent)
- **Vérification** - ms-social AdminGetRecommendedEventIds ajoute, aucune regle changee (human:victor)

## 2026-10-17

- **Vérification** - Verifie: seule la migration impact_score_credits (ms-user) a change, aucun RPC ni controleur modifie (claude-code/agent)
- **Vérification** - test ms-event: assertion de valeur au lieu de toHaveProperty; regles inchangees (claude-code/agent)
- **Vérification** - lecon: toHaveProperty sur champ de classe undefined; regles inchangees (claude-code/agent)
- **Leçon** - Tests d'entite: toHaveProperty echoue sur un champ de classe undefined (pitfall) (claude-code/agent)
- **Vérification** - ticket 5.9: updateEvent cover via update_mask, jeton interne et statut de scan en nom d'enum dans ms-event; relu, aucune regle de la skill ne change (claude-code/agent)

## 2026-10-16

- **Vérification** - ms-post: mapScanStatus accepte les noms d'enum gRPC; lecon ajoutee (claude-code/agent)
- **Vérification** - ms-post: getPost et listPosts passent readerId (CurrentUser); aucune autre regle modifiee (claude-code/agent)
- **Vérification** - ms-post createPost: garde 409 sur titre duplique restaure (il etait actif via DATABASE_ERROR), lecon corrigee (claude-code/agent)
- **Vérification** - ms-post createPost: garde mort retire, stack conservee dans le log, helpers de test renommes en post-command.*; aucune regle modifiee (claude-code/agent)
- **Vérification** - ms-post createPost: token interne transmis a ms-storage, media_status non force a NONE avec fileIds, isStorageUnavailable partage; aucune regle du playbook modifiee (claude-code/agent)
- **Vérification** - ms-user: client storage local supprime (storage.client.ts), StorageClientModule.registerAsync exige STORAGE_CLIENT_OPTIONS exporte par un module importe; dette technique mise a jour (claude-code/agent)
- **Vérification** - verify user avatar attachment controller tests with storage client (agent/antigravity)
- **Vérification** - verification integration storage-client 0.3.0 et rattachement avatar dans ms-user (claude-code/agent)
- **Vérification** - Revue ms-post : DTO en IsUUID('all') et traduction du conflit d'unicite en POST_ALREADY_EXISTS ; patron de la skill inchange (claude-code/sonnet-5-5)

## 2026-10-15

- **Vérification** - Allow UUIDv5 in comment and post command/query DTOs (process:agent)
- **Vérification** - Allow UUIDv5 in search events query DTO (process:agent)

## 2026-10-14

- **Vérification** - ms-post: make postIdNamespace strictly required (claude-code/agent)
- **Vérification** - ms-post: clean spec typing with interfaces (claude-code/agent)
- **Vérification** - ms-post: clean up controller spec linting (claude-code/agent)
- **Vérification** - ms-post: integrate StorageClient and confirmPostAttachment (claude-code/agent)

## 2026-10-13

- **Vérification** - enableShutdownHooks ajoute dans main.ts: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Migration commune 1792000000000 répliquée dans ms-* (claude-code/agent)
- **Vérification** - Relu apres ajout de la migration commune AddTraceparent et de la colonne traceparent sur OutboxModel: aucune regle ni commande de la skill ne change (claude-code/agent)
- **Vérification** - withFallback ms-event: 403 hors fallback, extraPayload; deleteEvent passe l'acteur au service (claude-code/agent)
- **Leçon** - withFallback ms-event: 403 sans job, extraPayload pour les droits au replay (rule) (claude-code/agent)
- **Leçon** - Le controle de propriete vit dans le service de domaine, acteur obligatoire (rule) (claude-code/agent)

## 2026-10-12

- **Vérification** - Alignement mesh_keys (claude-code/agent)
- **Vérification** - Refactoring en vrai playbook opérationnel séquentiel (claude-code/agent)

## 2026-10-11

- **Vérification** - filter PENDING_DELETION in user queries (claude-code/agent)
- **Vérification** - filter PENDING_DELETION in user queries (claude-code/agent)
- **Vérification** - wire requestDeletion and add user status migration (human:victor)
- **Leçon** - ms-post: ListPosts sans tri ni plafond, mediaStatus jamais renseigne (pitfall) (claude-code/agent)
- **Leçon** - Les RPC Admin* n'ont aucun controle de role (pitfall) (claude-code/agent)

## 2026-10-08

- **Vérification** - Typage UserRoles.VOLUNTEER dans le test de changeEventState de ms-event (human:agent)
- **Vérification** - Add badge_progress and badge_progress_events tables (claude-code/agent)
- **Vérification** - Ajout des tables badge_progress et badge_progress_events dans ms-user et vérification du rôle dans changeEventState de ms-event (claude-code/agent)

## 2026-10-07

- **Vérification** - Relu : ms-post ajoute media/mediaStatus a PostDTO (PostMediaDTO), fileIds obligatoire et idempotencyKey a CreatePostCommandDTO, gardes inutiles retirees, aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu : ms-user storage.client.ts, gardes inutiles retirees (fileIds, missingFileIds typés non optionnels) et formatage Prettier, aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu : ms-user ajoute iconFileId et idempotencyKey au CreateBadgeCommandDTO pour suivre les contrats storage, aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu : ms-event aligne ses DTO et factories de test sur les contrats storage (coverFileId, coverStatus, idempotencyKey), aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu : ajout de champs de contrat (coverFileId, coverStatus, idempotencyKey) dans les DTO de ms-event, aucune regle de la skill modifiee (claude-code/agent)
- **Vérification** - Relu : modifications partielles non commitees de ms-event (champs coverFileId, coverStatus, import IsNotEmpty) pour suivre les contrats storage, aucune regle de la skill modifiee. Les DTO doivent rester alignes sur les interfaces de @volontariapp/contracts-nest apres chaque bump. (claude-code/agent)

## 2026-10-06

- **Vérification** - source de la lecon corrigee vers un fichier existant (unprocessable-entity.error.ts) (claude-code/claude-sonnet-5-5)
- **Vérification** - ajout de la regle sur le code gRPC des erreurs de domaine (BaseApiError) (claude-code/claude-sonnet-5-5)
- **Leçon** - Code gRPC d'une erreur de domaine : etendre BaseApiError, pas de mapping par code (rule) (claude-code/agent)
- **Vérification** - noms réels des migrations et des services sociaux (claude-code/claude-opus-5-5)
- **Vérification** - contenu des CLAUDE.md des repos rapatrié (fiches par service, carte des routes), sources repointées vers le code (claude-code/claude-opus-5-5)
- **Vérification** - création depuis les CLAUDE.md des repos, vérifiée contre le code (2026-10-06) (claude-code/claude-opus-5-5)
- **Création** - squelette OKF généré par evolve.py new (claude-code/claude-opus-5-5)
- **Leçon** - Création de la skill (decision) (claude-code/claude-opus-5-5)
