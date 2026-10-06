---
type: Reference
title: Catalogue des packages @volontariapp
description: Rôle, version, API réellement exportée de chaque package de npm-packages, et écarts connus entre README et code.
tags: [npm-packages, catalogue, doc-drift]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T09:40:00Z"
sources:
  - id: packages
    resource: npm-packages/packages
    title: Sources des packages (src/index.ts de chacun)
  - id: npm-claude
    resource: npm-packages/CLAUDE.md
    title: npm-packages/CLAUDE.md
  - id: consumers
    resource: .agents/skills/volontariapp-shared-npm-package-change/scripts/consumers.py
    title: consumers.py
---

# Schema

Versions relevées le 2026-10-06 dans `packages/*/package.json`[^packages]. Pour les consommateurs d'un package : `scripts/consumers.py <package>`[^consumers].

| Package | Version | Rôle | Point d'entrée réel |
| :--- | :--- | :--- | :--- |
| `shared` | 0.9.1 | Enums et types partagés avec `nativapp` (dont l'enum `Streams`) | `src/enums`, `src/types` |
| `contracts` | 4.3.8 | Types TS générés depuis `proto-registry`, compatibles front | généré par la CI, ne pas éditer `src/` |
| `contracts-nest` | 3.3.0 | Clients et décorateurs NestJS gRPC | `getGrpcOptions`, `GRPC_MICROSERVICES`, `GRPC_SERVICES`, `*_METHODS`, `*_SERVICE_NAME` ; seul `grpc.helpers.ts` est édité à la main |
| `messaging` | 2.17.1 | Contrats Jobs, Events, WebSockets, sagas | `JobMessagingType`, `JobRegistry`, `EventMessagingType`, `EventRegistry`, `WebsocketMessagingType`, `SagaGatherType` |
| `database` | 3.4.17 | Modèles et moteur outbox TypeORM, gather | `EventQueueEntity.createEvent`, `JobsOutboxEntity.createJob`, `OutboxConsumer`, `OutboxDispatcher`, `OutboxStatus`, `GatherStateModel` |
| `outbox` | 0.9.54 | Writers, consumers, dispatchers, pushers par table | `EventQueueWriter`, `JobsOutboxWriter`, repositories `EventQueueRepository`, `JobsOutboxRepository` |
| `workers` | 1.3.22 | Base des workers BullMQ | `BaseWorker`, `JobOf`, `JobAuditRepository`, `createBullConfig`, `DiagnosticServer` |
| `post-processors` | 3.2.21 | Base des consommateurs de streams | `BasePostProcessor`, `SinglePostProcessor`, `BatchPostProcessor`, `JobOutboxSuccessPostProcessor`, `JobOutboxFailedPostProcessor` |
| `auth` | 3.3.12 | JWT et token interne, **couplé à NestJS** | `JwtService`, `AccessTokenGuard`, `RolesGuard`, `GrpcInternalGuard`, `GrpcInternalInterceptor`, `@CurrentUser`, `@Public` |
| `errors` | 0.6.2 | Erreurs typées HTTP + gRPC | `BaseError`, `BaseApiError` (`statusCode`, `grpcCode`), `NotFoundError`, `InternalServerError`... `isBaseApiError` |
| `errors-nest` | 0.13.2 | Erreurs nommées et réponses Swagger | constantes `*_NOT_FOUND`, `FALLBACK_ACTIVATED`, `Api*Response` |
| `config` | 3.2.2 | Configs typées, fail fast | `loadConfig(dirPath, schema)`, `BaseConfig`, configs db/auth/outbox |
| `validation-nest` | 0.1.5 | Pipe gRPC (Int64, `""` vers `undefined`, enums string vers number) | `GrpcValidationPipe` |
| `bridge` / `bridge-nest` | 1.0.6 / 0.3.17 | Connexions Postgres, Neo4j, Redis | `PostgresProvider`... / `PostgresBridgeModule`, `NestPostgresProvider`... |
| `health-check` / `health-check-nest` | 1.0.6 / 0.1.37 | Santé des connexions existantes | `DatabaseHealthOrchestrator` / `HealthModule` (`GET /health`) |
| `logger` | 0.2.7 | Logs JSON ou texte, Node, Nest, React Native | `Logger` |
| `crypto` | 0.3.10 | AES-GCM, RSA, scrypt, HMAC | `encrypt`, `hashPassword`, `calculateHash`, `safeCompare` |
| `monitoring` | 2.1.7 | Tracing OpenTelemetry | `initTracing` |
| `testing` | 1.0.3 | Mocks et helpers de test | `createMock`, `createMockLogger`, `waitFor`, `randomUuid` |
| `eslint-config` | 2.2.5 | Config ESLint flat partagée | |
| `domain-user` | 2.8.37 | Domaine User, auth, badges | `AuthService`, `UserService`, `BadgeService`, repositories Postgres, triggers SQL |
| `domain-event` | 3.7.11 | Domaine Event, géocodage, triggers CDC | `EventService`, `PostgresEventRepository`, `GeocodingService`, `EVENTS_TRIGGER` |
| `domain-post` | 3.6.25 | Domaine Post et Comment | `PostService`, `CommentService`, `PostgresPostRepository` (outbox intégré) |
| `domain-social` | 0.12.9 | Graphe Neo4j | services et `Neo4j*Repository`, value objects d'id |
| `domain-storage` | 0.3.0 | Enums et value objects storage, **pas de modèle ni repository** | `FileStatus`, `EntityType`, `FileId`, `MimeType` ; pas de README |

# Écarts README / code

Les README de packages sont en partie génériques. Le code et `npm-packages/CLAUDE.md`[^npm-claude] font foi.

| README | Affirme | Réalité |
| :--- | :--- | :--- |
| `workers` | `BaseJobHandler`, `processJob(payload)` | `BaseWorker<K>` + handlers `IJobHandler` déclarés dans chaque worker |
| `outbox` | Table `event_outbox`, `writer.write({ queueName, jobName })` | Tables `jobs_outbox` et `event_queue` ; les services créent leurs lignes avec `JobsOutboxEntity.createJob` / `EventQueueEntity.createEvent` |
| `messaging` | Les événements viennent de triggers CDC | Majoritairement `createEvent` dans les repositories ; triggers pour `domain-event` (CDC) et `user.created` |
| `auth` | Agnostique, aucune dépendance NestJS, `JwtVerifier` | Guards, module, interceptor NestJS ; `JwtService` |
| `errors` | `DomainError` / `InfrastructureError` | `BaseError` / `BaseApiError` et une classe par statut HTTP |
| `domain-*` | Exemples génériques (`PaymentService`, `FriendshipRelation`, `PostContent`) | Voir les `CLAUDE.md` de `ms-*` pour les vrais agrégats et invariants |
| Fichiers `ARCHITECTURE.md` des `ms-*` | RabbitMQ, Kafka, table `outbox_events` | Redis Streams et BullMQ, table `event_queue` |

[^packages]: Sources des packages (src/index.ts de chacun)
[^npm-claude]: npm-packages/CLAUDE.md
[^consumers]: consumers.py
