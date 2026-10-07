---
name: volontariapp-grpc-microservice
description: "Implémenter ou modifier un RPC dans un microservice gRPC (ms-user, ms-event, ms-post, ms-social) : contrôleur @GrpcMethod command/query, DTO implémentant le contrat, logique dans le package domain-*, guard du token interne, fallback, clients gRPC sortants, migrations. À utiliser pour tout travail dans un ms-*."
type: Agent Skill
title: "Anatomie d'un microservice gRPC"
tags: [microservice, grpc, nestjs, ddd, cqrs]
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
  - sync-migrations
  - transformer
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:54:04Z"
verified:
  - by: claude-code/agent
    at: "2026-10-07T10:04:07Z"
    digest: bd67c4201c058799
  - by: claude-code/agent
    at: "2026-10-07T10:09:32Z"
    digest: adb3907d15477e14
  - by: claude-code/agent
    at: "2026-10-07T10:12:04Z"
    digest: cda7afcfac445243
  - by: claude-code/agent
    at: "2026-10-07T10:13:37Z"
    digest: 933dd2a676c02b92
  - by: claude-code/agent
    at: "2026-10-07T10:16:42Z"
    digest: 97ef31bd6e114295
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

# Anatomie d'un microservice gRPC

Un `ms-*` est une coquille NestJS : il expose les RPC du contrat, valide, vérifie le token interne et délègue toute la logique au package `@volontariapp/domain-<d>`. Une règle métier se change dans le package (règle du STOP), jamais dans le service. Le guide détaillé des patterns (structure de module, DTO, contrôleurs, tests) est `AGENT.md` à la racine de `meta`[^agent-md] ; les faits propres à chaque service sont dans [Services](/volontariapp-grpc-microservice/references/services.md).

## Quand l'utiliser

Nouveau RPC, nouveau champ renvoyé, nouvelle règle de validation d'entrée, appel d'un autre service. Avant : `analyze_grpc({ target: "<Méthode>" })` pour voir le contrat, le handler existant et les clients.

## Structure

| Élément | Règle |
| :--- | :--- |
| Bootstrap | Hybride : `connectMicroservice(getGrpcOptions(GRPC_MICROSERVICES.X, msXUrl))` puis `app.listen(port)` pour `/health`[^main-user] |
| Contrôleurs | `controllers/command*/` et `controllers/queries/`, `@GrpcMethod(GRPC_SERVICES.X, X_METHODS.Y)` avec les constantes de `@volontariapp/contracts-nest` (jamais de chaîne en dur) |
| DTO | `dto/request/{command,query}` et `dto/response`, chaque DTO `implements` l'interface du contrat ; décorateurs `class-validator` |
| Validation | `GrpcValidationPipe` en `APP_PIPE` avec `enumMaps`[^app-event] : `""` devient `undefined`, Int64 en `number`, enum string en valeur numérique[^validation] |
| Token interne | `GrpcInternalGuard` : global en `APP_GUARD` dans `ms-event`, `ms-post`, `ms-social` ; posé contrôleur par contrôleur dans `ms-user`. `@CurrentUser()` donne l'utilisateur : ne jamais lire l'acteur dans le payload |
| Logique | Services et repositories du package `domain-<d>`, injectés comme providers ; transformers DTO vers entité dans le service (`ms-event`) |
| Fallback | `BaseCommandController.withFallback(jobType, userId, payload, op)` dans `ms-user` et `ms-event` uniquement : pas de job sur 400/404/409, sinon job `FALLBACK_*` et réponse `FALLBACK_ACTIVATED` (HTTP 206 côté gateway)[^base-cmd]. Voir `volontariapp-implement-async-job-flow` |
| Clients sortants | `ClientGrpc` sur le package du service cible ; propager le `x-internal-token` reçu dans les `Metadata` de l'appel |
| Migrations | `src/migrations/common/` (outbox, `job_audit`, triggers) synchronisées entre services par `sync-migrations.sh` (`SERVICES=("user" "social" "post" "event")`, sans `storage`)[^sync-mig] ; `src/migrations/domain/` propres au service, souvent copiées du package `domain-*` |

## Règles

- [ ] Pas de logique métier dans le service : si une règle change, c'est `domain-<d>` (STOP, changeset, snapshot).
- [ ] Erreurs typées `@volontariapp/errors` / `errors-nest` (`*_NOT_FOUND`, `FORBIDDEN`), jamais `throw new Error`.
- [ ] Tests : `*.spec.ts`, mocks dans `*.mock.ts`, factories dans `*.factory.ts`, `jest.spyOn` et `restoreAllMocks`.
- [ ] Un champ de contrat absent du `.proto` n'arrive jamais par gRPC, même s'il existe dans le DTO (cas de `fileIds`, `avatarFileId`) : vérifier le `.proto` avant de coder la lecture.

## Dette existante (à ne pas recopier)

- `BaseCommandController` dupliqué dans chaque service, avec un `@ts-expect-error` sur le payload du job.
- Clients sortants et `StorageClientService` dupliqués, avec casts (`as QueryServiceWithMetadata`, `err as Error`).

[^agent-md]: AGENT.md (structure de module, DTO, contrôleurs, tests)
[^main-user]: Bootstrap hybride (gRPC + HTTP /health)
[^app-event]: AppModule ms-event (GrpcValidationPipe, APP_GUARD)
[^validation]: GrpcValidationPipe
[^base-cmd]: BaseCommandController.withFallback
[^sync-mig]: sync-migrations.sh
