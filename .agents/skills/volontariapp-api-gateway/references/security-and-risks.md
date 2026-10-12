---
type: Reference
title: "Sécurité, Risques et Modules de l'API Gateway"
description: "Architecture de sécurité de l'API Gateway : token interne, modules existants, clients gRPC et inventaire des risques et failles connus."
tags: [api-gateway, security, auth, risks, grpc]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:54:04Z"
sources:
  - id: gw-claude
    resource: api-gateway/src/modules
    title: "Modules de api-gateway (carte : references/routes.md)"
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

# Sécurité, Risques et Modules de l'API Gateway

Ce document recense les spécificités de sécurité, la topologie des modules et l'inventaire des risques connus sur l'API Gateway Volontariapp.

---

## 1. Topologie des Modules

L'API Gateway est structurée en modules scopés par domaine (`src/modules/<domaine>/`)[^gw-claude] :
- `user`, `post`, `event`, `social` : proxy REST vers les microservices métier correspondants.
- `system`, `helper` : endpoints d'administration et helpers de développement.
- `health` : sondes de liveness/readiness Kubernetes.
- `ws-proxy` : middleware de proxying WebSocket vers `ws-service`[^ws-proxy].

Carte complète des routes : [Carte des routes REST](/volontariapp-api-gateway/references/routes.md).

---

## 2. Token Interne et Clients gRPC

- `GrpcInternalInterceptor` (`@volontariapp/auth`), enregistré en `APP_INTERCEPTOR`[^app-module], signe l'`INTERNAL_TOKEN` et injecte `req['internalMetadata']` (`grpc.Metadata`). Tout appel RPC sans cette métadonnée est rejeté en `UNAUTHENTICATED` par les microservices.
- `GrpcClientModule`[^grpc-module] configure les clients des microservices : `UserPackage`, `PostPackage`, `EventPackage`, `SocialPackage`.
- Le WebSocket n'étant pas gRPC, `WsProxyMiddleware`[^ws-proxy] vérifie le JWT utilisateur, génère un token interne signé et relaie la connexion vers `msWsUrl` avec l'en-tête `x-internal-token`.

---

## 3. Risques Connus & Vulnérabilités Identifiées (à corriger, ne pas reproduire)

| Risque | Détail technique |
| :--- | :--- |
| **Génération de jetons arbitraires en production** | `HelperModule` est monté dès que `nodeEnv !== TEST`[^app-module], or le déploiement fixe `NODE_ENV=production`[^deploy-gw]. `TokenHelperController` est `@Public()`[^helper] : `GET /api/v1/helpers/tokens/admin-token` génère un token ADMIN à tout appelant anonyme. La condition attendue est `nodeEnv === DEVELOPMENT` ou `LOCAL`. |
| **`@Roles` inopérant sans `RolesGuard`** | `SystemSeedController` porte `@Roles(UserRoles.ADMIN)` mais son contrôleur est annoté `@GatewayController('System')` sans `{ admin: true }`[^seed] : `RolesGuard` n'étant pas monté, tout utilisateur authentifié (même volontaire) peut exécuter le seed. |
| **Absence de Rate Limiting** | Aucun throttler n'est actuellement actif dans l'API Gateway (point bloquant pour l'ouverture publique du stockage de fichiers). |

[^gw-claude]: Modules de api-gateway (carte : references/routes.md)
[^decorator]: GatewayController
[^app-module]: AppModule (GrpcInternalInterceptor, HelperModule)
[^grpc-module]: GrpcClientModule
[^helper]: TokenHelperController
[^seed]: SystemSeedController
[^deploy-gw]: Déploiement api-gateway (NODE_ENV)
[^errors-nest]: FALLBACK_ACTIVATED (PartialContentError 206)
[^ws-proxy]: WsProxyMiddleware
