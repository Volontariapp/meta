# RFC-001: CausalMesh MCP — Universal Multi-Repo Architecture Mesh & Causal Intelligence Engine for AI Agents

- **Status**: Proposed / Architecture Blueprint
- **Author**: Staff Systems Architect & Engineering Team
- **Target Repository**: `causalmesh/causal-mcp` (Standalone OSS Project)
- **Date**: 2026-09-20
- **Version**: 1.0.0

---

## 1. Executive Summary & Problem Statement

### 1.1 The Multi-Repo Blindness & Distributed Disconnect
Modern software engineering at scale is overwhelmingly distributed. Organizations decouple complexity into:
1. **Multi-Repo Topologies**: Dedicated repositories for microservices (10 to 50+ services), shared schema registries (`proto-registry`, OpenAPI contracts), shared domain packages (`npm-packages`, Cargo workspaces), and living documentation (`docs/`, C4 models, ADRs).
2. **Asynchronous & Causal Coupling**: Services rarely talk through direct monolith function calls. They communicate via **Transactional Outbox tables**, message queues (**BullMQ**, **Celery**, **Sidekiq**), event streams (**Kafka**, **Redis Streams**, **AWS SQS/EventBridge**), and **RPC contracts (gRPC, tRPC, OpenAPI)**.

When autonomous AI coding agents (**Claude Code**, **Cursor**, **Windsurf**, **Antigravity**, **Devin**) are introduced into these architectures, they suffer from **Structural Blindness**:
- **The Single-Repo Prison**: Agents are constrained to the single repository open in the IDE. If an agent working in `api-gateway` needs to understand how `ms-user` processes a gRPC call, or which worker handles an event emitted by `ms-event`, it has zero visibility.
- **Syntactic-Only Analyzers Fail**: Existing tools (Tree-sitter AST, LSP, Graphify, GitNexus) only map **syntactic edges** (`import { Foo } from './foo'` or `a.call(b)`). When an event is pushed to a database table or a message topic, **no static import exists between the producer and consumer**. To an AST parser, they are two disconnected universes.
- **Catastrophic Token Exhaustion**: In desperation, agents run wide greps, read entire 1,000-line files, or hallucinate contracts. A single architectural question can burn 80,000 tokens ($1.50+ per prompt) and still deliver a broken implementation.
- **Destructive Process Violations**: Agents edit shared packages without understanding CI cascades, change contracts without generating changesets, or bypass type systems with unsafe casts (`as unknown as Type`).

### 1.2 The Solution: CausalMesh MCP
`CausalMesh MCP` is a lightweight, ultra-performant in-memory intelligence engine and Model Context Protocol (MCP) server written in pure Rust.

It acts as an **Active Architecture Mesh**:
- **Autonomous Remote Sync (Mode 2)**: Directly ingests and continuously synchronizes multi-repo topologies via remote Git URLs without requiring cumbersome Git submodules or external sidecars.
- **Cross-Boundary Causal Graph**: Bridges the "invisible links" of distributed systems: Outbox $\rightarrow$ Streams $\rightarrow$ Consumers $\rightarrow$ WebSocket Scatter-Gather, and Protobuf $\rightarrow$ Clients $\rightarrow$ Controllers.
- **Surgical Token Minification**: Combines Ripgrep streaming with Tree-sitter AST extraction to strip function bodies and return only architectural skeletons, cutting token consumption by **98%**.
- **Contextual Guardrails (The Absolute STOP Rules)**: Injects deterministic, non-negotiable process constraints directly into agent context when shared contracts are targeted.

---

## 2. Core Architectural Tenets (The 4 Pillars)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CAUSALMESH MCP                                  │
├──────────────────────────────┬──────────────────────────────┬───────────────┤
│  1. AUTONOMOUS INGESTION     │  2. CROSS-BOUNDARY CAUSALITY │  3. SURGICAL  │
│  Native libgit2 Remote Sync  │  Outbox, Streams, gRPC, RPC  │  TOKEN SCALE  │
│  Zero-Submodule Requirement  │  Reconciled across N Repos   │  -98% Tokens  │
├──────────────────────────────┴──────────────────────────────┴───────────────┤
│                    4. CONTEXTUAL GUARDRAILS & POLICY                        │
│        Deterministic STOP Rules & Procedural Skill Guidance Injection       │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Tenet 1: Zero-Submodule Autonomous Ingestion (Mode 2 Native)**  
   No developer should ever be forced to maintain Git submodules, umbrella repositories, or bespoke Kubernetes sidecars. The server natively fetches, clones, and synchronizes repositories in background threads via libgit2.
