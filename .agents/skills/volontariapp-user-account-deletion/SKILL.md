---
name: volontariapp-user-account-deletion
description: "Suppression de compte en deux temps (PENDING_DELETION): requestDeletionWithUserDeleted, finalizeDeletion, fan-out de user.deleted vers les domaines et gather ws. A utiliser pour tout changement de domain-user touchant la suppression, le statut ou le cycle de vie d'un user."
type: Domain Reference
title: User Account Deletion
tags: [user-account-deletion]
status: stable
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
    at: "2026-10-11T17:05:23Z"
    digest: 6a3eba2fe5a5d382
  - by: claude-code/agent
    at: "2026-10-12T11:52:52Z"
    digest: 2b6792d3efa8b352
  - by: claude-code/agent
    at: "2026-10-13T09:11:14Z"
    digest: 2b6792d3efa8b352
  - by: claude-code/agent
    at: "2026-10-13T11:38:33Z"
    digest: f83c020a514803cb
  - by: claude-code/agent
    at: "2026-10-13T16:25:37Z"
    digest: 1355deb6d953b9c8
sources: []
---

# User Account Deletion

## Quand utiliser cette skill

Ce document spécifie les **invariants de domaine et règles d'architecture** pour la suppression de compte utilisateur en deux temps (`PENDING_DELETION`). 

> [!NOTE]
> Cette fiche est une référence d'invariants de domaine (`Domain Reference`). Pour exécuter, implémenter ou modifier le pipeline technique asynchrone de bout en bout (émission outbox, stream fan-out, gather WebSocket et compensation), utilise le playbook opérationnel déterministe [`volontariapp-implement-async-event-flow`](/volontariapp-implement-async-event-flow/SKILL.md).

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
