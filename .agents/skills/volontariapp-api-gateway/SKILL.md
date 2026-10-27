---
name: volontariapp-api-gateway
description: "Playbook opérationnel pas-à-pas pour exposer ou modifier une route REST Edge sur api-gateway : DTO Swagger, contrôleur REST, guards, token interne propagé en métadonnée gRPC, support HTTP 206 et tests."
type: Playbook
title: Exposer ou Modifier une Route REST Edge
tags: [api-gateway, auth, grpc, rest, swagger, playbook]
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
  - by: claude-code/agent
    at: "2026-10-21T07:39:39Z"
    digest: d7f0cb62a55bf23c
  - by: claude-code/agent
    at: "2026-10-21T07:52:31Z"
    digest: 24a20193dd9fd8a9
  - by: claude-code/agent
    at: "2026-10-21T08:14:45Z"
    digest: 1692df12d227d761
  - by: claude-code/agent
    at: "2026-10-21T08:20:12Z"
    digest: 941c50145d24f9f9
  - by: claude-code/agent
    at: "2026-10-27T22:34:16Z"
    digest: 271a1efbb7e79791
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

# Playbook : Exposer ou Modifier une Route REST Edge (API Gateway)

Dans l'écosystème Volontariapp, `api-gateway` est l'unique point d'entrée HTTP exposé publiquement (préfixe global `/api/v1`)[^gw-claude]. 

L'API Gateway **ne contient aucune logique métier** : son rôle exclusif consiste à authentifier l'utilisateur, valider le payload REST, relayer la requête au microservice cible via gRPC en y injectant un token interne signé (`x-internal-token`), et traduire la réponse ou les erreurs en HTTP.

La référence des modules, de la topologie réseau et des risques de sécurité est consignée dans [Sécurité & Risques API Gateway](/volontariapp-api-gateway/references/security-and-risks.md).

---

## Trigger

Ce playbook doit être exécuté dès qu'une tâche nécessite :
- L'ajout d'une nouvelle route REST publique ou authentifiée (GET, POST, PUT, PATCH, DELETE).
- L'exposition d'un nouveau paramètre de requête ou champ de réponse vers l'application mobile `nativapp`.
- L'ajustement des règles d'authentification ou des permissions de rôle sur un endpoint existant.

---

## Étape 1 : Spécification du DTO Swagger & Validation

Emplacement : `src/modules/<domaine>/dto/request/<nom>.request.dto.ts`.

Chaque DTO de requête doit :
1. Documenter les champs pour OpenAPI/Swagger avec `@ApiProperty()` ou `@ApiPropertyOptional()`.
2. Appliquer des décorateurs `class-validator` stricts.
3. Implémenter la méthode adaptatrice `toCommand(): CommandType` ou `toQuery(): QueryType` pour convertir le format REST en contrat gRPC.

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import type { CreatePostCommand } from '@volontariapp/contracts-nest';

