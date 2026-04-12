# AGENT.md — Technical Survival Guide
> Volontariapp · NestJS Microservices Monorepo

---

## 1. Repository Map

```
meta/                           ← root monorepo (Yarn 4 workspaces)
├── api-gateway/                ← REST → gRPC edge layer (HTTP/REST, Swagger)
├── ms-user/                    ← User microservice (gRPC, PostgreSQL + Neo4j)
├── ms-post/                    ← Post microservice  (gRPC, PostgreSQL + Neo4j)
├── ms-event/                   ← Event microservice (gRPC, PostgreSQL + Neo4j)
├── nativapp/                   ← React Native / Expo mobile app
├── npm-packages/packages/      ← Internal @volontariapp/* libraries (source)
├── proto-registry/             ← Protobuf definitions (source of truth for gRPC)
├── ci-tools/                   ← Observability / Grafana / monitoring tooling
├── changelog-checker/          ← Changelog validation CLI
└── scripts/                    ← Shared shell utilities
```

---

## 2. Architecture

```
Mobile App (nativapp)
       │ HTTP/REST
       ▼
api-gateway  ─── gRPC ──► ms-user   (PostgreSQL + Neo4j)
                  │
                  ├── gRPC ──► ms-post  (PostgreSQL + Neo4j)
                  │
                  └── gRPC ──► ms-event (PostgreSQL + Neo4j)
```

- **Transport:** `@nestjs/microservices` with `@grpc/grpc-js`
- **Proto source:** `proto-registry/`; consumed by all services via `grpc-packages.ts`
- **Logger:** always `new Logger({ context: ClassName.name })` from `@volontariapp/logger`
- **Tracing:** OpenTelemetry bootstrapped in `tracing.ts` before app init

---

## 3. Module Structure (per Microservice)

```
src/
├── app.module.ts                   ← AppModule + AppModule.register(config)
├── main.ts
├── tracing.ts
├── config/
│   ├── base-config.ts              ← CustomConfig type (Joi schema root)
│   ├── app-config.module.ts
│   ├── app-config.service.ts
│   └── app-config.constants.ts
├── grpc/
│   ├── grpc-packages.ts            ← injection tokens (e.g. POST_PACKAGE)
│   ├── grpc-client.module.ts
│   └── grpc-client.options.ts
├── common/
│   ├── filters/grpc-exception.filter.ts
│   └── pipes/validation.pipe.ts
├── providers/
│   └── database/
│       ├── database.module.ts
│       ├── postgres/postgres.provider.ts
│       └── neo4j/neo4j.provider.ts
└── modules/
    └── <domain>/
        ├── <domain>.module.ts
        ├── controllers/
        │   ├── <domain>.command.controller.ts
        │   └── <domain>.query.controller.ts
        ├── dto/
        │   ├── request/
        │   │   ├── command/        ← CreateXxxCommandDTO, UpdateXxxCommandDTO …
        │   │   └── query/          ← XxxQueryDTO, SearchXxxsQueryDTO …
        │   └── response/           ← XxxResponseDTO, ListXxxsResponseDTO
        └── mappers/
            └── <domain>-response.mapper.ts
```

### API Gateway Module Structure

```
src/modules/<domain>/
├── <domain>.module.ts
├── controllers/<domain>.controller.ts   ← REST controller (OnModuleInit + getService)
└── dto/
    ├── common/
    ├── request/                         ← XxxRequestDTO (implements toCommand/toQuery)
    └── response/                        ← XxxResponseDTO
```

---

## 4. Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Command DTO (ms-*) | `Create<X>CommandDTO` | `CreateEventCommandDTO` |
| Query DTO (ms-*) | `<X>QueryDTO` | `EventQueryDTO` |
| Request DTO (gateway) | `Create<X>RequestDTO` | `CreatePostRequestDTO` |
| Response DTO | `<X>ResponseDTO` | `EventResponseDTO` |
| List Response DTO | `List<X>sResponseDTO` | `ListPostsResponseDTO` |
| Command Controller | `<X>CommandController` | `EventCommandController` |
| Query Controller | `<X>QueryController` | `EventQueryController` |
| REST Controller | `<X>Controller` | `PostController` |
| Mapper | `<domain>-response.mapper.ts` | `event-response.mapper.ts` |
| Module | `<X>Module` | `EventModule` |
| Service | `<X>Service` | `EventService` |
| Factory (tests) | `<X>Factory` | `EventFactory` |
| Mock (tests) | `Mock<X>Service` | `MockEventService` |

