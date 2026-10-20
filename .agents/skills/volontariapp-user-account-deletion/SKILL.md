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
    at: "2026-10-13T16:25:37Z"
    digest: 1355deb6d953b9c8
  - by: "process:antigravity"
    at: "2026-10-14T14:37:10Z"
    digest: a9f80cd1f5bb6eb5
  - by: claude-code/sonnet-5-5
    at: "2026-10-16T12:24:45Z"
    digest: a911501d005746f0
  - by: claude-code/agent
    at: "2026-10-17T12:32:08Z"
    digest: f72b7f94d3a033ce
  - by: claude-code/agent
    at: "2026-10-23T14:44:32Z"
    digest: 42ff7c20c027a49a
sources: []
---

# User Account Deletion

## Quand utiliser cette skill

Ce document spécifie les **invariants de domaine et règles d'architecture** pour la suppression de compte utilisateur en deux temps (`PENDING_DELETION`). 

> [!NOTE]
> Cette fiche est une référence d'invariants de domaine (`Domain Reference`). Pour exécuter, implémenter ou modifier le pipeline technique asynchrone de bout en bout (émission outbox, stream fan-out, gather WebSocket et compensation), utilise le playbook opérationnel déterministe [`volontariapp-implement-async-event-flow`](/volontariapp-implement-async-event-flow/SKILL.md).

## Règles

- `UserService.requestDeletion` appelle `PostgresUserRepository.requestDeletionWithUserDeleted` : dans une seule transaction, le user passe `PENDING_DELETION` (`deletion_requested_at` renseigné) et `user.deleted` est écrit dans `event_queue`. Il n'y a aucun `DELETE` à ce stade.
- `targetServices` de `user.deleted` : `USER_DELETED` (ws-service, créateur du gather), `SOCIAL_USER`, `USER_DELETED_POST`, `USER_DELETED_EVENT`, `USER_DELETED_STORAGE`, `USER_DELETED_RANKING` (ajouté par npm-packages@91040d72, `postgres-user.repository.ts:116`; le test d'intégration `user-deletion.int.spec.ts` liste les mêmes streams). Le pusher fait un `XADD` par stream, donc un stream par consommateur.
- `UserService.finalizeDeletion` ne supprime que les users encore `PENDING_DELETION` (idempotent) et n'est appelé qu'après le succès du gather `user.deleted` côté ws-service.
- Ne jamais supprimer un compte avec `IUserRepository.delete` (hérité de `BaseRepository`, `DELETE` physique sans événement).
- Un user `PENDING_DELETION` doit être refusé au login et au refresh (côté `ms-user`, via `UserEntity.status`).
- La migration réelle de `status` et `deletion_requested_at` vit dans `ms-user`; `domain-user/src/test/migrations` ne sert qu'aux tests d'intégration.
- Les lignes de `impact_score_credits` (`ImpactScoreCreditModel`, dédup du crédit de score par `(event_id, user_id)`) ont une FK `ON DELETE CASCADE` sur `users` : `finalizeDeletion` les supprime avec le user, sans purge dédiée. La migration de la table vit dans `ms-user`.
- Voir la skill `volontariapp-implement-async-event-flow` pour le gather et les pièges des post-processors de purge.

## Références

- [Leçons apprises](/volontariapp-user-account-deletion/references/lessons.md)

## Scripts

- Aucun script pour l'instant. Tests: `yarn test` (unitaires) et `yarn test:integration` (Postgres `ms_user` requis) dans `npm-packages/packages/domain-user`.
