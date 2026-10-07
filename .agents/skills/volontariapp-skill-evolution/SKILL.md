---
name: volontariapp-skill-evolution
description: "Boucle d'auto-apprentissage des skills Volontariapp : savoir quelles skills sont désynchronisées du code (tous repos confondus), les mettre à jour, consigner une leçon apprise (correction de l'utilisateur, piège découvert), créer une skill quand un sujet n'est couvert par aucune, et garder le bundle conforme OKF v0.2. À utiliser quand le hook de fin de boucle le demande, après une correction de l'utilisateur, ou pour toute modification de .agents/skills/."
type: Agent Skill
title: Évolution des skills (auto-apprentissage)
tags: [skills, okf, auto-learning, hooks, multi-repo]
status: stable
paths:
  - .claude/settings.json
  - ".claude/hooks/**"
  - .husky/pre-commit
  - AGENTS.md
  - CLAUDE.md
  - GEMINI.md
  - ".cursor/rules/**"
  - .agents/mesh-mcp.toml
  - "*/.githooks/pre-commit"
  - "*/.husky/pre-commit"
  - scripts/install-skill-hooks.sh
  - scripts/init_repos.sh
mesh_keys:
  - skill-evolution
  - evolve.py
  - okf
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:20:00Z"
sources:
  - id: okf-spec
    author: "team:google-cloud-data-analytics"
    title: "Introducing the Open Knowledge Format (Google Cloud, 2026-06-12)"
  - id: evolve
    resource: .agents/skills/volontariapp-skill-evolution/scripts/evolve.py
    title: "evolve.py, moteur de la boucle"
  - id: stop-hook
    resource: .claude/hooks/stop-skill-evolution.sh
    title: Hook Stop Claude Code
  - id: mesh-toml
    resource: .agents/mesh-mcp.toml
    title: "mesh-mcp.toml, table [engines.policy.skills] générée"
  - id: check-symbols
    resource: .agents/skills/volontariapp-skill-evolution/scripts/check_symbols.py
    title: check_symbols.py
verified:
  - by: claude-code/claude-opus-5-5
    at: "2026-10-06T09:16:34Z"
    digest: f97102aa559082e5
  - by: claude-code/agent
    at: "2026-10-06T11:21:34Z"
    digest: 2bf4599de2a3e325
  - by: claude-code/agent
    at: "2026-10-06T14:36:21Z"
    digest: 2bf4599de2a3e325
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T22:51:25Z"
    digest: 2bf4599de2a3e325
  - by: claude-code/agent
    at: "2026-10-07T09:34:05Z"
    digest: 55bf7677a54d8f4b
---

# Évolution des skills (auto-apprentissage)

Les skills sont la mémoire de travail des agents sur l'écosystème Volontariapp. Elles ne valent que si elles disent vrai : cette skill les garde alignées sur le code, et les enrichit de ce que l'agent apprend.

## Le principe

