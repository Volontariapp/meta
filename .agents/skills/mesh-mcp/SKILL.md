---
name: mesh-mcp
description: "Instructions sur l'utilisation du serveur MCP local mesh-mcp (causalmesh) pour naviguer et chercher dans les repositories de Volontariapp"
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
smart_search({ "query": "UserAuthRequest", "scope": "api-gateway" })

// ✅ Cross-repo (workspace racine relative aux roots configurés)
smart_search({ "query": "UserResponse", "scope": "." })

// ❌ Sans scope — rejeté (-32602 InvalidParams)
smart_search({ "query": "UserResponse" })
```

### Stratégie de scope recommandée
1. **Tu connais le repo ciblé** → scope sur le repo précis (plus rapide, moins de bruit)
2. **Tu cherches cross-repo** → scope large, ou commence par `find_dependents` si c'est un symbole importé
3. **Rien trouvé et tu soupçonnes que ça vit dans un corps de fonction/commentaire** → relance avec `fuzzy: true`

## find_dependents(target)
Graphe de dépendances inverses en RAM ($O(1)$). **Un seul paramètre, pas de `scope`.**

| Paramètre | Obligation | Description |
|-----------|------------|--------------|
| `target`  | Obligatoire | Nom de contrat (`UserAuthRequest`) ou package partagé (`@volontariapp/domain-user`) |

```json
find_dependents({ "target": "@volontariapp/domain-user" })
```
Préfère cet outil à `smart_search` si l'objectif est uniquement de trouver les dépendances entrantes d'un symbole — pas de scan de fichiers, juste un lookup dans le graphe déjà construit.

## analyze_impact(target)
Cartographie causale des flux asynchrones (Redis Streams, BullMQ, post-processors, sagas
chorégraphiées). **Un seul paramètre `target` — il n'y a PAS de `direction` dans le schéma réel**
(contrairement à d'anciens exemples qui en inventaient un).

| Paramètre | Obligation | Description |
|-----------|------------|--------------|
| `target`  | Obligatoire | Nom d'event, topic Redis Stream, queue BullMQ, classe post-processor, worker ou saga |

```json
analyze_impact({ "target": "EventEventMessagingType.EVENT_CREATED" })
analyze_impact({ "target": "EventCreatedPostProcessor" })
```
Ne pas utiliser pour des appels gRPC synchrones directs — utiliser `analyze_grpc`.

## analyze_grpc(target)
Cartographie synchrone gRPC de bout en bout (`.proto` → controllers `@GrpcMethod` → clients).
**Un seul paramètre `target` — il n'y a PAS de `service_name`/`method_name` séparés dans le
schéma réel.**

| Paramètre | Obligation | Description |
|-----------|------------|--------------|
| `target`  | Obligatoire | Nom de service (`UserService`), de méthode RPC (`SignUp`) ou de package |

```json
analyze_grpc({ "target": "SignUp" })
analyze_grpc({ "target": "UserService" })
```
Ne pas utiliser pour des flux asynchrones (queues, streams) — utiliser `analyze_impact`.

## search_docs(query, max_sections?)
Recherche dans `meta/docs/` (C1-C4, Monorepo-Structure.md), avec sanitisation anti prompt-injection intégrée.

| Paramètre     | Obligation | Description |
|---------------|------------|--------------|
| `query`       | Obligatoire | Concept architectural (`Scatter-Gather`, `Neo4j`, `Transactional Outbox`) |
| `max_sections`| Optionnel (défaut: 3) | Nombre max de sections retournées |

```json
search_docs({ "query": "Scatter-Gather" })
```

## visualize_mesh(format?)
Rend toute la topologie indexée (services, contrats, endpoints gRPC, topics) en diagramme.
6ème outil de mesh-mcp, en plus des cinq ci-dessus.

| Paramètre | Obligation | Description |
|-----------|------------|--------------|
| `format`  | Optionnel (`"mermaid"` par défaut) | `"mermaid"` (Markdown collable dans une PR) ou `"html"` (page interactive) |

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

## Troubleshooting
- **`smart_search` ne trouve rien pour un nom visible dans le code** : par design, il cherche des
  symboles déclarés, pas du texte brut. Relance avec `fuzzy: true`.
- **`Sandbox escape attempt detected` / erreur -32602** : le chemin demandé est hors des `roots`
  configurés dans `mesh-mcp.toml` — ajoute le dossier aux `roots` s'il doit être lisible.
- **Le graphe semble périmé après un changement de branche** : `pkill meshd` — le prochain
  `mesh-mcp run` relance le daemon avec un scan frais.
