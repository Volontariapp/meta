---
name: meta-indexer
description: "Instructions sur l'utilisation du serveur MCP pour naviguer et chercher dans les 17 repositories de Volontariapp"
---

# MCP Meta Indexer Skill

Tu disposes désormais de l'outil MCP `smart_search` pour naviguer dans l'architecture distribuée de Volontariapp. 
Cette base de code est un monorepo massif de 17 microservices/packages.

## Règle de Contexte Globale
AVANT de lancer une recherche complexe ou de modifier l'architecture inter-microservices, tu DOIS lire :
- `META_CONTEXT.md` (à la racine du dossier `meta`)
- `META_GRAPH.json` (à la racine du dossier `meta`)
Ces fichiers définissent les responsabilités de chaque repo et leurs interdépendances gRPC/NPM.

## Utilisation de smart_search
L'outil `smart_search` est un proxy intelligent qui optimise les requêtes (via Ripgrep, et plus tard Tree-Sitter) sur toute la codebase.

> ⚠️ **RÈGLE ABSOLUE : Toujours passer le paramètre `scope`.**
> Sans `scope` explicite, le MCP cible un index partiel et peut retourner "Aucun résultat" même si le symbole existe dans la codebase. Ce comportement a été confirmé en REX le 2026-09-18.

### Paramètres obligatoires
| Paramètre | Obligation      | Valeur recommandée                          |
| -----------| -----------------| ---------------------------------------------|
| `query`   | Obligatoire     | Le symbole ou pattern à chercher            |
| `scope`   | **Obligatoire** | Chemin absolu vers le repo ou dossier cible |

### Exemples corrects
```
// ✅ Avec scope absolu sur le workspace racine
smart_search({ query: "UserResponse", scope: "/Users/victoragahi/Developer/meta" })

// ✅ Avec scope ciblé sur un seul repo
smart_search({ query: "UserAuthRequest", scope: "/Users/victoragahi/Developer/meta/submodules/api-gateway" })

// ❌ Sans scope — NE PAS FAIRE, résultats imprévisibles
smart_search({ query: "UserResponse" })
```

### Stratégie de scope recommandée
1. **Tu connais le repo ciblé** → scope sur le repo précis (plus rapide, moins de bruit)
2. **Tu cherches cross-repo** → scope sur `/Users/victoragahi/Developer/meta` (workspace racine)
3. **Tu ne sais pas où ça se trouve** → commence par `find_dependents` si c'est un symbole importé, sinon scope racine

- L'outil formate de lui-même les retours pour économiser des tokens, pas besoin de le wrapper dans RTK.

## Utilisation de find_dependents (Dependency Graph)
L'outil `find_dependents` te permet d'explorer le graphe de dépendances gardé en mémoire vive par le MCP.
- **Usage** : Si tu veux savoir quels microservices ou fichiers utilisent un contrat précis (ex: `UserAuthRequest`) ou un package NPM partagé (ex: `@volontariapp/domain-user`), utilise cet outil.
- **Performance** : Cette requête s'exécute en O(1) car elle tape directement dans la RAM du pod. Privilégie cet outil plutôt qu'une recherche plein texte (`smart_search`) si ton objectif est uniquement de trouver les dépendances entrantes d'un symbole.

## Utilisation de analyze_impact (Graphe des Flux Asynchrones CQRS / Outbox / Sagas)
L'outil `analyze_impact` analyse les flux asynchrones (Events 1:N via Redis Streams & Post-Processors, Jobs 1:1 via BullMQ & Workers, Sagas & Scatter-Gather WebSocket) à partir du contrat de vérité `@volontariapp/messaging`.

### Paramètres
| Paramètre | Obligation | Description |
|-----------|------------|-------------|
| `target` | **Obligatoire** | Nom de l'Event (`UserCreatedEvent`), Job (`SendMailJob`), Post-Processor (`EventPostProcessor`), Worker ou Microservice |
| `direction` | Optionnel | `"downstream"` (par défaut - impacts aval), `"upstream"` (causes amont), ou `"both"` (bidirectionnel) |

### Exemples d'utilisation
```json
// Trouver tous les consommateurs, post-processors et cascades d'un événement
analyze_impact({ "target": "EventUserCreated", "direction": "downstream" })

// Trouver qui déclenche et émet un job ou consomme dans un worker
analyze_impact({ "target": "EventPostProcessor", "direction": "upstream" })

// Avoir la vue 360° causale d'un flow ou d'un microservice
analyze_impact({ "target": "ms-user", "direction": "both" })
```

## Exécution (Fallback)
Si le serveur MCP n'est pas chargé nativement en tant qu'outil dans ta session, tu dois l'invoquer via le CLI :
1. Compile le serveur (une seule fois) pour éviter le surcoût de `cargo run` à chaque requête :
   `cargo build --release --manifest-path mcp-meta-indexer/Cargo.toml`
2. Appelle directement le binaire compilé (latence de 0ms) :
   `echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "<outil>", "arguments": {<args>}}}' | ./mcp-meta-indexer/target/release/mcp-meta-indexer`

## Troubleshooting
- **Graphe initial** : Au tout premier démarrage, le serveur bloque pendant quelques dizaines de millisecondes pour construire le graphe en mémoire. S'il renvoie une erreur, vérifie l'état de compilation.
- **Dossiers scannés** : L'outil ignore par défaut `node_modules` et `.git`, mais scanne volontairement `node_modules/@volontariapp` pour trouver nos dépendances internes métier.
