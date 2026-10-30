---
type: Reference
title: Catalogue des packages @volontariapp
description: "Rôle, version, API réellement exportée de chaque package de npm-packages, et écarts connus entre README et code."
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
    resource: npm-packages/package.json
    title: "npm-packages/package.json (workspaces, scripts)"
  - id: consumers
    resource: .agents/skills/volontariapp-shared-npm-package-change/scripts/consumers.py
    title: consumers.py
---

# Schema

Versions relevées le 2026-10-28 dans `packages/*/package.json`[^packages]. Pour les consommateurs d'un package : `scripts/consumers.py <package>`[^consumers].

| Package | Version | Rôle | Point d'entrée réel |
| :--- | :--- | :--- | :--- |
| `shared` | 0.17.0 | Enums et types partagés avec `nativapp` (dont l'enum `Streams`) | `src/enums`, `src/types` |
| `contracts` | 4.8.2 | Types TS générés depuis `proto-registry`, compatibles front | généré par la CI, ne pas éditer `src/` hors `src/gateway/` (écrit à la main : types `*Request` et `*WebResponse` partagés avec api-gateway et nativapp) ; chaque module généré (dont `storage`) doit être exporté dans `src/index.ts`, sinon le front n'a pas accès à ses enums |
| `contracts-nest` | 3.4.1 | Clients et décorateurs NestJS gRPC | `getGrpcOptions`, `GRPC_MICROSERVICES`, `GRPC_SERVICES`, `*_METHODS`, `*_SERVICE_NAME` ; seul `grpc.helpers.ts` est édité à la main |
| `storage-client` | 0.3.6 | Client gRPC de ms-storage pour le rattachement de fichiers (ms-user, ms-post, ms-event) | `StorageClientModule`, `StorageClientService.confirm*Attachment`. Les erreurs métier de ms-storage sont relayées avec leur statut et leur code (`StorageRelayedError`) ; les pannes de transport restent `STORAGE_TIMEOUT` et `STORAGE_ATTACHMENT_FAILED`. `isStorageUnavailable(error)` et `StorageUnavailableError` (503) pour les consommateurs sans repli asynchrone |
| `messaging` | 2.28.1 | Contrats Jobs, Events, WebSockets, sagas | `JobMessagingType`, `JobRegistry`, `EventMessagingType`, `EventRegistry`, `WebsocketMessagingType`, `SagaGatherType` |
| `database` | 3.10.13 | Modèles et moteur outbox TypeORM, gather | `EventQueueEntity.createEvent`, `JobsOutboxEntity.createJob`, `OutboxConsumer`, `OutboxDispatcher`, `OutboxStatus`, `GatherStateModel` |
| `outbox` | 0.10.17 | Writers, consumers, dispatchers, pushers par table | `EventQueueWriter`, `JobsOutboxWriter`, repositories `EventQueueRepository`, `JobsOutboxRepository` |
| `workers` | 1.4.15 | Base des workers BullMQ | `BaseWorker`, `JobOf`, `JobAuditRepository`, `createBullConfig`, `DiagnosticServer` |
| `post-processors` | 3.3.15 | Base des consommateurs de streams | `BasePostProcessor`, `SinglePostProcessor`, `BatchPostProcessor`, `JobOutboxSuccessPostProcessor`, `JobOutboxFailedPostProcessor` |
| `auth` | 3.3.23 | JWT et token interne, **couplé à NestJS** | `JwtService`, `AccessTokenGuard`, `RolesGuard`, `GrpcInternalGuard`, `GrpcInternalInterceptor`, `@CurrentUser`, `@Public` |
| `errors` | 0.6.5 | Erreurs typées HTTP + gRPC | `BaseError`, `BaseApiError` (`statusCode`, `grpcCode`), `NotFoundError`, `InternalServerError`... `isBaseApiError` |
| `errors-nest` | 0.14.0 | Erreurs nommées et réponses Swagger | constantes `*_NOT_FOUND`, `FALLBACK_ACTIVATED`, `Api*Response` |
| `config` | 3.3.2 | Configs typées, fail fast | `loadConfig(dirPath, schema)`, `BaseConfig`, configs db/auth/outbox |
| `validation-nest` | 0.1.5 | Pipe gRPC (Int64, `""` vers `undefined`, enums string vers number) | `GrpcValidationPipe` |
| `bridge` / `bridge-nest` | 1.0.10 / 0.3.21 | Connexions Postgres, Neo4j, Redis | `PostgresProvider`... / `PostgresBridgeModule`, `NestPostgresProvider`... |
| `health-check` / `health-check-nest` | 1.0.10 / 0.1.42 | Santé des connexions existantes | `DatabaseHealthOrchestrator` / `HealthModule` (`GET /health`) |
| `logger` | 0.4.0 | Logs JSON ou texte, Node, Nest, React Native | `Logger` |
| `crypto` | 0.3.13 | AES-GCM, RSA, scrypt, HMAC | `encrypt`, `hashPassword`, `calculateHash`, `safeCompare` |
| `monitoring` | 2.2.2 | Tracing OpenTelemetry | `initTracing` |
| `testing` | 1.0.3 | Mocks et helpers de test | `createMock`, `createMockLogger`, `waitFor`, `randomUuid` |
| `eslint-config` | 2.2.5 | Config ESLint flat partagée | |
| `domain-user` | 2.13.1 | Domaine User, auth, badges | `AuthService`, `UserService`, `BadgeService`, repositories Postgres, triggers SQL |
| `domain-event` | 3.12.4 | Domaine Event, géocodage, triggers CDC | `EventService`, `PostgresEventRepository`, `GeocodingService`, `EVENTS_TRIGGER` |
| `domain-post` | 3.9.1 | Domaine Post et Comment | `PostService`, `CommentService`, `PostgresPostRepository` (outbox intégré) |
| `domain-social` | 0.14.20 | Graphe Neo4j | services et `Neo4j*Repository`, value objects d'id |
| `domain-storage` | 0.12.8 | Enums, value objects, politiques, helpers d'URL et d'object key, modèles et repositories typeorm | `FileStatus`, `EntityType`, `FileId`, `MimeType`, `buildPublicFileUrl` ; sous-chemins `./helpers` et `./enums` sans typeorm, la racine charge les modèles et ne se charge pas dans la gateway ; pas de README |
| `domain-ranking` | 0.2.0 | Domaine Ranking (`ms-ranking`, `worker-ranking`, `post-processor-ranking`) : modèles `ranking_*`, repositories, services et politiques de score purs, port `RankingScorer` (Jev) | `RankingRequestService`, `RankingScorer`, `NoopRankingScorer`, `registerRankingMappings()` (appelé à l'import de la racine, comme `domain-post`) ; README du package pour le détail |
| `storage-pipeline` | 0.3.12 | Pipeline de fichiers : client S3, signature de POST, magic bytes, scanner clamd, ré-encodage d'images | `config/`, `s3/`, `validation/`, `scanner/`, `processing/`, `pipeline/` (exports de `src/index.ts`) |

# Écarts README / code

Les README de packages sont en partie génériques. Le code et ce catalogue font foi[^npm-claude].

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
[^npm-claude]: npm-packages/package.json (workspaces, scripts)
[^consumers]: consumers.py
