---
name: volontariapp-grpc-microservice
description: "Playbook opérationnel pas-à-pas pour implémenter ou modifier un RPC dans un microservice gRPC (ms-user, ms-event, ms-post, ms-social) : contrat, DTO, contrôleur CQRS, garde interne, fallback, mappers et tests."
type: Playbook
title: Implémenter ou Modifier un RPC gRPC
tags: [microservice, grpc, nestjs, ddd, cqrs, playbook]
status: stable
paths:
  - "ms-user/src/**"
  - "ms-event/src/**"
  - "ms-post/src/**"
  - "ms-social/src/**"
  - sync-migrations.sh
mesh_keys:
  - ms-user
  - ms-event
  - ms-post
  - ms-social
  - basecommandcontroller
  - grpcvalidationpipe
  - grpcinternalguard
  - transformer
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:54:04Z"
verified:
  - by: claude-code/agent
    at: "2026-10-12T12:03:25Z"
    digest: d633307574e5375f
  - by: claude-code/agent
    at: "2026-10-13T09:48:35Z"
    digest: b1ef8575e36fb67b
  - by: claude-code/agent
    at: "2026-10-13T11:38:32Z"
    digest: fd34ffcd91a0c2f7
  - by: claude-code/agent
    at: "2026-10-13T16:28:32Z"
    digest: a7534fc81f9da9d7
  - by: claude-code/agent
    at: "2026-10-13T22:04:28Z"
    digest: d43a569557620594
sources:
  - id: agent-md
    resource: AGENT.md
    title: "AGENT.md (structure de module, DTO, contrôleurs, tests)"
  - id: main-user
    resource: ms-user/src/main.ts
    title: Bootstrap hybride (gRPC + HTTP /health)
  - id: app-event
    resource: ms-event/src/app.module.ts
    title: "AppModule ms-event (GrpcValidationPipe, APP_GUARD)"
  - id: base-cmd
    resource: ms-event/src/modules/event/controllers/commands/base.command.controller.ts
    title: BaseCommandController.withFallback
  - id: sync-mig
    resource: sync-migrations.sh
    title: sync-migrations.sh
  - id: validation
    resource: npm-packages/packages/validation-nest
    title: GrpcValidationPipe
---

# Playbook : Implémenter ou Modifier un RPC gRPC dans un Microservice

Dans l'architecture Volontariapp, un microservice `ms-*` est une coquille NestJS purement dédiée à l'exposition gRPC (port 3000) et HTTP `/health`[^main-user] : il valide les messages entrants, applique la garde du token interne de sécurité, et délègue l'exécution métier au package de domaine partagé `@volontariapp/domain-<domaine>`.

La documentation d'architecture détaillée et les conventions structurelles sont disponibles dans [Architecture Microservice](/volontariapp-grpc-microservice/references/microservice-architecture.md) et `AGENT.md`[^agent-md].

---

## Trigger

Ce playbook doit être exécuté dès qu'une tâche nécessite :
- L'ajout d'une nouvelle méthode RPC `rpc Method(Command) returns (Response)` dans un microservice existant.
- La modification d'un endpoint gRPC existant (nouveau champ reçu ou retourné, ajustement de validation).
- L'ajout d'un appel gRPC sortant vers un autre microservice du mesh.

---

## Étape 1 : Vérification des Contrats Amont & Règle du STOP

Avant d'écrire la moindre ligne de code dans `ms-*` :

1. **Localiser la méthode dans le graphe gRPC :**
   ```json
   analyze_grpc({ "target": "<MethodName>" })
   ```
2. **Contrôler la présence du contrat dans `@volontariapp/contracts-nest` :**
   - L'interface de commande/requête, l'interface de réponse et les constantes de service (`GRPC_SERVICES`, `<SERVICE>_METHODS`) doivent être exportées par le package publié.
   