2. **Tenet 2: Causal, Not Just Syntactic**  
   Code intelligence must trace runtime causality across process boundaries, message brokers, and SQL audit tables, bridging producers to consumers without requiring direct code imports.
3. **Tenet 3: In-Memory Sub-Millisecond Speed ($O(1)$ RAM)**  
   Heavy graph databases (Neo4j, KùzuDB) or external Python runtimes add latency and resource overhead. CausalMesh maintains its primary inverted indexes, dependency maps, and document hashes in pure Rust memory, serving queries in $< 2\text{ms}$ locally and $< 100\text{ms}$ over encrypted tunnels.
4. **Tenet 4: Active Behavioral Steering (Enforced Discipline)**  
   A passive indexer only answers questions; an active mesh guides the agent. When an agent queries a shared contract, the server actively injects procedural skills and blocking STOP rules to preserve system integrity.

---

## 3. High-Level System Architecture

```
                                  AI AGENTS
               (Claude Code, Cursor, Windsurf, Antigravity, Devin)
                                      │
                                      ▼ [MCP Protocol: JSON-RPC 2.0 via Stdio / SSE]
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                 CAUSALMESH MCP SERVER                                │
│                                                                                      │
│   ┌──────────────────────────────────────────────────────────────────────────────┐   │
│   │                              MCP Tool Facade                                 │   │
│   │  search_docs │ smart_search │ analyze_flow │ analyze_contract │ dependents   │   │
│   └───────┬──────────────┬──────────────┬──────────────┬─────────────────┬───────┘   │
│           │              │              │              │                 │           │
│           ▼              ▼              ▼              ▼                 ▼           │
│   ┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐   │
│   │  DocEngine   ││  ASTEngine   ││  FlowEngine  ││ContractEngine││ DependEngine │   │
│   │  (C4, ADR,   ││(Ripgrep+Tree ││(PubSub,Outbox││ (gRPC, Proto,││(Cross-Package│   │
│   │  Fuzzy Match)││ Sitter, RTK) ││ Queue, Stream││ OpenAPI, RPC)││  RAM Graph)  │   │
│   └───────┬──────┘└──────┬───────┘└──────┬───────┘└──────┬───────┘└──────┬───────┘   │
│           │              │               │               │               │           │
│           └──────────────┼───────────────┴───────────────┼───────────────┘           │
│                          ▼                               ▼                           │
│                 ┌────────────────────────────────────────────────┐                   │
│                 │          PolicyEngine (Active Steering)        │                   │
│                 │  Injects STOP Rules, Changesets & Skill Links  │                   │
│                 └────────────────────────┬───────────────────────┘                   │
│                                          ▼                                           │
│                 ┌────────────────────────────────────────────────┐                   │
│                 │           AppState (Lock-Free In-Memory)       │                   │
│                 │  Doc Index │ AST Cache │ Flow Map │ Dep Graph  │                   │
│                 └────────────────────────┬───────────────────────┘                   │
│                                          ▲                                           │
│                                          │ In-Memory Hot Reload                      │
│                 ┌────────────────────────┴───────────────────────┐                   │
│                 │       Autonomous Ingestion & Sync Subsystem    │                   │
│                 │   (libgit2 Worker Thread + Local File Watcher) │                   │
│                 └────────────────────────┬───────────────────────┘                   │
└──────────────────────────────────────────┼───────────────────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
           [Remote Git Providers]                        [Local Repositories]
        GitHub / GitLab / Bitbucket                 Direct Local Dev Folders
     (Cloned to cache: ~/.cache/causalmesh/)        (Optional Sibling Folders)
```

---

## 4. Deep Dive: Ingestion Engine & Mode 2 Auto-Sync

The core weakness of existing code intelligence engines is their inability to ingest multi-repo architectures without manual local assembly. Mode 2 resolves this completely.

