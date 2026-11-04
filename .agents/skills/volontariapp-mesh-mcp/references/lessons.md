---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-mesh-mcp, du plus récent au plus ancien."
tags: [lessons, volontariapp-mesh-mcp]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:38:22Z"
sources:
  - id: src-ee621be8
    resource: .agents/mesh-mcp.toml
    title: .agents/mesh-mcp.toml
---

# Leçons

## 2026-11-01 - Binaire mesh-mcp trop ancien pour la config: Connection closed au demarrage

- **Type :** pitfall
- **Leçon :** Si le serveur MCP mesh-mcp echoue avec CONNECTION_CLOSED, lancer 'mesh-mcp -c <meta>/.agents/mesh-mcp.toml doctor' avant de soupconner .mcp.json (qui lance simplement 'mesh-mcp', conforme au guide). Constate le 2026-11-01 : le binaire 7.0.19 rejetait 'confidence = "exact"' (champ optionnel des patterns de topic, ligne 207, 12 occurrences) avec 'unknown field confidence' et ne demarrait pas ; apres mise a jour en 7.1.11 (install.sh du repo VictorAgahi/causalmesh, release latest), doctor repond 'No errors, no warnings' (4774 fichiers scannes, 16 racines). La version exacte qui introduit le champ n'est pas verifiee. Ne pas retirer les champs du fichier partage : mettre le binaire a jour. Le repo causalmesh est sur le compte VictorAgahi (pas dans l'organisation Volontariapp) et se clone a cote de meta pour la source citee par cette skill.[^src-ee621be8]
- **Consigné par :** claude-code/agent

## 2026-10-12 - Les routes HTTP ne sont pas interrogeables par chemin

- **Type :** pitfall
- **Leçon :** mesh-mcp 7.1.3 indexe les routes NestJS en noeuds HttpEndpoint (signature 'PATCH /events/:id/state', sans le prefixe api/v1 de setGlobalPrefix dans api-gateway/src/main.ts) mais smart_search et analyze_impact ne les trouvent pas par chemin : chercher par nom de handler (smart_search scope api-gateway). mesh-mcp graph --format json permet de les lister.[^src-ee621be8]
- **Consigné par :** claude-code/agent

## 2026-10-12 - meshd ne recharge pas mesh-mcp.toml a chaud

- **Type :** pitfall
- **Leçon :** Apres edition du toml, /mcp ne reconnecte que le proxy mesh-mcp run : le demon meshd (enfant du proxy) garde l'ancienne config (teste le 2026-10-12 : aucune prise en compte apres 68 s). Redemarrer meshd (pkill meshd) puis refaire un appel ; pour valider sans toucher au demon, utiliser mesh-mcp run --standalone -c .agents/mesh-mcp.toml.[^src-ee621be8]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Une clé skill égale à un nom d'outil masque les autres

- **Type :** pitfall
- **Leçon :** Dans [engines.policy.skills], une clé égale au nom de l'outil (analyze_impact) gagne toujours, aucune clé de chemin n'est essayée : la clé analyze_impact envoyait jobs et WebSocket vers trace-async-flow. Préférer des clés de sujet (la plus longue gagne) et des chemins relatifs au dossier du .toml (skills/...).[^src-ee621be8]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-10-06 - Un alias search_docs remplace le mot

- **Type :** pitfall
- **Leçon :** normalize_query() remplace chaque mot par son alias au lieu de l'ajouter : un alias vers un terme absent des docs supprime tous les résultats (dlq vers dead-letter-queue donnait 0 au lieu de 3). Aliaser seulement vers un terme présent ou une racine commune (idempot).[^src-ee621be8]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-10-06 - file_pattern *.ts matche toute sous-chaîne ts

- **Type :** pitfall
- **Leçon :** causalmesh retire * et . en tête de file_pattern puis compare en sous-chaîne du chemin : *.ts devient ts et matche .agents/, events/, tests/ et leur Markdown (exemples de code des skills captés comme producteurs). Utiliser /src/ ou un suffixe de nom de fichier (options.ts).[^src-ee621be8]
- **Consigné par :** claude-code/claude-opus-5-5

[^src-ee621be8]: .agents/mesh-mcp.toml
