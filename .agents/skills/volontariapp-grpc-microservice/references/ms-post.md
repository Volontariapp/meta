---
type: Reference
title: ms-post
description: "Domaine Post : agrégats, invariants, événements outbox, RPC implémentés ou non et enrichissement via ms-social (repris du CLAUDE.md du repo)."
tags: [ms-post, domain-post]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T10:30:00Z"
sources:
  - id: controllers
    resource: ms-post/src/modules/post/controllers
    title: "PostCommandController, PostQueryController"
  - id: repositories
    resource: npm-packages/packages/domain-post/src/repositories
    title: PostgresPostRepository (outbox intégré)
  - id: services
    resource: npm-packages/packages/domain-post/src/services
    title: "PostService, CommentService"
  - id: clients
    resource: ms-post/src/modules/post/clients
    title: Client lien post/event (ms-social)
---

# Domaine

Agrégats `Post` (id, authorId, title, content, saga_status, eventId?) et `Comment` (id, postId, authorId, content, saga_status), dans `@volontariapp/domain-post`[^services]. Les contrôleurs délèguent tout à `PostService` / `CommentService`.

# Invariants

- `title` unique en base (migration `1776000000001-AddUniqueConstraintToPostTitle.ts`) : `23505` devient `POST_ALREADY_EXISTS`.
- Seul l'auteur ou un `ADMIN` modifie ou supprime un post ou un commentaire (`ForbiddenError`).
- Un commentaire exige un post existant (`POST_NOT_FOUND`).
- `saga_status` (`PENDING`, `DONE`, `CANCEL`) sur `posts` et `comments` : jamais mis à jour par `ms-post` ; aucun consommateur ne passe un post en échec à `CANCEL`.

# Événements

Émis par `EventQueueEntity.createEvent` dans la transaction (`PostgresPostRepository.createWithPostCreated` / `.deleteWithPostDeleted`)[^repositories] : `post.created` (`Streams.POST_CREATED`, payload `{ postId, eventId?, userId? }`) et `post.deleted` (`Streams.POST_DELETED`, `{ postId, userId? }`). `deleteByAuthorId` supprime sans émettre. Aucun consommateur dans `ms-post`, pas de `withFallback`.

# gRPC

Implémentés dans `PostCommandController` / `PostQueryController`[^controllers] : CreatePost, UpdatePost, DeletePost, CreateComment, DeleteComment, GetPost, ListPosts, ListComments. **Définis dans `post.services.proto` mais non implémentés** : `AdminCreatePost`, `DeleteMyPosts`.

`GetPost` / `ListPosts` résolvent `post.eventId` par un appel à `EventPostLinkQueryService` de `ms-social`, seulement si un `x-internal-token` est présent[^clients].

[^controllers]: PostCommandController, PostQueryController
[^repositories]: PostgresPostRepository (outbox intégré)
[^services]: PostService, CommentService
[^clients]: Client lien post/event (ms-social)