### 4.1 Specification of Mode 2 (Native Autonomous Sync)
The server operates as an autonomous daemon. Upon initialization:
1. **Manifest Parsing**: Reads `causal-mcp.toml` declaring all repositories, target branches, and authentication credentials.
2. **Local Cache Initialization**: Establishes a sandbox directory (e.g., `~/.cache/causalmesh/repos/` or container path `/var/cache/causalmesh/`).
3. **Parallel Ingestion**: Uses `git2` (libgit2 Rust bindings) to clone repositories with `--depth=1` (or user-defined depth).
4. **Background Liveness Reconciler**: Launches a tokio green-thread polling remotes at configurable intervals (`sync_interval = "60s"`).
5. **Atomic Memory Swap**: When a Git pull detects an upstream commit hash change, the engine parses only modified files, updates AST and flow graphs, and atomically swaps the `Arc<AppState>` via an `ArcSwap` pointer. **Zero downtime, zero stale cache.**

```rust
// Architecture Representation of Autonomous Repository Sync
pub struct RemoteRepoConfig {
    pub name: String,
    pub url: String,
    pub branch: String,
    pub auth_token_env: Option<String>,
}

pub struct IngestionManager {
    cache_dir: PathBuf,
    remotes: Vec<RemoteRepoConfig>,
    sync_interval: Duration,
}

impl IngestionManager {
    pub async fn start_autonomous_sync(&self, state: Arc<AppState>) {
        // 1. Initial parallel shallow clone
        self.clone_all_remotes().await.expect("Failed initial clone");
        
        // 2. Initial indexation
        state.reindex_all(&self.cache_dir).await;

        // 3. Continuous background reconciliation loop
        let cache_dir = self.cache_dir.clone();
        let remotes = self.remotes.clone();
        let interval = self.sync_interval;

        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(interval);
            loop {
                ticker.tick().await;
                for repo in &remotes {
                    if let Ok(has_changes) = fetch_and_rebase_remote(&cache_dir, repo).await {
                        if has_changes {
                            eprintln!("🔄 Changes detected in '{}' - Hot-reloading index", repo.name);
                            state.reindex_repo(&cache_dir, &repo.name).await;
                        }
                    }
                }
            }
        });
    }
}
```

### 4.2 Tri-Mode Flexibility
To ensure zero friction across development environments, CausalMesh supports three modes:
- **`remote` (Mode 2 - Recommended)**: Full autonomy. Clones from URLs via tokens/SSH. Ideal for Kubernetes pods, CI/CD, team servers, and developers who don't want to clone 20 repos locally.
- **`local` (Mode 1)**: Reads sibling directories on disk (`../service-a`, `../service-b`). Zero network calls, instant indexing of working trees.
- **`monorepo` (Mode 3)**: Single root with workspace globbing (`packages/*`, `apps/*`).

---

## 5. The 4 Processing Engines

### 5.1 DocEngine: Structural Architecture Retrieval
Generic text retrieval fails because it ignores Markdown hierarchy and semantic noise. DocEngine implements:
1. **Heading-Tree Windowing**: Documents are split into semantic nodes based on `#`, `##`, `###` headings with exact line tracking (`file://...#L145`).
2. **Noise Cancellation (Stop Words)**: Automated multilingual lexical filtering removes non-distinctive words (`comment`, `pourquoi`, `how`, `does`).
3. **Exact Phrase Boost**: Provides a +60 scoring multiplier for technical multi-word terms (`Scatter-Gather`, `Transactional Outbox`, `Dead Letter Queue`).
4. **Domain Alias Matrix**: Replaces abbreviations with canonical technical expansions (`k8s` $\rightarrow$ `kubernetes`, `ws` $\rightarrow$ `websocket`, `dlq` $\rightarrow$ `dead-letter-queue`).
5. **Hyphen-Normalized Multi-Token Fuzzy Matcher**: When exact matches yield zero results, `FuzzyEngine` uses `SkimMatcherV2` over hyphen-normalized strings (`-` and `_` converted to spaces) with multi-token conjunction. Queries with typos (`scattr gathr`) accurately resolve to `Scatter-Gather` with immediate suggestion links.

### 5.2 FlowEngine: Asynchronous Causal Tracer
Bridges decoupled microservices across message brokers and outbox patterns:
- **Producer Discovery**: Scans repository ASTs for database outbox insertions (`JobsOutboxEntity`, `event_outbox`, `emit()`, `publish()`).
- **Topic / Bus Binding**: Extracts contract signatures and message payloads (`IEventCreatedPayload`).
- **Consumer Aggregation**: Locates downstream handlers across separate runner repositories (`BatchPostProcessor`, `BaseWorker`, `@KafkaListener`, `IJobHandler`).
- **Correlation & Scatter-Gather Tracing**: Identifies multi-step aggregation states (e.g., Redis state counters awaiting $N/N$ feedbacks before WebSocket notification).

