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
---

# Schema

Préfixe global `api/v1`[^modules].

| Routes | Microservice | Contrôleurs |
| :--- | :--- | :--- |
| `POST/PATCH/DELETE /users`, `GET /users/me`, `GET /users/:userId/public` | `ms-user` | `src/modules/user`, `BaseUserGrpcController` vers `UserServiceClient` |
| `GET /badges*` | `ms-user` | `BaseBadgeGrpcController` |
| `POST /users/login`, `/users/refresh` (`@Public`) | `ms-user` | `user-auth.controller.ts` |
| `/posts`, `/posts/:postId/comments` | `ms-post` | `src/modules/post`, `BasePostGrpcController` vers `PostServiceClient` |
| `/events`, `/events/:id/requirements`, `/tags` | `ms-event` | `src/modules/event` |
| `/social/*` (likes, follow/block, participate/wish, feed, liens event-post) | `ms-social` | `src/modules/social`, contrôleurs commands/queries et `event-post-link.controller.ts` |
| `POST /system/seed` | plusieurs | `system-seed.controller.ts` (voir risques connus dans la skill) |
| `/health` | local | santé des connexions |
| `/helpers/tokens/*` (`@Public`) | local | génération de tokens de test (voir risques connus) |
| WebSocket `/socket.io` | `ws-service` | `WsProxyMiddleware`, pas de contrôleur REST |

Chaque module sépare `commands/` (écriture) et `queries/` (lecture), plus des variantes `*-admin.*-controller.ts` déclarées avec `GatewayController(tag, { admin: true })`. Les routes « me » (`/users/me`, `/posts/me`, `/social/feed/me`) utilisent `@CurrentUser()` ; les routes `:userId` sont protégées par `IsCurrentUserOrAdminGuard` (propriétaire ou `ADMIN`)[^guard].

[^modules]: Modules REST de api-gateway
[^guard]: IsCurrentUserOrAdminGuard
