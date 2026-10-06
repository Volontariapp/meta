---
name: volontariapp-api-gateway
description: "Ajouter ou modifier une route REST de api-gateway (point d'entrée HTTP unique) : contrôleur command/query, guards, token interne propagé en métadonnée gRPC, client gRPC du microservice, mapping d'erreurs et FALLBACK_ACTIVATED (206), proxy WebSocket. À utiliser pour tout travail dans api-gateway/."
type: Agent Skill
title: API Gateway (REST vers gRPC)
tags: [api-gateway, auth, grpc]
status: stable
paths:
  - "api-gateway/src/**"
mesh_keys:
  - api-gateway
  - gatewaycontroller
  - accesstokenguard
  - rolesguard
  - grpcinternalinterceptor
  - internalmetadata
  - iscurrentuseroradminguard
  - ws-proxy
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:54:04Z"
verified:
  - by: claude-code/claude-opus-5-5
    at: "2026-10-06T08:54:04Z"
  - by: claude-code/claude-opus-5-5
    at: "2026-10-06T09:00:38Z"
    digest: 49499925efc5f8c6
sources:
  - id: gw-claude
    resource: api-gateway/CLAUDE.md
    title: "api-gateway/CLAUDE.md (routes, auth, clients)"
  - id: decorator
    resource: api-gateway/src/common/decorators/gateway-controller.decorator.ts
    title: GatewayController
  - id: app-module
    resource: api-gateway/src/app.module.ts
    title: "AppModule (GrpcInternalInterceptor, HelperModule)"
  - id: grpc-module
    resource: api-gateway/src/grpc/grpc-client.module.ts
    title: GrpcClientModule
  - id: helper
    resource: api-gateway/src/modules/helper/controllers/token-helper.controller.ts
    title: TokenHelperController
  - id: seed
    resource: api-gateway/src/modules/system/controllers/system-seed.controller.ts
    title: SystemSeedController
  - id: deploy-gw
    resource: deploy/apps/base/api-gateway/deployment.yaml
    title: Déploiement api-gateway (NODE_ENV)
  - id: errors-nest
    resource: npm-packages/packages/errors-nest/src/errors/common.errors.ts
    title: FALLBACK_ACTIVATED (PartialContentError 206)
  - id: ws-proxy
    resource: api-gateway/src/modules/ws-proxy/ws-proxy.middleware.ts
    title: WsProxyMiddleware
---

# API Gateway (REST vers gRPC)

Seul composant exposé sur Internet (préfixe global `api/v1`). Aucune logique métier : authentifier, valider le DTO, appeler le bon microservice en gRPC avec le token interne, traduire la réponse et les erreurs[^gw-claude].

## Quand l'utiliser

Nouvelle route, nouveau champ exposé au front, changement d'auth ou de rôle, appel d'un nouveau RPC. Si le RPC n'existe pas encore : `volontariapp-proto-contract-evolution` d'abord (règle du STOP).

## Anatomie d'une route

| Élément | Où | Règle |
| :--- | :--- | :--- |
| Module | `src/modules/<domaine>/` (`user`, `post`, `event`, `social`, `system`, `helper`, `health`, `ws-proxy`) | Contrôleurs séparés `controllers/commands/` (écriture) et `controllers/queries/` (lecture), variantes `*-admin.*-controller.ts` |
| Contrôleur | `@GatewayController(tag, options)`[^decorator] | Pose `AccessTokenGuard` ; `{ admin: true }` ajoute `RolesGuard`. Sans `admin: true`, un `@Roles(...)` posé seul n'est **pas** appliqué |
| Route publique | `@Public()` | Réservé à login, refresh et helpers de dev |
| Utilisateur courant | `@CurrentUser()` | Routes « me » (`/users/me`, `/social/feed/me`) : jamais d'id utilisateur pris dans l'URL ou le body |
| Propriétaire ou admin | `IsCurrentUserOrAdminGuard` | Routes scopées `:userId` |
| Validation | `ValidationPipe({ transform: true })` global, DTO `class-validator` | Le DTO de requête est la seule entrée acceptée |
| Appel gRPC | `Base*GrpcController` fait `client.getService<XServiceClient>(X_SERVICE_NAME)` dans `onModuleInit` | Les contrôleurs concrets héritent de la base et passent `req['internalMetadata']` en second argument de chaque appel |

