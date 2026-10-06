---
type: Playbook
title: "Workflow de la boucle d'auto-apprentissage"
description: "Déclencheurs, étapes et garde-fous de la mise à jour automatique des skills."
tags: [skills, hooks, playbook]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:20:00Z"
sources:
  - id: evolve
    resource: .agents/skills/volontariapp-skill-evolution/scripts/evolve.py
    title: evolve.py
  - id: stop-hook
    resource: .claude/hooks/stop-skill-evolution.sh
    title: Hook Stop Claude Code
  - id: post-edit
    resource: .claude/hooks/post-edit.sh
    title: "Hook PostToolUse (lint ciblé, skills concernées, marqueur amont)"
  - id: pre-commit
    resource: .husky/pre-commit
    title: Hook git pre-commit de meta
  - id: claude-hooks
    resource: "https://docs.claude.com/en/docs/claude-code/hooks"
    title: Claude Code hooks reference
  - id: installer
    resource: scripts/install-skill-hooks.sh
    title: install-skill-hooks.sh
---

# Trigger

Trois points d'entrée, du plus fréquent au plus tardif :

| Moment | Mécanisme | Effet |
| :--- | :--- | :--- |
| Après chaque `Write`/`Edit` d'un fichier | Hook `PostToolUse`[^post-edit] | Ajoute au contexte la liste des skills qui couvrent ce fichier (`evolve.py owners`). |
| Fin de chaque boucle de l'agent | Hook `Stop`[^stop-hook] | Lance `evolve.py hook` : s'il y a un plan, bloque l'arrêt une fois avec ce plan. |
| `git commit` dans `meta` | Hook pre-commit[^pre-commit] | `evolve.py validate` si des fichiers de `.agents/skills/` sont commités. |
| `git commit` dans un sous-repo | Bloc ajouté à `.husky/pre-commit`, ou `.githooks/pre-commit` pour les repos sans Husky[^installer] | Si `../.agents/skills/.../evolve.py` existe (repo cloné dans `meta`) : `evolve.py check-staged` bloque tant qu'une skill qui décrit un fichier commité n'a pas été revérifiée (`sync`). Repo cloné seul (CI) : aucun effet. `SKILL_CHECK_MODE=warn` avertit sans bloquer, `SKIP_SKILL_CHECK=1` contourne. |

Les commits des sous-repos passent par leur propre hook, qui appelle le `evolve.py` de `meta`. `scripts/install-skill-hooks.sh` (lancé par `init_repos.sh`) active `core.hooksPath .githooks` dans les repos sans Husky : config locale, à relancer sur chaque poste. Une vérification faite depuis un sous-repo modifie la skill dans `meta` : commiter aussi `meta`.

# Steps

1. **Lire le plan.** Il liste, par skill, chaque fichier changé depuis la dernière vérification, comment (commit `<repo>@<sha>` et message, ou modification locale), et les documents de la skill qui le citent.
2. **Relire le changement** avec la commande fournie (`git -C <repo> diff -- ...` et `git -C <repo> log -p --since=... -- ...`).
3. **Corriger la skill** : règles devenues fausses, chemins déplacés, nouvelles commandes, nouveaux pièges. Mettre à jour les `sources` si un fichier cité a été renommé.
4. **Ajouter un script** dans `scripts/` quand la même vérification manuelle a été faite deux fois (le docstring de la première ligne sert de description dans `index.md`).
5. **`evolve.py sync <skill> --message "..."`** : ajoute une entrée `verified`, une ligne au `log.md` de la skill et régénère les index.
6. **Leçons** : si l'utilisateur a corrigé l'agent (le plan cite son dernier message quand il ressemble à une correction) ou si un piège a été découvert, `evolve.py learn` l'ajoute à `references/lessons.md`, sourcé.
7. **Nouvelle skill** : si le plan liste des fichiers « qu'aucune skill ne couvre » et que le sujet est nouveau, `evolve.py new`, puis remplir `SKILL.md` et passer `status` de `draft` à `stable`.

# Garde-fous

- **Pas de boucle infinie.** Le hook ne bloque jamais quand `stop_hook_active` est vrai[^claude-hooks], ni deux fois de suite pour le même plan (empreinte gardée dans `.git/volontariapp-skill-evolution.json` de `meta`, propre à chaque clone, jamais commitée)[^evolve].
- **Empreinte de contenu.** Chaque `sync` enregistre dans `verified` une empreinte (`digest`) des blobs git des fichiers couverts, tous repos confondus. Tant que l'empreinte actuelle est identique, la skill est à jour, quelles que soient les dates : un rebase ou un changement de branche qui ne modifie pas le contenu ne relance pas la boucle.
- **Zones surveillées** : un fichier modifié qu'aucune skill ne couvre n'est signalé que sous `npm-packages/`, `proto-registry/`, les runners, `deploy/`, `ci-tools/` et `scripts/` (`WATCHED_ROOTS`). Le code métier des `ms-*` et de l'`api-gateway` en est exclu pour ne pas bloquer chaque fin de boucle ; l'élargir quand une skill de domaine existe.
- **Détection des corrections** : le plan cite le dernier message de l'utilisateur seulement s'il ressemble à une correction (« non » en début de phrase ou suivi d'une ponctuation, « en fait », « plutôt »...), pas à une question.
- **Les fichiers d'une skill ne la rendent pas obsolète** : modifier `.agents/skills/<skill>/` ne déclenche pas de revue de cette même skill.
- **Contournement humain** au commit : `SKIP_SKILL_CHECK=1 git commit ...`, à justifier dans le message.

[^post-edit]: Hook PostToolUse (lint ciblé, skills concernées, marqueur amont)
[^stop-hook]: Hook Stop Claude Code
[^pre-commit]: Hook git pre-commit de meta
[^claude-hooks]: Claude Code hooks reference
[^evolve]: evolve.py
[^installer]: install-skill-hooks.sh