---

## 5. DTO Patterns

### Microservice DTO — implements contract interface
```typescript
// DTOs implement contracts from @volontariapp/contracts or @volontariapp/contracts-nest
// Never use `any`. Use definite assignment assertions (!) for required fields.
import type { CreateEventCommand, EventType, Point } from '@volontariapp/contracts-nest';

export class CreateEventCommandDTO implements CreateEventCommand {
  title!: string;
  type!: EventType;           // enum from contracts — never redefine locally
  location!: Point;           // typed from contracts — never use object/Record<string,any>
  tagIds!: string[];
}
```

### Gateway Request DTO — adds `toCommand()` / `toQuery()` adapter
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';
import type { CreatePostCommand } from '@volontariapp/contracts-nest';

export class CreatePostRequestDTO {
  @ApiProperty()
  @IsString()
  title!: string;

  toCommand(): CreatePostCommand {
    return { title: this.title };
  }
}
```

---

## 6. Controller Patterns

### gRPC Controller (ms-*)
```typescript
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Logger } from '@volontariapp/logger';
import { GRPC_SERVICES, EVENT_COMMAND_METHODS } from '@volontariapp/contracts-nest';

@Controller()
export class EventCommandController {
  private readonly logger = new Logger({ context: EventCommandController.name });

  @GrpcMethod(GRPC_SERVICES.EVENT_COMMAND_SERVICE, EVENT_COMMAND_METHODS.CREATE_EVENT)
  createEvent(data: CreateEventCommandDTO): CreateEventResponseDTO {
    this.logger.log(`gRPC: Creating event: ${data.title}`);
    // delegate to service
  }
}
```

### REST Controller (api-gateway)
```typescript
@Controller('events')
export class EventController implements OnModuleInit {
  private readonly logger = new Logger({ context: EventController.name });
  private eventService!: EventServiceClient;

  constructor(@Inject(EVENT_PACKAGE) private client: ClientGrpc) {}

  onModuleInit() {
    this.eventService = this.client.getService<EventServiceClient>(EVENT_SERVICE_NAME);
  }
}
```

---

## 7. Strict Typing Rules (ENS — zero `any`)

```
✅ Use `unknown` if the type is genuinely unknown, then narrow with guards
✅ Use `type` imports: import type { Foo } from '...'
✅ Definite assignment assertions `!` for DI-injected and class-transformer fields
✅ Enum types from @volontariapp/contracts — never redefine locally
✅ Generic return types on all public methods
❌ `any` — blocked by ESLint (@typescript-eslint/no-explicit-any: error)
❌ `as any` casts
❌ `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
❌ `object`, `Record<string, unknown>` as lazy alternatives to a proper interface
```

---

## 8. Testing Strategy

### Rules
- Every feature **must** ship with a `.spec.ts` file
- **No real I/O** in unit tests: mock DB, gRPC clients, and external services
- Create/update a `Factory` and a `Mock` for every new domain entity or service
- Co-locate test utilities next to the tested code, or in `src/__test-utils__/`

### Factory pattern
```typescript
// src/__test-utils__/factories/event.factory.ts
import type { EventDTO } from '@volontariapp/contracts-nest';

export class EventFactory {
  static create(overrides: Partial<EventDTO> = {}): EventDTO {
    return {
      id: 'uuid-test-1',
      title: 'Test Event',
      type: EventType.VOLUNTEER,
      ...overrides,
    };
  }
}
```

### Mock service pattern
```typescript
// src/__test-utils__/mocks/event.service.mock.ts
import type { EventService } from '../../modules/event/event.service.js';

export const MockEventService: jest.Mocked<EventService> = {
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
};
```

### Test bootstrap (NestJS)
```typescript
const module = await Test.createTestingModule({
  controllers: [EventCommandController],
  providers: [{ provide: EventService, useValue: MockEventService }],
}).compile();
```

---

## 9. @volontariapp Package Registry

All internal packages live in `npm-packages/packages/`. They are **never** linked locally (`yarn link` is forbidden). Consume them via CI snapshot versions only.