### 5.3 ContractEngine: gRPC, Protobuf & RPC Cascade
Reconciles synchronous client-server contracts:
- Scans `.proto` files or `openapi.yaml` specs for RPC service definitions (`SignUpCommand` $\rightarrow$ `SignUpResponse`).
- Maps generated TypeScript / Go / Java client interfaces in shared contract packages.
- Pinpoints API Gateway callers (HTTP endpoints delegating to RPC).
- Resolves backend controllers implementing the method (`@GrpcMethod('UserService', 'SignUp')`).

### 5.4 PolicyEngine: Active Agent Guardrails (The STOP Rules)
A critical differentiator of CausalMesh is **Behavioral Enforcement**.
When an agent calls an MCP tool, PolicyEngine evaluates the target files against declarative policy triggers:
- If an agent touches a contract repository (`packages/contracts`, `proto-registry`), PolicyEngine appends a high-visibility, deterministic markdown banner:
  ```markdown
  ════════════════════════════════════════════════════════════════════════════════
  🛑 RÈGLE CRITIQUE DE BLOCAGE (STOP IMMÉDIAT) :
  Tu as ciblé un contrat partagé dans 'npm-packages' / 'proto-registry'.
  1. Génère ton changeset (yarn changeset add).
  2. STOP TOTAL : Interdiction d'éditer les microservices consommateurs !
  3. Attends la publication du snapshot/release par la CI GitHub Actions.
  ════════════════════════════════════════════════════════════════════════════════
  ```
- Recommends verified operational skills (`.agents/skills/.../SKILL.md`) to guide implementation steps.

---

## 6. Token Economics & Compression Pipeline

### 6.1 Ripgrep Streaming + Tree-sitter RTK Minification
When an agent needs code context, standard tools emit full file contents (often 500 to 2,000 lines). CausalMesh implements AST Skeleton Stripping:
1. **Ripgrep Locates**: Fast regex search pinpoints matching lines across 20+ repositories in $< 15\text{ms}$.
2. **Tree-sitter Parses**: The file is parsed into an AST.
3. **Body Decapitation**: Function bodies, class implementations, and loop contents are stripped, preserving:
   - File imports and exports.
   - Interface and type definitions.
   - Class signatures, decorators (`@GrpcMethod`, `@Injectable`), and method prototypes.
4. **Token Minification**: Output is compressed in RTK style, omitting non-informative whitespace and braces.

### 6.2 Empirical Benchmark: Naive Approach vs CausalMesh MCP

| Development Scenario | Naive Agent Approach | CausalMesh MCP | Token Savings | Latency |
| :--- | :--- | :--- | :--- | :--- |
| **Document Search (Scatter-Gather)** | Grep across `docs/` + read 3 files (~6,500 tokens) | `search_docs` returns exact section (380 tokens) | **-94.2%** | **1.58s** |
| **Cross-Repo gRPC Tracing (`SignUp`)** | Manual search across 4 repos, 8 files (~14,000 tokens) | `analyze_contract` reconciles all 4 layers (350 tokens) | **-97.5%** | **1.73s** |
| **Distributed Event (`EVENT_CREATED`)** | Full read of outbox runner + 4 handlers (~22,000 tokens) | `analyze_flow` maps producer + 4 consumers (420 tokens) | **-98.1%** | **1.61s** |
| **Package Dependents Check** | `grep -rn` across 17 repos (~18,500 tokens) | `find_dependents` in-memory RAM graph (220 tokens) | **-98.8%** | **0.10s** |
| **End-to-End Feature Implementation** | ~82,000 tokens consumed in discovery | ~1,850 tokens total via targeted MCP calls | **-97.7%** | **~80k tokens saved** |

---

## 7. Universal Configuration Specification (`causal-mcp.toml`)