## Token interne et clients

- `GrpcInternalInterceptor` (`@volontariapp/auth`), enregistré en `APP_INTERCEPTOR`[^app-module], signe l'`INTERNAL_TOKEN` et pose `req['internalMetadata']` (`grpc.Metadata`). Un appel gRPC sans cette métadonnée est rejeté `UNAUTHENTICATED` par le `GrpcInternalGuard` du microservice.
- `GrpcClientModule`[^grpc-module] enregistre 4 clients : `UserPackage`, `PostPackage`, `EventPackage`, `SocialPackage`, options `getGrpcOptions(GRPC_MICROSERVICES.X, url)`. Pas encore de client `ms-storage` : à ajouter avec le flux de stockage.
- Le WebSocket n'est pas du gRPC : `WsProxyMiddleware`[^ws-proxy] vérifie le JWT, signe un token interne et relaie la connexion vers `msWsUrl` avec l'en-tête `x-internal-token`.

## Erreurs et asynchronisme

- Les erreurs `BaseApiError` des microservices portent `statusCode` et `grpcCode` ; la gateway les rend avec le même code HTTP.
- **HTTP 206 = `FALLBACK_ACTIVATED`**[^errors-nest] : le microservice a échoué sur une erreur non client et a écrit un job de fallback ; le client attend le résultat par WebSocket. Une opération asynchrone normale (événement de domaine) répond 200/201, pas 206. Documenter la réponse avec `@CustomApiError(() => FALLBACK_ACTIVATED(...))` sur les routes concernées.

## Risques connus (à traiter, ne pas reproduire)

| Risque | Détail |
| :--- | :--- |
| **Jetons arbitraires en production** | `HelperModule` est monté dès que `nodeEnv !== TEST`[^app-module], or le déploiement fixe `NODE_ENV=production`[^deploy-gw]. `TokenHelperController` est `@Public()`[^helper] : `GET /api/v1/helpers/tokens/admin-token` renvoie un access token ADMIN à n'importe qui. La condition attendue est probablement `nodeEnv === DEVELOPMENT` ou `LOCAL`. |
| `@Roles` sans `RolesGuard` | `SystemSeedController` porte `@Roles(UserRoles.ADMIN)` mais `@GatewayController('System')` sans `admin: true`[^seed] : tout utilisateur authentifié peut lancer le seed. |
| Pas de rate limiting | Aucun throttler dans la gateway (prérequis du stockage de fichiers). |

## Checklist

- [ ] `@GatewayController(tag, { admin: true })` pour toute route d'administration, jamais `@Roles` seul.
- [ ] `req['internalMetadata']` passé à chaque appel gRPC.
- [ ] Aucun id d'utilisateur lu dans le payload quand `@CurrentUser()` le donne.
- [ ] Réponses d'erreur Swagger (`@Api*Response`, `@CustomApiError`) alignées sur les erreurs réellement renvoyées.

[^gw-claude]: api-gateway/CLAUDE.md (routes, auth, clients)
[^decorator]: GatewayController
[^app-module]: AppModule (GrpcInternalInterceptor, HelperModule)
[^grpc-module]: GrpcClientModule
[^ws-proxy]: WsProxyMiddleware
[^errors-nest]: FALLBACK_ACTIVATED (PartialContentError 206)
[^deploy-gw]: Déploiement api-gateway (NODE_ENV)
[^helper]: TokenHelperController
[^seed]: SystemSeedController
