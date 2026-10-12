---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-skill-evolution, du plus récent au plus ancien."
tags: [lessons, volontariapp-skill-evolution]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:30:27Z"
sources:
  - id: src-e76e88b2
    resource: .agents/skills/volontariapp-skill-evolution/scripts/evolve.py
    title: .agents/skills/volontariapp-skill-evolution/scripts/evolve.py
  - id: src-5352af57
    resource: .agents/skills/volontariapp-skill-evolution/scripts/okf.py
    title: .agents/skills/volontariapp-skill-evolution/scripts/okf.py
  - id: src-17b81fa2
    resource: .agents/skills/volontariapp-skill-evolution/tests/test_evolve.py
    title: .agents/skills/volontariapp-skill-evolution/tests/test_evolve.py
  - id: src-38f74cdc
    resource: docs/.env
    title: docs/.env
  - id: src-a706e158
    resource: npm-packages/.husky/pre-commit
    title: npm-packages/.husky/pre-commit
  - id: src-37dd6836
    resource: AGENTS.md
    title: AGENTS.md
  - id: src-0c5b1fd0
    resource: .claude/hooks/absence-claims-guard.py
    title: .claude/hooks/absence-claims-guard.py
---

# Leçons

## 2026-10-13 - Le hook d'absence verifie la couverture ligne par ligne, et learn valide --source

- **Type :** rule
- **Leçon :** absence-claims-guard.py ne laisse plus passer une phrase d'absence dont la ligne ne cite ni outil mesh-mcp ni « non trouve dans » (avant, un mot comme racines ou perimetre n'importe ou dans la reponse suffisait, ce qui a laisse passer un faux fait verifie). evolve.py learn refuse un --source qui n'est ni un fichier existant du repo ni une URL, au lieu de laisser la boucle Stop le rejeter plus tard. AGENTS.md section 2 quinquies R8 fixe le libelle.[^src-0c5b1fd0]
- **Consigné par :** claude-code/agent

## 2026-10-13 - Chemin de evolve.py selon le projet

- **Type :** rule
- **Leçon :** Le CLAUDE.md global cite .agents/skills/agent-self-evolution/scripts/evolve.py, valide uniquement dans le projet Hermes (spec-projet, et copie globale ~/.claude/skills/agent-self-evolution). Dans meta, la commande learn/sync passe par .agents/skills/volontariapp-skill-evolution/scripts/evolve.py. Avant de dire qu'un chemin n'existe pas, le chercher hors du repo courant (R1).
- **Consigné par :** claude-code/agent

## 2026-10-13 - Questions d'architecture: absence et couverture

- **Type :** rule
- **Leçon :** AGENTS.md section 2 quinquies (R1 a R7) fixe le raisonnement des questions d'architecture: une absence ne s'affirme qu'avec l'outil adapte, toutes les racines et la couverture citee. Appliquee par mesh-first-reminder.sh (rappel condense) et par le hook Stop absence-claims-guard.py (bloque une fois sans couverture citee).[^src-37dd6836]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Dans un worktree hors de meta, le controle de skills du hook husky est sans effet

- **Type :** rule
- **Leçon :** Le hook pre-commit des sous-depots ne lance evolve.py check-staged que si ../.agents/skills/volontariapp-skill-evolution/scripts/evolve.py existe a cote du depot (clone dans meta). Un git worktree cree hors de meta (par ex. dans le scratchpad) n'a pas ce chemin : le controle est silencieusement ignore. Les agents qui y travaillent doivent relire et mettre a jour a la main les skills de meta concernees puis lancer evolve.py sync, et l'orchestrateur le verifie. Le verrou STOP de .claude/hooks ne s'applique pas non plus aux fichiers hors du depot meta.[^src-a706e158]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Backlog Notion Volontariapp : API REST avec NOTION_TOKEN

- **Type :** rule
- **Leçon :** Le connecteur Notion MCP pointe vers un autre workspace (projet Arkhorys, base Sprint Backlogs). Pour les backlogs Volontariapp, utiliser l'API REST Notion avec NOTION_TOKEN lu dans docs/.env (source sans l'afficher). Base Backlogs id 2fd37561-a847-80a1-8c79-cebcaa8100b7, filtre select Sprint = 'Sprint N - Victor A Assign' (champs: Nom, État, Priority, Charge, Weekly, EPIC, Bloqué par).[^src-38f74cdc]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Les tests doivent isoler chaque chemin module

- **Type :** pitfall
- **Leçon :** Les tests remplacent REPO, SKILLS_DIR, AGENTS_MD et MESH_TOML de evolve.py par le dépôt temporaire. Un nouveau chemin calculé au chargement du module (MESH_TOML) oublié dans RepoTestCase a fait réécrire le vrai mesh-mcp.toml par write_indexes pendant les tests.[^src-17b81fa2]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-10-06 - Frontmatter YAML invalide avec @

- **Type :** pitfall
- **Leçon :** okf.py écrivait @volontariapp/x sans guillemets ; le YAML strict refuse un scalaire qui commence par @, et Claude Code affichait le titre H1 à la place de la description. L'émetteur quote désormais toute valeur commençant par un indicateur YAML ; vérifier un frontmatter douteux avec un parseur strict.[^src-5352af57]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-10-06 - STOP n'est pas un marqueur de correction

- **Type :** pitfall
- **Leçon :** Dans Volontariapp, STOP désigne la règle de blocage d'AGENTS.md (section 1) : le marqueur anglais stop a été retiré de CORRECTION_MARKERS, sinon chaque message qui parle de la règle déclenche une fausse demande de leçon.[^src-e76e88b2]
- **Consigné par :** claude-code/claude-opus-5-5

[^src-e76e88b2]: .agents/skills/volontariapp-skill-evolution/scripts/evolve.py
[^src-5352af57]: .agents/skills/volontariapp-skill-evolution/scripts/okf.py
[^src-17b81fa2]: .agents/skills/volontariapp-skill-evolution/tests/test_evolve.py
[^src-38f74cdc]: docs/.env
[^src-a706e158]: npm-packages/.husky/pre-commit
[^src-37dd6836]: AGENTS.md
[^src-0c5b1fd0]: .claude/hooks/absence-claims-guard.py