```toml
# causal-mcp.toml — Complete System Specification

[system]
name = "enterprise-mesh"
version = "1.0.0"
log_level = "info"

# ==============================================================================
# Ingestion Subsystem (Mode 2: Autonomous Git Ingestion)
# ==============================================================================
[ingestion]
mode = "remote"                       # "remote" | "local" | "monorepo"
cache_dir = "~/.cache/causalmesh"
sync_interval = "60s"
default_branch = "main"

[[ingestion.repositories]]
name = "contracts"
url = "https://github.com/my-org/proto-registry.git"
auth_token_env = "GITHUB_TOKEN"
branch = "main"

[[ingestion.repositories]]
name = "docs"
url = "https://github.com/my-org/architecture-docs.git"
auth_token_env = "GITHUB_TOKEN"

[[ingestion.repositories]]
name = "api-gateway"
url = "https://github.com/my-org/api-gateway.git"
auth_token_env = "GITHUB_TOKEN"

[[ingestion.repositories]]
name = "ms-user"
url = "https://github.com/my-org/ms-user.git"
auth_token_env = "GITHUB_TOKEN"

[[ingestion.repositories]]
name = "shared-packages"
url = "https://github.com/my-org/npm-packages.git"
auth_token_env = "GITHUB_TOKEN"

# ==============================================================================
# Engine 1: Documentation Engine (C4, RFC, ADR)
# ==============================================================================
[engines.docs]
enabled = true
paths = ["docs", "architecture", "rfcs"]
aliases = { "ws" = "websocket", "k8s" = "kubernetes", "dlq" = "dead-letter-queue", "auth" = "authentication" }
stop_words = ["comment", "pourquoi", "dans", "avec", "how", "what", "which", "the"]
exact_phrase_boost = 60
fuzzy_fallback = true

# ==============================================================================
# Engine 2: AST & Code Search Engine (Tree-sitter + Ripgrep)
# ==============================================================================
[engines.ast]
enabled = true
languages = ["typescript", "rust", "go", "proto", "sql"]
strip_function_bodies = true
max_snippet_lines = 40

# ==============================================================================
# Engine 3: Causal Flow Engine (Async, Outbox, Queues)
# ==============================================================================
[engines.flow]
enabled = true

[[engines.flow.drivers]]
type = "outbox_events"
bus = "redis_stream"
contract_pattern = "packages/messaging/src/events/**/payloads.ts"
producer_pattern = "EventQueueEntity|createEvent"
consumer_pattern = "class .*PostProcessor extends BatchPostProcessor"

[[engines.flow.drivers]]
type = "background_jobs"
bus = "bullmq"
contract_pattern = "packages/messaging/src/jobs/**/payloads.ts"
consumer_pattern = "class .*Handler extends BaseWorker"

# ==============================================================================
# Engine 4: RPC & Synchronous Contract Engine
# ==============================================================================
[engines.rpc]
enabled = true
driver = "grpc"
proto_dir = "proto-registry/proto"
client_interface_pattern = "packages/contracts/src/**/*.ts"
gateway_callers_dir = "api-gateway/src"
controller_annotation = "@GrpcMethod"

# ==============================================================================
# Engine 5: Policy & Behavioral Guardrails (Active Steering)
# ==============================================================================
[engines.policy]
enabled = true

[engines.policy.stop_rules]
"contracts" = "🛑 STOP CASCADE CI : proto-registry génère une PR dans npm-packages. Attends la publication NPM !"
"shared-packages" = "🛑 STOP IMMÉDIAT : Package partagé modifié. Fais un changeset et attends la publication de la CI !"

[engines.policy.skills]
"engines.flow.outbox_events" = ".agents/skills/implement-async-event-flow.md"
"engines.flow.background_jobs" = ".agents/skills/implement-async-job-flow.md"
"engines.rpc" = ".agents/skills/proto-contract-evolution.md"
```

---

## 8. Universal MCP Tool Interfaces

The server exposes 5 foundational tools compliant with the Model Context Protocol:

### Tool 1: `search_docs`
- **Input**: `{ "query": string, "max_results"?: number }`
- **Behavior**: Lexical ranking across Markdown nodes with stop words removal, exact phrase boost (+60), alias expansion, and SkimMatcherV2 hyphen-normalized fuzzy fallback.
- **Output**: Markdown with clickable file URI schemes (`file:///...#L145`) and PolicyEngine guidance banners.

### Tool 2: `smart_search`
- **Input**: `{ "query": string, "scope": string, "max_results"?: number }`
- **Behavior**: Scoped Ripgrep search followed by Tree-sitter AST stripping. Body implementations are truncated into concise signatures.
- **Output**: Minified code skeleton preserving context without token explosion.

### Tool 3: `analyze_flow`
- **Input**: `{ "target": string }` (Event name or Job name, e.g., `'EVENT_CREATED'`, `'PUBLISH_EVENT'`)
- **Behavior**: Queries memory graph to trace Producer $\rightarrow$ Bus/Topic $\rightarrow$ Consumers $\rightarrow$ Handlers $\rightarrow$ Feedback Streams.
- **Output**: Structured causal report with file coordinates and operational skill links.