> [!CAUTION]
> ### 🛑 RÈGLE CRITIQUE DU STOP IMMÉDIAT
> Si le RPC, le message ou le champ n'existe pas encore dans les contrats TypeScript :
> 1. **INTERDICTION FORMELLE** de créer des interfaces locales temporaires ou d'injecter des types arbitraires.
> 2. Dérouler d'abord le playbook [`volontariapp-proto-contract-evolution`](/volontariapp-proto-contract-evolution/SKILL.md) dans `proto-registry/`.
> 3. Attendre la publication de `@volontariapp/contracts-nest` par la CI.
> 4. Mettre à jour les dépendances du microservice : `yarn up @volontariapp/contracts-nest`.

---

## Étape 2 : Création des DTOs de Requête (Validation)

Emplacement : `src/modules/<domaine>/dto/request/{command,query}/`.

Chaque DTO de commande ou requête **doit impérativement** implémenter l'interface TypeScript du contrat gRPC et définir des règles `class-validator` strictes :

```typescript
import { IsString, IsNotEmpty, IsUUID, IsEnum, IsOptional } from 'class-validator';
import type { CreateEventCommand, EventType } from '@volontariapp/contracts-nest';

export class CreateEventCommandDTO implements CreateEventCommand {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(EventType)
  type!: EventType;

  @IsUUID()
  @IsOptional()
  coverFileId?: string;
}
```

- **Règles de validation automatique** : `GrpcValidationPipe` est configuré en `APP_PIPE` global avec `enumMaps`[^app-event][^validation]. Il convertit les chaînes vides en `undefined`, les entiers Int64 en `number`, et les noms d'enums sous forme de string en valeurs numériques conformes Protobuf.
- **Défense en profondeur** : Utiliser l'assertion d'assignation définie `!` pour les champs obligatoires du contrat (aucun `any`).

---

## Étape 3 : Câblage Métier dans `@volontariapp/domain-*`

Les microservices `ms-*` n'ont **aucune logique métier propre** :

1. Les entités TypeORM, modèles, règles de gestion et repositories résident dans le package partagé `@volontariapp/domain-<domaine>`.
2. Si la nouvelle méthode RPC requiert une nouvelle règle de calcul, une transaction ou une transition d'état :
   - Modifier d'abord `npm-packages/packages/domain-<domaine>/`.
   - Appliquer le playbook [`volontariapp-shared-npm-package-change`](/volontariapp-shared-npm-package-change/SKILL.md) avec bump changeset et publication snapshot.
   - Lancer `yarn up @volontariapp/domain-<domaine>` dans le microservice consommateur.
3. Injecter le service de domaine comme provider dans `<Domaine>Module`.

---

## Étape 4 : Implémentation du Controller gRPC (CQRS)

Les contrôleurs sont strictement scindés selon le pattern CQRS :
- Écriture : `src/modules/<domaine>/controllers/commands/<entite>.command.controller.ts`
- Lecture : `src/modules/<domaine>/controllers/queries/<entite>.query.controller.ts`

### Contrôleur de Commande (avec Fallback éventuel) :
```typescript
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Logger } from '@volontariapp/logger';
import { GRPC_SERVICES, EVENT_COMMAND_METHODS } from '@volontariapp/contracts-nest';
import { CurrentUser, type AuthUser } from '@volontariapp/auth';
import { BaseCommandController } from './base.command.controller.js';
import { CreateEventCommandDTO } from '../../dto/request/command/create-event.command.dto.js';
import { CreateEventResponseDTO } from '../../dto/response/create-event.response.dto.js';
import { EventResponseMapper } from '../../mappers/event-response.mapper.js';
import { EventDomainService } from '@volontariapp/domain-event';

@Controller()
export class EventCommandController extends BaseCommandController {
  private readonly logger = new Logger({ context: EventCommandController.name });

  constructor(private readonly eventService: EventDomainService) {
    super();
  }

  @GrpcMethod(GRPC_SERVICES.EVENT_COMMAND_SERVICE, EVENT_COMMAND_METHODS.CREATE_EVENT)
  async createEvent(
    data: CreateEventCommandDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateEventResponseDTO> {
    this.logger.info(`gRPC CreateEvent: ${data.title} par user ${user.id}`);

    // Exécution avec fallback pour absorption des pannes de dépendances
    const entity = await this.withFallback(
      JobMessagingType.FALLBACK_CREATE_EVENT,
      user.id,
      data,
      async () => this.eventService.createEvent(user.id, data),
    );

    return EventResponseMapper.toCreateResponseDTO(entity);
  }
}
```

