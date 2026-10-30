# Historique

## 2026-10-28

- **Vérification** - init_repos.sh remplace par yarn meta setup (setup.mjs), AGENTS.md regenere par index (claude-code/agent)
- **Vérification** - Scripts remplaces par la CLI meta (yarn meta), repos.json source unique (claude-code/agent)

## 2026-10-19

- **Vérification** - AGENTS.md: nouvelle section 7 (webhook Discord des PR), aucune regle de la skill changee (claude-code/agent)
- **Vérification** - hook pre-commit copie dans ms-ranking, aucun changement de regle (human:victor)

## 2026-10-13

- **Vérification** - hook absence: couverture par ligne; learn valide --source; AGENTS.md R8 (claude-code/agent)
- **Leçon** - Le hook d'absence verifie la couverture ligne par ligne, et learn valide --source (rule) (claude-code/agent)
- **Vérification** - Lecon: chemin de evolve.py selon le projet (Hermes vs meta) (claude-code/agent)
- **Leçon** - Chemin de evolve.py selon le projet (rule) (claude-code/agent)
- **Vérification** - Ajout du hook Stop absence-claims-guard.py, rappel condense des regles de raisonnement dans mesh-first-reminder.sh, section 2 quinquies d'AGENTS.md (claude-code/agent)
- **Leçon** - Questions d'architecture: absence et couverture (rule) (claude-code/agent)
- **Vérification** - relu : mesh-mcp.toml ne change que les motifs contracts, la table [engines.policy.skills] est inchangée (claude-code/agent)

## 2026-10-12

- **Vérification** - Ajout de volontariapp-scaffold-microservice dans AGENTS.md (claude-code/agent)
- **Vérification** - Mise à jour des tables d'aiguillage dans AGENTS.md (claude-code/agent)
- **Vérification** - Mise à jour suite à l'ajout des playbooks du Lot 2 (claude-code/agent)
- **Vérification** - Mise à jour index AGENTS.md (claude-code/agent)
- **Vérification** - Hook mesh-first-reminder (SessionStart, UserPromptSubmit) documente; search-via-mesh.sh corrige en .py (claude-code/agent)
- **Vérification** - toml: cle generee rex, aucune regle modifiee (claude-code/agent)
- **Vérification** - mesh-mcp.toml audit 7.1.3, aucune regle de la skill modifiee (claude-code/agent)

## 2026-10-11

- **Vérification** - mesh-mcp.toml stable apres regeneration (claude-code/agent)
- **Vérification** - mesh_keys sans doublon de casse (claude-code/agent)
- **Vérification** - Enregistrement automatique de la skill volontariapp-user-account-deletion (index AGENTS.md, mesh-mcp.toml), mesh_keys declares (claude-code/agent)

## 2026-10-07

- **Vérification** - Index AGENTS.md et mesh-mcp.toml regeneres pour la skill volontariapp-logger, aucune regle modifiee (claude-code/agent)

## 2026-10-06

- **Vérification** - passe d'evolution apres les merges du Sprint 8 (statut du repository, CI des services, worktrees) (claude-code/claude-sonnet-5-5)
- **Leçon** - Dans un worktree hors de meta, le controle de skills du hook husky est sans effet (rule) (claude-code/agent)
- **Vérification** - skill relue et alignée sur le code (claude-code/agent)
- **Leçon** - Backlog Notion Volontariapp : API REST avec NOTION_TOKEN (rule) (claude-code/agent)
- **Vérification** - Intégration de la skill volontariapp-docx-reports et hooks (claude-code/agent)
- **Vérification** - plan : fichiers supprimés ignorés dans les non-couverts ; init_repos.sh couvert (claude-code/claude-opus-5-5)
- **Vérification** - paths : hooks pre-commit des sous-repos et install-skill-hooks.sh (claude-code/claude-opus-5-5)
- **Vérification** - check-staged multi-repo (--warn, chemins relatifs), hooks des sous-repos, install-skill-hooks.sh (claude-code/claude-opus-5-5)
- **Vérification** - mesh_keys et synchronisation de mesh-mcp.toml, check_symbols.py, YAML strict (claude-code/claude-opus-5-5)
- **Leçon** - Les tests doivent isoler chaque chemin module (pitfall) (claude-code/claude-opus-5-5)
- **Leçon** - Frontmatter YAML invalide avec @ (pitfall) (claude-code/claude-opus-5-5)
- **Vérification** - search-via-mesh.py laisse passer un grep/rg alimenté par un pipe (claude-code/claude-opus-5-5)
- **Leçon** - STOP n'est pas un marqueur de correction (pitfall) (claude-code/claude-opus-5-5)
- **Vérification** - migration au format OKF v0.2 (setup agentique repris d'Aureum, multi-repo) (claude-code/claude-opus-5-5)