export class CreatePostRequestDTO {
  @ApiProperty({ description: 'Titre de la publication', example: 'Mission Maraude Paris' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Contenu textuel', example: 'Besoin de 5 bénévoles ce samedi' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ description: 'Identifiant du fichier image déjà confirmé' })
  @IsUUID()
  @IsOptional()
  coverFileId?: string;

  toCommand(): CreatePostCommand {
    return {
      title: this.title,
      content: this.content,
      coverFileId: this.coverFileId,
    };
  }
}
```

---

## Étape 2 : Contrôleur REST NestJS & Règles de Sécurité

Emplacement : `src/modules/<domaine>/controllers/commands/` (écriture) ou `queries/` (lecture).

```typescript
import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import { GatewayController } from '../../../../common/decorators/gateway-controller.decorator.js';
import { CurrentUser, type AuthUser } from '@volontariapp/auth';
import { BasePostGrpcController } from '../base-post-grpc.controller.js';
import { CreatePostRequestDTO } from '../../dto/request/create-post.request.dto.js';
import { PostResponseDTO } from '../../dto/response/post.response.dto.js';

@GatewayController('Posts')
export class PostCommandController extends BasePostGrpcController {

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle publication' })
  @ApiResponse({ status: 201, type: PostResponseDTO })
  async createPost(
    @Body() dto: CreatePostRequestDTO,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<PostResponseDTO> {
    const command = dto.toCommand();
    
    // Appel gRPC avec injection obligatoire de req['internalMetadata']
    const result = await firstValueFrom(
      this.postCommandService.createPost(command, req['internalMetadata']),
    );

    return PostResponseDTO.fromGrpc(result);
  }
}
```

### Règles de Sécurité Inviolables :
- **Administration** : Pour toute route d'administration, utiliser impérativement `@GatewayController('Tag', { admin: true })`[^decorator]. Sans `{ admin: true }`, le garde `RolesGuard` n'est **pas monté**, rendant `@Roles(UserRoles.ADMIN)` totalement inopérant[^seed].
- **Routes Publiques** : Ajouter `@Public()` uniquement pour les endpoints ouverts sans authentification (`/login`, `/refresh`)[^helper].
- **Identité du demandeur** : Pour les routes de profil ou d'action personnelle (`/me`), extraire l'utilisateur exclusivement via `@CurrentUser()`[^app-module]. Ne **jamais** accepter de `userId` dans le body ou les paramètres d'URL pour le demandeur connecté.
- **Ressources scopées par utilisateur** : Utiliser `IsCurrentUserOrAdminGuard` pour les routes ciblant `:userId`.

---

## Étape 3 : Câblage du Client gRPC

1. Le contrôleur hérite du contrôleur de base du domaine (`Base<Domaine>GrpcController`)[^grpc-module].
2. Lors de `onModuleInit`, le contrôleur résout le client typé gRPC via `client.getService<XServiceClient>(X_SERVICE_NAME)`.
3. Si un nouveau package de microservice doit être raccordé (ex. `ms-storage`), l'enregistrer dans `GrpcClientModule` via `getGrpcOptions(GRPC_MICROSERVICES.X, url)`.

---

## Étape 4 : Propagation Obligatoire du Token Interne

Tout microservice en aval exige un `x-internal-token` signé pour autoriser la requête. 

- L'intercepteur global `GrpcInternalInterceptor` génère et attache automatiquement un objet `grpc.Metadata` sur la requête Express : `req['internalMetadata']`[^app-module].
- **Règle absolue :** Vous devez obligatoirement passer `req['internalMetadata']` comme **second argument** de chaque appel gRPC :
  ```typescript
  await firstValueFrom(this.service.someRpc(command, req['internalMetadata']));
  ```
- Omettre cet argument provoque un rejet immédiat du microservice avec le statut `UNAUTHENTICATED`.

---

## Étape 5 : Mapping des Réponses et Gestion du HTTP 206

1. **Mapping d'Erreurs :** Les erreurs `BaseApiError` renvoyées par les microservices portent `statusCode` et `grpcCode`. L'API Gateway les retranscrit avec le statut HTTP d'origine.
2. **Support HTTP 206 `FALLBACK_ACTIVATED` :**
   - Lorsqu'un microservice subit une défaillance de dépendance non bloquante, il déclenche un job de fallback et retourne `FALLBACK_ACTIVATED`[^errors-nest].
   - L'API Gateway doit renvoyer ce résultat avec le code HTTP **206 (Partial Content)** :
   ```typescript
   @ApiResponse({ status: 206, description: 'Traitement asynchrone différé (fallback activé)' })
   ```
   - Le client mobile `nativapp` sait qu'il doit écouter la notification de finalisation via WebSocket.

---

## Étape 6 : Tests & Validation de l'Endpoint

1. **Tests unitaires de Contrôleur :**
   - Mocker le client gRPC (ex: `MockUserClientGrpc`).
   - Mocker l'objet `Request` avec `req['internalMetadata'] = new Metadata()`.
   - Vérifier que le DTO appelle bien `toCommand()` et que le retour est conforme.
2. **Validation Swagger :**
   - Démarrer l'API Gateway ou inspecter la spec générée : vérifier que le tag, les statuts 200/201/206/400/401/403 et les schémas DTO sont intégralement documentés.

---

## Checklist d'Assurance Qualité & Critères d'Arrêt

Avant de déclarer la tâche terminée :
- [ ] Le DTO de requête implémente les décorateurs Swagger et `class-validator`.
- [ ] Le DTO possède sa méthode adaptatrice `toCommand()` ou `toQuery()`.
- [ ] `@GatewayController(tag, { admin: true })` est posé sur toute route d'administration.
- [ ] `req['internalMetadata']` est passé en second argument de **chaque** appel gRPC.
- [ ] Aucun `userId` n'est extrait du payload sur les routes « me ».
- [ ] Les réponses asynchrones avec fallback documentent le statut HTTP 206 (`FALLBACK_ACTIVATED`).
- [ ] `yarn test` passe avec succès sur `api-gateway`.
- [ ] `yarn tsc` et `yarn lint` ne produisent aucune erreur.

[^gw-claude]: Modules de api-gateway (carte : references/routes.md)
[^decorator]: GatewayController
[^app-module]: AppModule (GrpcInternalInterceptor, HelperModule)
[^grpc-module]: GrpcClientModule
[^helper]: TokenHelperController
[^seed]: SystemSeedController
[^deploy-gw]: Déploiement api-gateway (NODE_ENV)
[^errors-nest]: FALLBACK_ACTIVATED (PartialContentError 206)
[^ws-proxy]: WsProxyMiddleware
