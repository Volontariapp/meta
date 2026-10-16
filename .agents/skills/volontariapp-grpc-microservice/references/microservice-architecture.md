---
type: Concept
title: "Architecture et Structure d'un Microservice gRPC"
description: "Anatomie technique d'un microservice gRPC NestJS dans Volontariapp (bootstrap hybride, structure DDD/CQRS, guards et dettes connues)."
tags: [microservice, grpc, nestjs, architecture, ddd, cqrs]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:54:04Z"
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

# Architecture et Structure d'un Microservice gRPC

Un microservice `ms-*` est une coquille d'infrastructure NestJS : il expose les RPC du contrat, valide les entrées, vérifie le token interne d'autorisation et délègue toute la logique métier au package partagé `@volontariapp/domain-<domaine>`. Une règle métier se change toujours dans le package (règle du STOP), jamais dans le service.

Le guide détaillé des patterns (structure de module, DTO, contrôleurs, tests) est consigné dans `AGENT.md` à la racine de `meta`[^agent-md] ; les spécificités propres à chaque service sont répertoriées dans [Services](/volontariapp-grpc-microservice/references/services.md).

---

## 1. Structure Technique Globale

| Élément | Règle d'implémentation |
| :--- | :--- |
| **Bootstrap** | Hybride : `connectMicroservice(getGrpcOptions(GRPC_MICROSERVICES.X, msXUrl))` puis `app.listen(port)` pour `/health`[^main-user] |
| **Contrôleurs** | `controllers/commands/` et `controllers/queries/`, `@GrpcMethod(GRPC_SERVICES.X, X_METHODS.Y)` avec les constantes de `@volontariapp/contracts-nest` (jamais de chaîne en dur) |
| **DTO** | `dto/request/{command,query}` et `dto/response`, chaque DTO `implements` l'interface du contrat ; décorateurs `class-validator` |
| **Validation** | `GrpcValidationPipe` en `APP_PIPE` avec `enumMaps`[^app-event] : `""` devient `undefined`, Int64 en `number`, enum string en valeur numérique[^validation] |
| **Token interne** | `GrpcInternalGuard` : global en `APP_GUARD` dans `ms-event`, `ms-post`, `ms-social` ; posé contrôleur par contrôleur dans `ms-user`. `@CurrentUser()` injecte l'utilisateur authentifié : ne jamais lire l'acteur dans le payload |
| **Logique métier** | Services et repositories du package `domain-<d>`, injectés comme providers ; transformers DTO vers entité dans le service (`ms-event`) |
| **Fallback** | `BaseCommandController.withFallback(jobType, userId, payload, op)` dans `ms-user` et `ms-event` : aucun job sur 400/404/409 (et 403 dans `ms-event` uniquement), sinon job `FALLBACK_*` et réponse `FALLBACK_ACTIVATED` (HTTP 206 côté gateway)[^base-cmd] |
| **Clients sortants** | `ClientGrpc` sur le package du service cible ; propager le `x-internal-token` reçu dans les `Metadata` de l'appel |
| **Migrations** | `src/migrations/common/` (outbox, `job_audit`, triggers) synchronisées entre services par `sync-migrations.sh` (`SERVICES=("user" "social" "post" "event")`, sans `storage`)[^sync-mig] ; `src/migrations/domain/` propres au service, souvent copiées du package `domain-*` |

---

## 2. Dettes Techniques Existantes (à ne pas reproduire)

- `BaseCommandController` dupliqué dans chaque service, avec un `@ts-expect-error` sur le payload du job.
- Clients sortants dupliqués, avec des casts (`as QueryServiceWithMetadata`, `err as Error`). Pour ms-storage, ne pas recréer de client local : utiliser `StorageClientModule.registerAsync` de `@volontariapp/storage-client`. Son `STORAGE_CLIENT_OPTIONS` doit être exporté par un module listé dans `imports` (ms-user : `StorageClientConfigModule`), un `useFactory` direct ne suffit pas.

[^agent-md]: AGENT.md (structure de module, DTO, contrôleurs, tests)
[^main-user]: Bootstrap hybride (gRPC + HTTP /health)
[^app-event]: AppModule ms-event (GrpcValidationPipe, APP_GUARD)
[^validation]: GrpcValidationPipe
[^base-cmd]: BaseCommandController.withFallback
[^sync-mig]: sync-migrations.sh