- **Identification de l'acteur** : L'identité provient exclusivement du décorateur `@CurrentUser()` injecté par `GrpcInternalGuard` depuis l'`INTERNAL_TOKEN`. Ne **jamais** lire l'acteur dans le corps du message DTO[^app-event].
- **Gestion `withFallback`** : Héritée de `BaseCommandController`[^base-cmd], cette méthode ne déclenche aucun job en cas d'erreur client (400, 404, 409, et aussi 403 dans `ms-event` ; vérifier les autres `ms-*` avant de supposer le même comportement). Sur panne système ou dépendance injoignable, elle insère un job dans `jobs_outbox` et renvoie la réponse typée `FALLBACK_ACTIVATED` (traduite en HTTP 206 par l'API Gateway).

---

## Étape 5 : Mappers & DTOs de Réponse

1. Définir le DTO de réponse sous `src/modules/<domaine>/dto/response/<entite>.response.dto.ts` en implémentant l'interface du contrat (ex. `CreateEventResponse`).
2. Implémenter la transformation dans `src/modules/<domaine>/mappers/<domaine>-response.mapper.ts` :
   - Conversion des dates en chaînes ISO 8601 UTC ou timestamps conformes au `.proto`.
   - Transformation des enums numériques et normalisation des relations.
   - Ne jamais exposer directement l'entité TypeORM brute sur le bus gRPC.

---

## Étape 6 : Stratégie de Tests Obligatoires

Chaque nouveau RPC ou modification doit être couvert par des tests unitaires stricts :

1. **Isolation des Mocks & Factories :**
   - Mocks obligatoires dans un fichier dédié : `src/modules/<d>/__tests__/<nom>.mock.ts`.
   - Données de test générées par factories dédiées : `src/modules/<d>/__tests__/<nom>.factory.ts`.
   - Interdiction formelle de déclarer des objets `as unknown as Type` ou `any` inline dans les tests.
2. **Utilisation rigoureuse de Spies :**
   - Toujours espionner les appels de dépendances avec `jest.spyOn()`.
   - Nettoyage systématique dans `afterEach(() => { jest.restoreAllMocks(); })`.
3. **Cas de test obligatoires :**
   - Cas nominal : renvoi du DTO de réponse avec mapping exact.
   - Cas d'erreur métier : validation des exceptions typées (`@volontariapp/errors` ou `@volontariapp/errors-nest`).
   - Cas de refus d'authentification : rejet si `x-internal-token` est manquant.

---

## Checklist d'Assurance Qualité & Critères d'Arrêt

Avant de déclarer la tâche terminée :
- [ ] Le RPC et ses DTOs proviennent exclusivement de `@volontariapp/contracts-nest` (aucun type inventé).
- [ ] Aucun bout de logique métier n'a été inséré dans `src/` (délégué à `domain-<domaine>`).
- [ ] Aucun cast `as unknown as Type` ni `any` n'est présent.
- [ ] L'acteur est extrait via `@CurrentUser()`, jamais depuis le body.
- [ ] Les mappers transforment proprement les entités en DTOs gRPC.
- [ ] `yarn test` passe avec succès sur le microservice.
- [ ] `yarn tsc` et `yarn lint` ne produisent aucune erreur.
- [ ] En cas de migration de base de données associée : exécuter `sync-migrations.sh` si commune[^sync-mig].

[^agent-md]: AGENT.md (structure de module, DTO, contrôleurs, tests)
[^main-user]: Bootstrap hybride (gRPC + HTTP /health)
[^app-event]: AppModule ms-event (GrpcValidationPipe, APP_GUARD)
[^validation]: GrpcValidationPipe
[^base-cmd]: BaseCommandController.withFallback
[^sync-mig]: sync-migrations.sh
