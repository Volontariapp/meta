---
type: Reference
title: "Services gRPC : faits par service"
description: "Agrégats, RPC, événements émis et consommés, dépendances sortantes et invariants de chaque microservice, relevés dans le code."
tags: [microservice, domain]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T09:55:00Z"
sources:
  - id: user
    resource: ms-user/CLAUDE.md
    title: ms-user/CLAUDE.md
  - id: event
    resource: ms-event/CLAUDE.md
    title: ms-event/CLAUDE.md
  - id: post
    resource: ms-post/CLAUDE.md
    title: ms-post/CLAUDE.md
  - id: social
    resource: ms-social/CLAUDE.md
    title: ms-social/CLAUDE.md
  - id: storage
    resource: docs/stockage-fichiers/01-etat-des-lieux.md
    title: État des lieux du stockage
---

# Schema

| Service | Agrégats (package) | RPC exposés | Événements | Dépendances gRPC sortantes |
| :--- | :--- | :--- | :--- | :--- |
| `ms-user`[^user] | `UserEntity`, `BadgeEntity` (`domain-user`) | `UserService` (SignUp, Login, RefreshToken, Get/Update/Delete, Admin*, badges, impact score, profils des follows/likers/participants), `BadgeService` | Émet `user.created` par **trigger SQL** (`users_created_event_queue_trigger`, target `social:user`) ; `user.deleted` déclaré mais **jamais émis** | `SOCIAL_PACKAGE` (relationship, interaction, participation) |
| `ms-event`[^event] | `EventEntity`, `RequirementEntity`, `TagEntity` (`domain-event`) | `EventCommandService`, `EventQueryService`, `TagCommandService`, `TagQueryService` | Triggers CDC sur `events`, `requirements`, `tags`, `event_tags` vers `event_queue` (`{before, after}`) | `SOCIAL_PACKAGE` (participation) |
| `ms-post`[^post] | `Post`, `Comment` (`domain-post`) | `PostService` : Create/Update/DeletePost, Create/DeleteComment, GetPost, ListPosts, ListComments ; `AdminCreatePost` et `DeleteMyPosts` **définis mais non implémentés** | `post.created`, `post.deleted` via `createEvent` dans la transaction | `ms-social` (lien post/event) pour enrichir GetPost/ListPosts |
| `ms-social`[^social] | Noeuds miroirs `SocialUser`, `SocialPost`, `SocialEvent` dans Neo4j (`domain-social`) | Services par agrégat (user-node, relationship, publication, interaction, participation, event-post-link), chacun avec variantes `Admin*` | **N'émet rien** : tables outbox présentes pour les migrations seulement | aucune |
| `ms-storage`[^storage] | Aucun modèle (`domain-storage` sans repository) | **Aucun handler** ; démarre en HTTP seul (`listen(3006)`) | aucun | aucune |

# Invariants notables

- `ms-user` : `rna` doit matcher `^W[0-9]{9}$` (sinon `INVALID_RNA`) et fait passer le rôle à `ORGANIZATION` ; mot de passe via `@volontariapp/crypto`, jamais loggé ; e-mail loggé en hash tronqué ; changement de mot de passe exige `previousPassword`.
- `ms-event` : `state` parmi DRAFT, PUBLISHED, IN_PROGRESS, FINISHED, CANCELLED ; géocodage OpenStreetMap puis Google Maps en secours (désactivé en test) ; `search` ne filtre aujourd'hui que sur `searchTerm`.
- `ms-post` : `title` unique en base (`23505` vers `POST_ALREADY_EXISTS`) ; seul l'auteur ou un ADMIN modifie ou supprime ; un commentaire exige un post existant.
- `ms-social` : toute création vérifie l'inexistence (`*_ALREADY_EXISTS`), toute suppression l'existence (`*_NOT_FOUND`) ; « amis » = follow réciproque ; aucune règle anti self-follow.
- Sagas : `saga_status` (PENDING, DONE, CANCEL) sur `events`, `posts`, `comments`. Seul `post-processor-event` le fait passer à CANCEL ; un post en échec reste PENDING.

[^user]: ms-user/CLAUDE.md
[^event]: ms-event/CLAUDE.md
[^post]: ms-post/CLAUDE.md
[^social]: ms-social/CLAUDE.md
[^storage]: État des lieux du stockage
