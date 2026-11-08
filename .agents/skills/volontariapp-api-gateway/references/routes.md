---
type: Reference
title: Carte des routes REST
description: "Routes REST de api-gateway et microservice cible de chacune (reprise du CLAUDE.md du repo, supprimé au profit de meta)."
tags: [api-gateway, routes]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T10:40:00Z"
sources:
  - id: modules
    resource: api-gateway/src/modules
    title: Modules REST de api-gateway
  - id: guard
    resource: api-gateway/src/common/guards/is-current-user-or-admin.guard.ts
    title: IsCurrentUserOrAdminGuard
  - id: leaderboard
    resource: api-gateway/src/modules/user/controllers/queries/user/leaderboard.query-controller.ts
    title: LeaderboardQueryController
  - id: user-module
    resource: api-gateway/src/modules/user/user.module.ts
    title: UserModule (ordre des contrôleurs)
  - id: live
    resource: api-gateway/src/modules/live/controllers/live-sharing.controller.ts
    title: LiveSharingController
  - id: search-events
    resource: api-gateway/src/modules/event/dto/request/search-events.request.dto.ts
    title: SearchEventsRequestDTO
---

# Schema

Préfixe global `api/v1`[^modules].

| Routes | Microservice | Contrôleurs |
| :--- | :--- | :--- |
| `POST/PATCH/DELETE /users`, `GET /users/me`, `GET /users/:userId/public` | `ms-user` | `src/modules/user`, `BaseUserGrpcController` vers `UserServiceClient` |
| `GET /badges*` | `ms-user` | `BaseBadgeGrpcController` |
| `GET /users/me/badges/progress` (progression vers chaque badge, `BadgeProgressQueryController`, `BaseBadgeGrpcController` vers `BadgeServiceClient.getMyBadgeProgress`) | `ms-user` | `src/modules/user/controllers/queries/badge/badge-progress.query-controller.ts` |
| `GET /users/leaderboard?scope=&cursor=&limit=` (`scope` vaut `global`, `week` ou `month`) (classement par points, curseur, limite de 1 à 100, 20 par défaut) et `GET /users/me/rank?scope=` (mon rang et cinq voisins de chaque côté ; l'utilisateur vient du token, jamais de la requête)[^leaderboard] | `ms-user` | `LeaderboardQueryController`, `BaseUserGrpcController` vers `UserServiceClient.getLeaderboard` et `getMyRank`. Déclaré **avant** `UserAdminQueryController` dans `UserModule` : sinon `leaderboard` serait pris pour l'`:id` de `GET /users/:id`[^user-module] |
| `POST /users/login`, `/users/refresh` (`@Public`) | `ms-user` | `user-auth.controller.ts` |
| `/posts`, `/posts/:postId/comments` | `ms-post` | `src/modules/post`, `BasePostGrpcController` vers `PostServiceClient` |
| `/events` (paramètre optionnel `endAtFrom`, date ISO 8601 transmise à `SearchEventsQuery`[^search-events]), `/events/:id/requirements`, `/tags` | `ms-event` | `src/modules/event` |
| `PUT` et `DELETE /live/events/:eventId/sharing` (autoriser puis arrêter le partage de sa position avec l'organisateur ; l'appelant est toujours `@CurrentUser()`, un événement inconnu et tout refus donnent la même réponse 404)[^live] | `ms-event`, `ms-social` et `ws-service` | `src/modules/live`, `LiveSharingController` sous son propre préfixe `live`, à l'écart de `GET /events/:id` |
| `/social/*` (likes, follow/block, participate/wish, feed, liens event-post) | `ms-social` | `src/modules/social`, contrôleurs commands/queries et `event-post-link.controller.ts` |
| `POST /storage/upload-url`, `POST /storage/files/:id/confirm` (deadline 10 s), `GET /storage/files/:id` | `ms-storage` | `src/modules/storage`, contrôleurs commands/queries, `common/storage-grpc-errors.ts` (UNAVAILABLE, DEADLINE_EXCEEDED et timeout local vers HTTP 503) |
| `POST /system/seed` | plusieurs | `system-seed.controller.ts` (voir risques connus dans la skill) |
| `/health` | local | santé des connexions |
| `/helpers/tokens/*` (`@Public`) | local | génération de tokens de test (voir risques connus) |
| WebSocket `/socket.io` | `ws-service` | `WsProxyMiddleware`, pas de contrôleur REST |

Chaque module sépare `commands/` (écriture) et `queries/` (lecture), plus des variantes `*-admin.*-controller.ts` déclarées avec `GatewayController(tag, { admin: true })`. Les routes « me » (`/users/me`, `/posts/me`, `/social/feed/me`) utilisent `@CurrentUser()` ; les routes `:userId` sont protégées par `IsCurrentUserOrAdminGuard` (propriétaire ou `ADMIN`)[^guard].

[^modules]: Modules REST de api-gateway
[^guard]: IsCurrentUserOrAdminGuard
[^leaderboard]: LeaderboardQueryController
[^user-module]: UserModule (ordre des contrôleurs)
[^live]: LiveSharingController
[^search-events]: SearchEventsRequestDTO
