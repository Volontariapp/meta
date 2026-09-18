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
- **Requête ciblée** : Privilégie l'utilisation de l'argument `directory` (ex: `ms-social` ou `npm-packages/packages/domain-social`) pour restreindre la recherche si tu sais dans quel domaine métier se trouve le code.
- L'outil formate de lui-même les retours pour économiser des tokens, pas besoin de le wrapper dans RTK.

## Utilisation de find_dependents (Dependency Graph)
L'outil `find_dependents` te permet d'explorer le graphe de dépendances gardé en mémoire vive par le MCP.
- **Usage** : Si tu veux savoir quels microservices ou fichiers utilisent un contrat précis (ex: `UserAuthRequest`) ou un package NPM partagé (ex: `@volontariapp/domain-user`), utilise cet outil.
- **Performance** : Cette requête s'exécute en O(1) car elle tape directement dans la RAM du pod. Privilégie cet outil plutôt qu'une recherche plein texte (`smart_search`) si ton objectif est uniquement de trouver les dépendances entrantes d'un symbole.
