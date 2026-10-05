---
name: File Storage Flow
description: Playbook pour tout travail sur le stockage de fichiers (upload, scan, réservation, rattachement, nettoyage) - ms-storage, worker-storage, post-processor-storage, et rattachement d'une image à une entité métier (post, event, avatar, badge).
---

# Playbook : Stockage de Fichiers

La référence d'architecture est `docs/stockage-fichiers/` (repo `Volontariapp/docs`). Ce playbook en est le résumé opérationnel. **Lis le document du flux concerné avant de coder.**

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
15. **Persistance `files` dans `domain-storage`** (`FileModel`, `PostgresFileRepository`), partagée par `ms-storage`, `worker-storage` et `post-processor-storage`. Le pipeline S3 / clamd / ré-encodage vit dans le package d'infrastructure storage.
16. **La table d'événements s'appelle `event_queue`**, pas `event_outbox`.

---

## Recette : rattacher une image à un nouveau type d'entité

Exemple : ajouter une image à une "organisation".

1. **`proto-registry`** (skill `proto-contract-evolution`) :
   - nouvelle valeur `EntityType` (additive) ;
   - numéros de champs fixés au-dessus du maximum actuel, `reserved` sur tout numéro supprimé sans réservation ;
   - `optional string <x>_file_id` dans l'entité, et dans la commande de création avec `string idempotency_key` ;
   - pour une mise à jour par `Entity` + `update_mask`, le champ va **uniquement** dans l'entité ;
   - statut média (enum préfixé, `_UNSPECIFIED = 0`) si le mode est ASYNC ;
   - **STOP**.
2. **`npm-packages`** (skill `shared-npm-package-change`) :
   - `domain-storage` : entrée dans `VALIDATION_POLICY_BY_ENTITY` (mode, taille, MIME, format, maximum par entité) et préfixe de clé publique ;
   - `messaging` : événements `<domaine>.<x>_replaced` `{ <entity>Id, newFileId?, oldFileId? }` et, si absents, `created` / `deleted` ; payloads de fallback avec l'id calculé ;
   - `shared` : streams correspondants ;
   - `domain-<x>` : id fourni à la création, colonne `<x>_file_id` (+ statut si ASYNC), écriture de l'entité et de l'événement dans la même transaction, lecture de l'ancien `file_id` sous `SELECT ... FOR UPDATE` lors d'un remplacement ;
   - **STOP**.
3. **Service métier** : calcul de l'id, appel `ConfirmFileAttachment` via le client storage partagé avant `withFallback`, statut initial selon le `scan_status` renvoyé. Décider si l'entité supporte le rattachement asynchrone (elle doit alors avoir un statut média) ou répond 503 quand `ms-storage` est indisponible.
4. **`post-processor-storage`** (skill `implement-async-event-flow`) : consommer création, remplacement, suppression et échec de saga de l'entité. Les échecs de saga (`*.creation_failed`) sont émis par `ws-service` sur les streams partagés `ws:*-created-feedback` : filtrer par type.
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

- Fichier bloqué en `SCANNING` : vérifier `jobs_outbox` / `job_audit` de `ms_storage` (skill `trace-async-flow`). La purge relance un job après 2 h et rejette après 12 h.
- Fichier resté `RESERVED` : l'événement de confirmation n'a pas été émis (entité jamais écrite, fallback en attente) ou `pp-storage` ne le consomme pas. Libéré automatiquement après 7 jours.
- Entité restée `PENDING` alors que le fichier est `CLEAN` : vérifier que le fichier est bien `ATTACHED`, puis que `storage.file_scanned` a été écrit dans `event_queue`.
- Qui produit / consomme un événement : `analyze_impact({ target: "storage.file_scanned" })` (mesh-mcp).
- Qui appelle `StorageService` : `analyze_grpc({ target: "StorageService" })` (mesh-mcp).
