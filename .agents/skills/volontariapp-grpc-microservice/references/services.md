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
    resource: ms-user/src/modules/user/controllers
    title: "ms-user (fiche détaillée : ms-user.md)"
  - id: event
    resource: ms-event/src/modules/event/controllers
    title: "ms-event (fiche détaillée : ms-event.md)"
  - id: post
    resource: ms-post/src/modules/post/controllers
    title: "ms-post (fiche détaillée : ms-post.md)"
  - id: social
    resource: ms-social/src/modules
    title: "ms-social (fiche détaillée : ms-social.md)"
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

Fiches détaillées : [ms-user](/volontariapp-grpc-microservice/references/ms-user.md), [ms-event](/volontariapp-grpc-microservice/references/ms-event.md), [ms-post](/volontariapp-grpc-microservice/references/ms-post.md), [ms-social](/volontariapp-grpc-microservice/references/ms-social.md).

# Invariants notables

- `ms-user` : `rna` doit matcher `^W[0-9]{9}$` (sinon `INVALID_RNA`) et fait passer le rôle à `ORGANIZATION` ; mot de passe via `@volontariapp/crypto`, jamais loggé ; e-mail loggé en hash tronqué ; changement de mot de passe exige `previousPassword`.
- `ms-event` : `state` parmi DRAFT, PUBLISHED, IN_PROGRESS, FINISHED, CANCELLED ; géocodage OpenStreetMap puis Google Maps en secours (désactivé en test) ; `search` ne filtre aujourd'hui que sur `searchTerm`.
- `ms-post` : `title` unique en base (`23505` vers `POST_ALREADY_EXISTS`) ; seul l'auteur ou un ADMIN modifie ou supprime ; un commentaire exige un post existant.
- `ms-social` : toute création vérifie l'inexistence (`*_ALREADY_EXISTS`), toute suppression l'existence (`*_NOT_FOUND`) ; « amis » = follow réciproque ; aucune règle anti self-follow.
- Sagas : `saga_status` (PENDING, DONE, CANCEL) sur `events`, `posts`, `comments`. Seul `post-processor-event` le fait passer à CANCEL ; un post en échec reste PENDING.

[^user]: ms-user (fiche détaillée : ms-user.md)
[^event]: ms-event (fiche détaillée : ms-event.md)
[^post]: ms-post (fiche détaillée : ms-post.md)
[^social]: ms-social (fiche détaillée : ms-social.md)
[^storage]: État des lieux du stockage
