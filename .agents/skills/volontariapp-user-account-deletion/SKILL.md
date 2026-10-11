---
name: volontariapp-user-account-deletion
description: "Suppression de compte en deux temps (PENDING_DELETION): requestDeletionWithUserDeleted, finalizeDeletion, fan-out de user.deleted vers les domaines et gather ws. A utiliser pour tout changement de domain-user touchant la suppression, le statut ou le cycle de vie d'un user."
type: Agent Skill
title: User Account Deletion
tags: [user-account-deletion]
status: draft
paths:
  - "npm-packages/packages/domain-user/src/**"
mesh_keys:
  - PENDING_DELETION
  - requestDeletionWithUserDeleted
  - finalizeDeletion
  - USER_DELETED
generated:
  by: claude-code/agent
  at: "2026-10-11T16:59:33Z"
verified:
  - by: claude-code/agent
    at: "2026-10-11T16:59:40Z"
    digest: 41f44d3551166416
  - by: claude-code/agent
    at: "2026-10-11T17:00:10Z"
    digest: 9c79e5ebabc8a103
  - by: claude-code/agent
    at: "2026-10-11T17:04:48Z"
    digest: 6a3eba2fe5a5d382
  - by: claude-code/agent
    at: "2026-10-11T17:05:14Z"
    digest: 6a3eba2fe5a5d382
  - by: claude-code/agent
    at: "2026-10-11T17:05:23Z"
    digest: 6a3eba2fe5a5d382
sources: []
---

# User Account Deletion

## Quand utiliser cette skill

Suppression de compte en deux temps (PENDING_DELETION): requestDeletionWithUserDeleted, finalizeDeletion, fan-out de user.deleted vers les domaines et gather ws. A utiliser pour tout changement de domain-user touchant la suppression, le statut ou le cycle de vie d'un user.

## Règles

- `UserService.requestDeletion` appelle `PostgresUserRepository.requestDeletionWithUserDeleted` : dans une seule transaction, le user passe `PENDING_DELETION` (`deletion_requested_at` renseigné) et `user.deleted` est écrit dans `event_queue`. Il n'y a aucun `DELETE` à ce stade.
- `targetServices` de `user.deleted` : `USER_DELETED` (ws-service, créateur du gather), `SOCIAL_USER`, `USER_DELETED_POST`, `USER_DELETED_EVENT`, `USER_DELETED_STORAGE`. Le pusher fait un `XADD` par stream, donc un stream par consommateur.
- `UserService.finalizeDeletion` ne supprime que les users encore `PENDING_DELETION` (idempotent) et n'est appelé qu'après le succès du gather `user.deleted` côté ws-service.
- Ne jamais supprimer un compte avec `IUserRepository.delete` (hérité de `BaseRepository`, `DELETE` physique sans événement).
- Un user `PENDING_DELETION` doit être refusé au login et au refresh (côté `ms-user`, via `UserEntity.status`).
- La migration réelle de `status` et `deletion_requested_at` vit dans `ms-user`; `domain-user/src/test/migrations` ne sert qu'aux tests d'intégration.
- Voir la skill `volontariapp-implement-async-event-flow` pour le gather et les pièges des post-processors de purge.

## Références

- [Leçons apprises](/volontariapp-user-account-deletion/references/lessons.md)

## Scripts

- Aucun script pour l'instant. Tests: `yarn test` (unitaires) et `yarn test:integration` (Postgres `ms_user` requis) dans `npm-packages/packages/domain-user`.
