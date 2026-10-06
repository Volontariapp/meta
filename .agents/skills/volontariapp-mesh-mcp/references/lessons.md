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
