---
type: Convention
title: Conventions OKF du dépôt
description: "Structure d'un bundle de skill, champs de frontmatter et règles de rédaction propres à Volontariapp."
tags: [okf, conventions]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:20:00Z"
sources:
  - id: okf-blog
    author: "team:google-cloud-data-analytics"
    title: "Introducing the Open Knowledge Format (Google Cloud, 2026-06-12)"
  - id: okf-tool
    resource: .agents/skills/volontariapp-skill-evolution/scripts/okf.py
    title: "okf.py, parsing et conformité"
---

# Structure

```
.agents/skills/                     bundle OKF racine
├── index.md                        généré : table des skills
├── log.md                          historique global, plus récent en haut
├── volontariapp-<sujet>/           une skill = un sous-bundle
│   ├── SKILL.md                    point d'entrée (concept `type: Agent Skill`)
│   ├── index.md                    généré : concepts et scripts de la skill
│   ├── log.md                      historique de la skill
│   ├── references/*.md             concepts (Playbook, Convention, Reference, Lessons Learned...)
│   └── scripts/*.py|*.sh           outils exécutables
└── <skill-du-plugin> -> ../plugins/matt-pocock/skills/<skill-du-plugin>
```

Les skills sont **à plat** sous `.agents/skills/` : Claude Code ne découvre pas une skill rangée dans un sous-dossier intermédiaire.

# Frontmatter de `SKILL.md`

| Champ | Obligatoire | Rôle |
| :--- | :--- | :--- |
| `name` | oui (Claude Code) | Égal au nom du dossier, `volontariapp-<sujet>` |
| `description` | oui (Claude Code) | Quand déclencher la skill ; c'est ce que lit l'agent pour choisir |
| `type` | oui (OKF) | `Agent Skill` |
| `title`, `tags`, `status` | recommandés | Affichage, recherche, cycle de vie (`draft`, `stable`, `deprecated`) |
| `paths` | recommandé | Motifs glob relatifs à `meta` (`ms-*/src/migrations/common/**`) ; base de la détection d'obsolescence |
| `mesh_keys` | recommandé | Sujets mesh-mcp qui recommandent la skill ; génère `[engines.policy.skills]` de `.agents/mesh-mcp.toml` |
| `generated` | recommandé | `{by, at}` de la création, jamais réécrit |
| `verified` | géré par `sync` | Liste `{by, at, digest}` des vérifications, 5 dernières |
| `sources` | recommandé | Provenance : `id`, `resource` (chemin relatif à `meta` ou URL), `title` |

Les acteurs suivent OKF : `claude-code/<modèle>`, `human:<id>`, `process:<id>`. Les instants sont en UTC avec `Z`[^okf-tool].

# Rédaction

- **Structurer plutôt que raconter** : tableaux, titres conventionnels (`# Trigger`, `# Steps`, `# Examples`, `# Schema`), blocs de code.
- **Lier les concepts** avec des liens markdown relatifs au bundle (`/volontariapp-mesh-mcp/SKILL.md`)[^okf-blog]. Jamais de lien `file:///Users/...` : il ne marche que sur une machine.
- **Une règle factuelle = une source** et une note `[^id]`. Les règles de goût (style, préférences de l'équipe) passent par `learn --kind rule`.
- **Le YAML reste simple** : scalaires, listes, listes de mappings, mappings imbriqués, indentés de deux espaces. C'est le sous-ensemble que lit `okf.py`, sans dépendance externe.
- **YAML strict** : Claude Code lit le frontmatter avec un vrai parseur. Une valeur qui commence par `@`, `` ` `` ou `-` doit être entre guillemets (`okf.py` le fait) ; un frontmatter invalide fait afficher le titre H1 à la place de la `description`.

[^okf-blog]: Introducing the Open Knowledge Format (Google Cloud, 2026-06-12)
[^okf-tool]: okf.py, parsing et conformité
