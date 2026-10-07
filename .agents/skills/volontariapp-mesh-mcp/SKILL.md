---
name: volontariapp-mesh-mcp
description: "Instructions sur l'utilisation du serveur MCP local mesh-mcp (causalmesh) pour naviguer et chercher dans les repositories de Volontariapp"
type: Agent Skill
title: mesh-mcp
tags: [mcp, causalmesh, search]
status: stable
paths:
  - .agents/mesh-mcp.toml
  - "causalmesh/crates/mesh-server/src/tools/**"
mesh_keys:
  - causalmesh
  - mesh-mcp
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:22:12Z"
sources:
  - id: mesh-config
    resource: .agents/mesh-mcp.toml
    title: Configuration mesh-mcp
  - id: mesh-tools
    resource: causalmesh/crates/mesh-server/src/tools
    title: Schémas des outils (source Rust)
verified:
  - by: claude-code/claude-opus-5-5
    at: "2026-10-06T08:38:22Z"
    digest: 1511f6b2c11bcc5f
  - by: claude-code/claude-opus-5-5
    at: "2026-10-06T09:00:40Z"
    digest: 9494e60674197e8d
  - by: claude-code/claude-opus-5-5
    at: "2026-10-06T09:14:51Z"
    digest: d5053c498a61540a
  - by: claude-code/agent
    at: "2026-10-06T11:21:34Z"
    digest: 438df1dddb5acc40
  - by: claude-code/agent
    at: "2026-10-07T09:33:57Z"
    digest: 7dc014c21b572025
---

# MeshMCP Skill

Tu disposes de l'outil MCP `smart_search` (et 5 autres) pour naviguer dans l'architecture
distribuée de Volontariapp via **mesh-mcp** (projet `causalmesh`, binaire local
`~/.local/bin/mesh-mcp`, config `.agents/mesh-mcp.toml`). Cette base de code est un monorepo
massif de 17 microservices/packages.