Chaque `SKILL.md` déclare dans son frontmatter :
- `paths` : les fichiers décrits (motifs glob **relatifs à `meta`**, par exemple `ms-user/src/**` ou `npm-packages/packages/messaging/src/jobs/**`) ;
- `verified` : quand elle a été vérifiée pour la dernière fois contre ce code (famille *trust* d'OKF)[^okf-spec].

`evolve.py` compare les deux : tout fichier couvert modifié après la dernière vérification (commit ou modification locale) rend la skill **à mettre à jour**, avec la liste exacte des fichiers, la façon dont ils ont changé et les références qui les citent[^evolve].

## Multi-repo

`meta` ignore les repos clonés sous lui (`ms-*`, `api-gateway`, `npm-packages`, `proto-registry`, runners...). `evolve.py` détecte chaque sous-dossier qui a son propre `.git` et interroge git **dans le repo propriétaire** du fichier : les commits apparaissent sous la forme `ms-user@abc1234`, et les commandes de relecture du plan sont `git -C <repo> diff -- <chemin relatif au repo>`[^evolve]. Les sous-modules (`deploy/submodules/*`) sont ignorés.

## La boucle (automatique)

À la fin de chaque boucle de l'agent, le hook `Stop`[^stop-hook] lance `evolve.py hook`. S'il y a quelque chose à faire, il bloque l'arrêt **une fois** et donne le plan. L'agent doit alors :

1. **Relire** les fichiers listés (la commande `git -C ...` exacte est fournie).
2. **Mettre à jour** `SKILL.md` et les références qui citent ces fichiers : règles, commandes, chemins, pièges. Ajouter un script dans `scripts/` si une vérification revient souvent.
3. **Enregistrer la vérification** : `evolve.py sync <skill> --message "<ce qui a changé>"`, même si rien n'était à modifier.
4. **Consigner une leçon** si l'utilisateur a corrigé l'agent ou si un piège non évident a été découvert : `evolve.py learn`.
5. **Créer une skill** si un sujet n'est couvert par aucune : `evolve.py new`, puis la remplir.

Détail : [Workflow de la boucle](/volontariapp-skill-evolution/references/workflow.md).

## Commandes

```bash
E=".agents/skills/volontariapp-skill-evolution/scripts/evolve.py"
python3 $E status                 # état de chaque skill
python3 $E plan                   # plan d'action précis
python3 $E validate               # conformité OKF (exit 1 si erreur)
python3 $E sync volontariapp-implement-async-job-flow --message "nouveau handler worker-user"
python3 $E learn --skill volontariapp-shared-npm-package-change --kind pitfall \
  --title "Snapshot non publié" \
  --insight "Un yarn up vers une version snapshot échoue tant que la CI de la PR npm-packages n'a pas fini." \
  --source npm-packages/.github/workflows
python3 $E new volontariapp-saga-rollback --title "Rollback de saga" --description "..." \
  --paths "post-processors-runner/*/src/post-processors/*-failed.post-processor.ts" --mesh-keys rollback creation_failed
python3 $E owners ms-user/src/main.ts
```

## Recommandation des skills par mesh-mcp

Chaque `SKILL.md` déclare `mesh_keys` : les sujets (fragment de `scope`/`target`, ou nom d'outil comme `analyze_grpc`) pour lesquels mesh-mcp affiche « Project skill for this area » en tête de réponse. `evolve.py index` (donc aussi `sync`, `learn`, `new`) régénère la table `[engines.policy.skills]` de `.agents/mesh-mcp.toml` entre les marqueurs `skills-mesh`[^mesh-toml] ; ne jamais éditer ces lignes à la main.

- La clé la plus longue contenue dans le sujet gagne ; une clé égale à un nom d'outil gagne toujours : à réserver aux outils dont toutes les réponses concernent la même skill.
- Sans `mesh_keys`, des clés sont dérivées du préfixe littéral de `paths` (4 caractères minimum) et `validate` affiche un avertissement.
- Une même clé déclarée par deux skills fait échouer `validate`.
- `new --mesh-keys k1 k2` les pose à la création.

## Vérifier qu'une skill ne cite pas d'API inventée

```bash
python3 .agents/skills/volontariapp-skill-evolution/scripts/check_symbols.py [skill...]
```

Liste les identifiants de code entre backticks introuvables dans les sources des repos[^check-symbols]. Un symbole introuvable est soit une cible à présenter explicitement comme non implémentée, soit une erreur. À lancer après toute écriture de skill à partir d'un README : plusieurs README décrivent des API qui n'existent pas.

## Règles

- **Même contexte pour tous les agents** : `AGENTS.md` (racine de `meta`) est la source unique ; son index des skills est régénéré par `evolve.py index`. Les skills du plugin matt-pocock sont des liens dans `.agents/skills/` : listées, jamais modifiées. Détail : [Configuration multi-agents](/volontariapp-skill-evolution/references/multi-agent-layout.md).
- **Rédiger pour un agent** : appliquer la skill `writing-for-agents` du plugin avant de créer ou modifier une skill.
- **Une connaissance = un fichier.** `SKILL.md` reste court (quand l'utiliser, règles, liens) ; le détail va dans `references/`, chaque fichier étant un concept OKF avec au minimum un `type`.
- **Chaque règle factuelle est sourcée** : entrée `sources` (chemin relatif à `meta` ou URL) et note `[^id]` dans le texte. Une source locale qui disparaît fait échouer `validate`.
- **Ne jamais écraser `generated`** : une vérification ajoute une entrée à `verified` (les 5 dernières sont gardées).
- **`index.md` et `log.md` sont réservés** : générés par `evolve.py`, jamais de frontmatter.
- **Noms de skills** : `volontariapp-<sujet>` en minuscules et tirets (contrainte Claude Code), égal au champ `name`.
- **Pas d'emoji ni de tiret cadratin** dans les skills (règle du projet).

Conventions détaillées : [Conventions OKF du dépôt](/volontariapp-skill-evolution/references/okf-conventions.md).

[^okf-spec]: Introducing the Open Knowledge Format (Google Cloud, 2026-06-12)
[^evolve]: evolve.py, moteur de la boucle
[^stop-hook]: Hook Stop Claude Code
[^mesh-toml]: mesh-mcp.toml, table [engines.policy.skills] générée
[^check-symbols]: check_symbols.py
