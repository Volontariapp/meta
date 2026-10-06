---
type: Convention
title: Configuration multi-agents
description: "Comment Claude Code, Codex, Cursor, Gemini CLI et Antigravity reçoivent les mêmes instructions, les mêmes skills et quels hooks s'appliquent."
tags: [agents, skills, configuration, hooks]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:20:00Z"
sources:
  - id: agents-md
    resource: AGENTS.md
    title: AGENTS.md (source unique)
  - id: settings
    resource: .claude/settings.json
    title: Hooks Claude Code
  - id: evolve
    resource: .agents/skills/volontariapp-skill-evolution/scripts/evolve.py
    title: evolve.py (index des skills dans AGENTS.md)
---

# Schema

| Agent | Instructions | Skills | Hooks |
| :--- | :--- | :--- | :--- |
| Claude Code | `CLAUDE.md` importe `@AGENTS.md` | `.claude/skills` -> `.agents/skills`, chargement natif | Oui (`.claude/settings.json`)[^settings] |
| Codex | `AGENTS.md` (lu nativement) | `.agents/skills`, `.codex/skills` -> `.agents/skills` | Non |
| Cursor | `.cursor/rules/volontariapp.mdc` (`alwaysApply`) référence `@AGENTS.md` | `.cursor/skills` -> `.agents/skills` | Non |
| Gemini CLI | `GEMINI.md` importe `@./AGENTS.md` | `.gemini/skills` -> `.agents/skills` | Non |
| Antigravity | `AGENTS.md`, `.agents/rules/` | `.agents/skills` | Non |

La découverte native des skills dépend de la version de chaque outil. L'index généré dans `AGENTS.md`[^agents-md] garantit l'accès dans tous les cas : chaque ligne donne le chemin du `SKILL.md` et quand l'utiliser.

Copilot n'est pas branché : `meta/.github` est le repo de profil de l'organisation GitHub (ignoré par `meta`), un `copilot-instructions.md` n'y aurait pas sa place.

# Hooks Claude Code

| Événement | Script | Rôle |
| :--- | :--- | :--- |
| `PreToolUse` `Write\|Edit\|MultiEdit\|NotebookEdit` | `.claude/hooks/stop-rule-guard.sh` | Règle du STOP : refuse l'édition d'un consommateur de `@volontariapp/*` après une édition de `npm-packages/` ou `proto-registry/` dans la même session. |
| `PreToolUse` `Grep\|Bash` | `.claude/hooks/search-via-mesh.sh` | Recherche transverse (racine de `meta`) : redirige vers les outils `mesh-mcp`. Une recherche ciblée sur un sous-repo passe, comme un `grep`/`rg` qui filtre un pipe (`... \| rg X`, il lit stdin). |
| `PostToolUse` `Write\|Edit\|MultiEdit` | `.claude/hooks/post-edit.sh` | Pose le marqueur amont du STOP, lance ESLint sur le seul fichier modifié dans son repo, liste les skills qui le décrivent. |
| `Stop` | `.claude/hooks/stop-skill-evolution.sh` | `evolve.py hook` : plan de mise à jour des skills. |

Les autres agents n'ont pas ces garde-fous : ils lancent `evolve.py plan` eux-mêmes et appliquent la règle du STOP et le routage `mesh-mcp` à la lecture d'`AGENTS.md`.

# Règles

- **Une seule source** : toute instruction commune va dans `AGENTS.md` ; les fichiers propres à un agent ne contiennent que ce qui ne vaut que pour lui (hooks, syntaxe d'import).
- **Plugin matt-pocock** : chaque skill de `.agents/plugins/matt-pocock/skills/` est liée dans `.agents/skills/<nom>`. Pour ajouter une skill du plugin : créer le lien, puis `evolve.py index`[^evolve].
- **Collision de noms** : la skill `code-review` du plugin porte le même nom que la commande intégrée `/code-review` de Claude Code.

[^agents-md]: AGENTS.md (source unique)
[^settings]: Hooks Claude Code
[^evolve]: evolve.py (index des skills dans AGENTS.md)