### Current stable versions (ms-user baseline)
| Package | Stable | Snapshot format |
|---|---|---|
| `@volontariapp/auth` | `2.1.0` | `X.Y.Z-next.YYYYMMDDHHmmss` |
| `@volontariapp/bridge-nest` | `0.2.0` | `0.2.5-next.20260412161926` ← example snapshot |
| `@volontariapp/config` | `1.0.0` | |
| `@volontariapp/contracts` | `2.2.0` | |
| `@volontariapp/contracts-nest` | `2.0.8` | |
| `@volontariapp/errors` | `0.3.0` | |
| `@volontariapp/errors-nest` | `0.4.0` | |
| `@volontariapp/logger` | `0.2.0` | |
| `@volontariapp/monitoring` | `2.1.0` | |
| `@volontariapp/eslint-config` | `2.0.0` | |

> **Always check each service's `package.json` before suggesting a version.**
> Snapshot versions are generated by CI on every merge to `main` in `npm-packages`.

### Workflow for consuming a new/updated package
```bash
# 1. Merge changes to npm-packages/main → CI publishes snapshot
# 2. In the consuming service:
yarn add @volontariapp/<pkg>@<snapshot-version>
# 3. Commit the package.json + yarn.lock change
# 4. Never run: yarn link / npm link
```

---

## 10. Available Internal Packages (npm-packages)

| Package | Purpose |
|---|---|
| `@volontariapp/auth` | JWT / auth guards |
| `@volontariapp/bridge` / `bridge-nest` | Event bridge (domain events) |
| `@volontariapp/config` | Shared config primitives |
| `@volontariapp/contracts` | Raw gRPC contracts (types, enums, service names) |
| `@volontariapp/contracts-nest` | NestJS-flavoured contracts (GRPC_SERVICES, METHOD enums) |
| `@volontariapp/crypto` | Crypto utilities |
| `@volontariapp/database` | DB provider factories |
| `@volontariapp/domain-event` | Event domain entities / value objects |
| `@volontariapp/domain-post` | Post domain entities / value objects |
| `@volontariapp/domain-user` | User domain entities / value objects |
| `@volontariapp/errors` / `errors-nest` | Typed error classes + NestJS filters |
| `@volontariapp/eslint-config` | Shared ESLint flat config |
| `@volontariapp/health-check*` | Health check modules (Terminus integration) |
| `@volontariapp/logger` | Structured logger (context-aware) |
| `@volontariapp/monitoring` | OpenTelemetry + Grafana instrumentation |

---

## 11. Development Commands

```bash
# Start everything (local)
yarn dev

# Start backend only
yarn dev:backend

# Start individual service
yarn dev:gateway | yarn dev:services | yarn dev:mobile

# Lint all services
yarn lint

# Test all services
yarn test

# Build all
yarn build

# Fix audit issues
yarn audit:fix
```

---

## 12. ESLint / Linting Rules

- Config: `@volontariapp/eslint-config` (flat config, ESLint v9)
- Per-service: `eslint.config.mjs` at service root
- Run: `yarn lint` (auto-fixes with `--fix`)
- **Zero warnings tolerated in CI.** Fix the root cause, never suppress.
- Key enforced rules:
  - `@typescript-eslint/no-explicit-any: error`
  - `@typescript-eslint/explicit-function-return-type` (public methods)
  - `import/no-cycle`

---

## 13. Proto / gRPC Contract Flow

```
proto-registry/ (source of truth)
       │
       ▼ (CI generates)
@volontariapp/contracts        ← raw pb types
@volontariapp/contracts-nest   ← NestJS service/method enums
       │
       ▼ (consumed via snapshot in each service)
grpc-packages.ts               ← injection token (e.g. POST_PACKAGE)
grpc-client.options.ts         ← proto file path + package name
grpc-client.module.ts          ← ClientsModule.register(...)
```

---

## 14. AppModule Pattern

```typescript
// DynamicModule pattern — all services follow this
@Module({ imports: [DatabaseModule, XxxModule, GrpcClientModule] })
export class AppModule {
  static register(config: CustomConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AppConfigModule.forRoot(config),
        DatabaseModule.forRoot(config.db),
        TerminusModule.forRoot({}),
        HealthModule.register({ databases: ['postgres'], failOnMissingProvider: true }),
        XxxModule,
        GrpcClientModule,
      ],
    };
  }
}
```
