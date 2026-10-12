---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-mesh-mcp-verification, du plus récent au plus ancien."
tags: [lessons, volontariapp-mesh-mcp-verification]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-12T08:47:45Z"
sources:
  - id: src-2e26d02a
    resource: .agents/skills/volontariapp-mesh-mcp-verification/SKILL.md
    title: .agents/skills/volontariapp-mesh-mcp-verification/SKILL.md
---

# Leçons

## 2026-10-13 - Absence: couverture complete et gather dynamique

- **Type :** rule
- **Leçon :** Une affirmation d'absence (aucun appelant, aucun producteur) exige l'outil adapte, toutes les racines et la couverture citee. Un 0 producteur avec un consommateur present peut venir d'un stream resolu a l'execution (getGatherCompletionConfig dans base-websocket-gather): suivre ce que le consommateur publie ensuite. Cas: finalizeDeletion semblait jamais appele, l'appelant etait post-processor-user, dans post-processors-runner, hors de la liste de repos grep choisie a la main. Regles: AGENTS.md section 2 quinquies.
- **Consigné par :** claude-code/agent

## 2026-10-12 - Un REX avait presente des erreurs d'usage comme des defauts

- **Type :** pitfall
- **Leçon :** REX 7.1.3 (2026-10-12) : 'route introuvable' etait hors perimetre de smart_search/analyze_impact, 'package representative' est documente dans find_dependents.rs, un chemin sans prefixe de depot etait une erreur d'usage, et l'hypothese 'recepteur contenant user' etait fausse (critere reel : <x>Service dont <X>Service existe dans le proto). Appliquer le gabarit sortie brute / code lu / verdict avant de qualifier un defaut.[^src-2e26d02a]
- **Consigné par :** claude-code/agent

## 2026-10-12 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : à préciser.
- **Consigné par :** claude-code/agent

[^src-2e26d02a]: .agents/skills/volontariapp-mesh-mcp-verification/SKILL.md