Tous les schémas ci-dessous sont vérifiés directement dans le code source
(`causalmesh/crates/mesh-server/src/tools/*.rs`), pas dans `docs/mcp-tools.md` du même repo
qui contient des signatures obsolètes (`service_name`/`method_name` pour `analyze_grpc`,
`changed_file` pour `analyze_impact` — ni l'un ni l'autre n'existe réellement).

## Règle de Contexte Globale
AVANT de lancer une recherche complexe ou de modifier l'architecture inter-microservices, tu DOIS lire :
- `META_CONTEXT.md` (à la racine du dossier `meta`)
- `META_GRAPH.json` (à la racine du dossier `meta`)
Ces fichiers définissent les responsabilités de chaque repo et leurs interdépendances gRPC/NPM.

## smart_search(query, scope, include_body?, fuzzy?)
Recherche des **symboles déclarés** (pas du texte libre) dans l'index en mémoire, retournés
AST-décapités (corps de fonction stripés).

> ⚠️ **RÈGLE ABSOLUE : `scope` est un champ MANDATORY du schéma JSON** (`deny_unknown_fields`,
> pas de valeur par défaut). Un appel sans `scope` est rejeté par le serveur — ce n'est pas une
> question de qualité de résultat, l'appel échoue.

| Paramètre      | Obligation  | Description |
|----------------|-------------|--------------|
| `query`        | Obligatoire | Symbole/classe/méthode à chercher (sous-chaîne insensible à la casse, PAS une regex) |
| `scope`        | **Obligatoire** | Repo ou dossier cible, doit résoudre dans les `roots` de `mesh-mcp.toml` |
| `include_body` | Optionnel (`false` par défaut) | `true` pour voir l'implémentation complète au lieu des signatures |
| `fuzzy`        | Optionnel (`false` par défaut) | `true` = fallback full-text si l'index de symboles ne trouve rien (plus lent) |

```json
// ✅ Avec scope ciblé sur un seul repo
smart_search({ "query": "SignUpCommand", "scope": "api-gateway" })

// ✅ Cross-repo (workspace racine relative aux roots configurés)
smart_search({ "query": "UserResponse", "scope": "." })

// ❌ Sans scope — rejeté (-32602 InvalidParams)
smart_search({ "query": "UserResponse" })
```

### Stratégie de scope recommandée
1. **Tu connais le repo ciblé** → scope sur le repo précis (plus rapide, moins de bruit)
2. **Tu cherches cross-repo** → scope large, ou commence par `find_dependents` si c'est un symbole importé
3. **Rien trouvé et tu soupçonnes que ça vit dans un corps de fonction/commentaire** → relance avec `fuzzy: true`

## find_dependents(target, granularity?, include_tests?, limit?, offset?)
Graphe de dépendances inverses en RAM. **Pas de `scope`.**

| Paramètre | Obligation | Description |
|-----------|------------|--------------|
| `target`  | Obligatoire | Nom de contrat (`SignUpCommand`) ou package partagé (`@volontariapp/domain-user`) |
| `granularity` | Optionnel (`symbol`) | `symbol`, `file`, ou `package` pour la liste des services dépendants (rayon d'impact d'un changement de package) |
| `include_tests` | Optionnel (`false`) | Les dépendants de test sont sinon comptés à part |
| `limit` / `offset` | Optionnels (50 / 0) | Pagination : suivre l'`offset` donné dans le pied de page |

```json
find_dependents({ "target": "@volontariapp/domain-user" })
```
Préfère cet outil à `smart_search` si l'objectif est uniquement de trouver les dépendances entrantes d'un symbole — pas de scan de fichiers, juste un lookup dans le graphe déjà construit.

## analyze_impact(target, depth?, include_tests?, limit?, offset?)
Cartographie causale des flux asynchrones (Redis Streams, BullMQ, post-processors, sagas
chorégraphiées). **Il n'y a PAS de `direction`** : producteurs et consommateurs sont toujours rendus ensemble.

| Paramètre | Obligation | Description |
|-----------|------------|--------------|
| `target`  | Obligatoire | Nom d'event, topic Redis Stream, queue BullMQ, classe post-processor, worker ou saga |
| `depth`   | Optionnel (1, max 5) | Sauts causaux : 2 suit les réémissions d'un consommateur (lignes `heuristic`) |
| `include_tests` | Optionnel (`false`) | Inclut les producteurs/consommateurs de test |
| `limit` / `offset` | Optionnels (100 / 0) | Pagination de la matrice |

```json
analyze_impact({ "target": "EventEventMessagingType.EVENT_CREATED" })
analyze_impact({ "target": "EventCreatedPostProcessor" })
analyze_impact({ "target": "FALLBACK_UPDATE_USER" })
```
Ne pas utiliser pour des appels gRPC synchrones directs — utiliser `analyze_grpc`.

### Ce que le graphe relie (motifs de `.agents/mesh-mcp.toml`)

Un nom de membre suffit comme `target` : `UserJobType.FALLBACK_X`, `JobMessagingType.FALLBACK_X` et `Streams.X` sont réduits à la même clé (`fallback_x`, `x`)[^mesh-config].

| Flux | Producteur reconnu | Consommateur reconnu |
| :--- | :--- | :--- |
| Événement de domaine | `EventQueueEntity.createEvent<T>`, `targetServices: [Streams.X]`, trigger SQL `create_<topic>_event_queue_record()` | `extends BatchPostProcessor<T>`, `streamName: get*StreamName(X)` (gather) |
| Job | `withFallback(JobType.X, ...)` dans un command controller | handler `implements IJobHandler<...>` avec `jobType = JobType.X`, worker `extends BaseWorker`, `@Processor(Queue.X)` |
| Saga | post-processor qui écrit `saga_status: SagaStatus.*`, listé en « related sagas » | |
| Push temps réel | `notifyUser` / `broadcast` / `broadcastExcept(WebsocketMessagingType.X)` dans `ws-service` | `socket.on(WebsocketMessagingType.X, handler)` dans `nativapp` |

Les push WebSocket portent le même nom de membre que l'événement de domaine : `analyze_impact("POST_LIKED")` va donc de l'outbox jusqu'au handler `nativapp`, de bout en bout.

Angles morts connus : un événement émis via une table de correspondance (`EVENT_CREATION_FAILED`, poussé par le gather de `ws-service` via `messaging/src/websockets/events/mapping.ts`) et les streams construits en SQL à l'exécution (`JOB_OUTBOX_*`). Pour ceux-là, « No producer resolved » n'est pas une preuve d'absence : vérifier par un `rg` ciblé sur un repo.

## analyze_grpc(target, base?, include_tests?)
Cartographie synchrone gRPC de bout en bout (`.proto` → controllers `@GrpcMethod` → clients).
**Il n'y a PAS de `service_name`/`method_name` séparés** : un nom de service, de méthode ou `package.Service/Method`.

| Paramètre | Obligation | Description |
|-----------|------------|--------------|
| `target`  | Obligatoire | Nom de service (`UserService`), de méthode RPC (`SignUp`) ou de package |
| `base`    | Optionnel | Ref git (ex. `main`) : active la vérification wire-format du `.proto` (numéros de champs, enums) |
| `include_tests` | Optionnel (`false`) | Inclut les clients de test |

```json
analyze_grpc({ "target": "SignUp" })
analyze_grpc({ "target": "UserService" })
```
Ne pas utiliser pour des flux asynchrones (queues, streams) — utiliser `analyze_impact`.

## search_docs(query, max_sections?)
Recherche dans `meta/docs/` (C1-C4, Monorepo-Structure.md, `stockage-fichiers/`), les `CLAUDE.md`/`README.md` des repos et les skills `.agents/skills/volontariapp-*`, avec sanitisation anti prompt-injection intégrée.

Chaque mot de la requête passe par les alias du `.toml`, qui le **remplacent** (`pp` devient `post-processor`, `idempotence` devient `idempot`). Les mots vides français et anglais (`comment`, `un`, `the`, `how`...) sont ignorés : une question en langage naturel marche aussi bien qu'un mot-clé.

| Paramètre     | Obligation | Description |
|---------------|------------|--------------|
| `query`       | Obligatoire | Concept architectural (`Scatter-Gather`, `Neo4j`, `Transactional Outbox`) |
| `max_sections`| Optionnel (défaut: 3) | Nombre max de sections retournées |

```json
search_docs({ "query": "Scatter-Gather" })
```

## visualize_mesh(format?, service?, max_services?)
Rend la topologie indexée agrégée par service (contrats, endpoints gRPC, topics).
6ème outil de mesh-mcp, en plus des cinq ci-dessus.

| Paramètre | Obligation | Description |
|-----------|------------|--------------|
| `format`  | Optionnel (`"mermaid"` par défaut) | `"mermaid"` (Markdown collable dans une PR), `"json"` ou `"html"` (page interactive) |
| `service` | Optionnel | Zoom sur un service : ses contrats et les services avec qui il échange |
| `max_services` | Optionnel (40) | Groupes dessinés avant repli dans « other » |

Ne pas utiliser pour une question ciblée sur un symbole précis (préférer `find_dependents` ou
`analyze_grpc`) — ça rend la mesh entière.

```json
visualize_mesh({ "format": "mermaid" })
```

## Exécution (Fallback CLI)
Si le serveur MCP n'est pas chargé nativement dans ta session (`claude mcp list` ne montre pas
`mesh-mcp` connecté), tu peux l'appeler directement en JSON-RPC sur stdio :

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"find_dependents","arguments":{"target":"@volontariapp/domain-user"}}}' \
  | mesh-mcp run --standalone --config .agents/mesh-mcp.toml
```

Après tout changement à `.agents/mesh-mcp.toml`, valide toujours avec :
```bash
mesh-mcp doctor --config .agents/mesh-mcp.toml
mesh-mcp graph --config .agents/mesh-mcp.toml --format mermaid | head -40
```

## Skill recommandée en tête de réponse
Chaque réponse peut commencer par « Project skill for this area » : c'est `[engines.policy.skills]` qui choisit le playbook le plus précis selon la cible (`fallback_` vers les jobs, `saga` ou `_failed` vers les événements, `storage` vers le stockage, `@volontariapp/` vers la propagation de package). Lire ce `SKILL.md` avant de proposer un changement dans la zone.

## Troubleshooting
- **`smart_search` ne trouve rien pour un nom visible dans le code** : par design, il cherche des
  symboles déclarés, pas du texte brut. Relance avec `fuzzy: true`.
- **`Sandbox escape attempt detected` / erreur -32602** : le chemin demandé est hors des `roots`
  configurés dans `mesh-mcp.toml` — ajoute le dossier aux `roots` s'il doit être lisible.
- **Le graphe semble périmé après un changement de branche** : `pkill meshd` — le prochain
  `mesh-mcp run` relance le daemon avec un scan frais.