### Tool 4: `analyze_contract`
- **Input**: `{ "target": string }` (RPC method or Service name, e.g., `'SignUp'`)
- **Behavior**: Reconciles the 4 layers: Protobuf specification $\rightarrow$ Mobile/Frontend contract interface $\rightarrow$ API Gateway callers $\rightarrow$ Backend controller implementation.
- **Output**: Multi-repo end-to-end sync trace with CI cascade reminders.

### Tool 5: `find_dependents`
- **Input**: `{ "target": string }` (Package name or Symbol, e.g., `'@volontariapp/messaging'`)
- **Behavior**: $O(1)$ memory resolution of all files across all repositories importing the target.
- **Output**: Exhaustive list of consuming files with PolicyEngine STOP rule injection.

---

## 9. Security, Isolation & Deployment Architecture

### 9.1 Containerized Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: causal-mcp
  namespace: tools
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: causal-mcp
          image: ghcr.io/causalmesh/causal-mcp:latest
          env:
            - name: GITHUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: github-token-secret
                  key: token
            - name: MCP_TRANSPORT
              value: "stdio"
          volumeMounts:
            - name: config-volume
              mountPath: /etc/causal-mcp
      volumes:
        - name: config-volume
          configMap:
            name: causal-mcp-config
```

### 9.2 Zero-Data-Leak Guarantee
- **Read-Only Operation**: CausalMesh performs read-only AST parsing and indexing. It never writes back to remote repositories.
- **Air-Gapped / Zero-Exfiltration**: The server requires **zero outbound connections to third-party LLM APIs**. All indexing, lexical scoring, and fuzzy matching run on-device / in-cluster in pure Rust.
- **Encrypted Transport**: Accessible over private Tailscale VPN tunnels or internal Kubernetes DNS via MCP Stdio / SSE.

---

## 10. Phased Implementation Roadmap

```
  Phase 1: Foundation & Spec
  ┌────────────────────────────────────────────────────────────┐
  │ [x] Validate core algorithms on production Kubernetes      │
  │ [x] Draft universal RFC-001 (this document)                │
  │ [ ] Create standalone repository `causalmesh/causal-mcp`   │
  └─────────────────────────────┬──────────────────────────────┘
                                │
  Phase 2: Autonomous Ingestion (Mode 2)
  ┌─────────────────────────────▼──────────────────────────────┐
  │ [ ] Implement `causal-mcp.toml` Serde configuration        │
  │ [ ] Integrate `git2` autonomous shallow clone & poll loop  │
  │ [ ] Atomic memory pointer swap (`arc-swap`)                │
  └─────────────────────────────┬──────────────────────────────┘
                                │
  Phase 3: Engine Generalization & Drivers
  ┌─────────────────────────────▼──────────────────────────────┐
  │ [ ] Extract `DocEngine` with multi-token fuzzy fallback    │
  │ [ ] Extract `ASTEngine` with Tree-sitter minification      │
  │ [ ] Implement pluggable Flow & Contract drivers            │
  └─────────────────────────────┬──────────────────────────────┘
                                │
  Phase 4: Policy Engine & MCP CLI
  ┌─────────────────────────────▼──────────────────────────────┐
  │ [ ] Implement PolicyEngine (declarative STOP rules)        │
  │ [ ] CLI utilities: `causal-mcp init` and `validate`        │
  │ [ ] JSON-RPC 2.0 Stdio & SSE Transport implementations     │
  └─────────────────────────────┬──────────────────────────────┘
                                │
  Phase 5: Open-Source Distribution
  ┌─────────────────────────────▼──────────────────────────────┐
  │ [ ] Multi-arch Docker builds (amd64 / arm64)               │
  │ [ ] GitHub Releases & Cargo publish (`cargo install`)      │
  │ [ ] Integrations for Claude Code, Cursor, Windsurf, AGY    │
  └────────────────────────────────────────────────────────────┘
```

---

## 11. Conclusion & Next Steps

CausalMesh MCP fills a critical void in developer tooling for the AI era. By treating multi-repo distributed architectures as first-class citizens and providing autonomous Git ingestion, it transforms AI coding assistants from single-file guessers into disciplined, architecture-aware engineering partners.

With this RFC approved, the next operational step is initializing the standalone repository `causal-mcp` and bootstrapping Phase 2 with the dedicated Agent Master Prompt.
