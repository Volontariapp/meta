---
name: volontariapp-meta-mods
description: "Utiliser, ajouter ou modifier les mods Claude Code distribués par meta (statut du verrou STOP, garde-fous emoji et tiret cadratin, panneau /repos, indicateur de skills et /skill-search) : catalogue marketplace, activation par .claude/settings.json, validation et tests."
type: Agent Skill
title: Mods Claude Code de meta
tags: [meta-mods]
status: draft
paths:
  - ".claude/mods/**"
  - .claude-plugin/marketplace.json
  - .claude/settings.json
mesh_keys:
  - meta-mods
  - volontariapp-meta
generated:
  by: claude-code/agent
  at: "2026-11-05T13:14:14Z"
verified:
  - by: claude-code/agent
    at: "2026-11-05T13:14:14Z"
  - by: claude-code/agent
    at: "2026-11-05T13:16:27Z"
    digest: bf19a8706dceebc2
  - by: claude-code/agent
    at: "2026-11-05T14:46:09Z"
    digest: b6c286aaab95b8d4
sources: []
---

# Mods Claude Code de meta

## Quand utiliser cette skill

Ajouter ou modifier un mod de `.claude/mods/`, comprendre pourquoi un mod refuse une édition (`meta-guards`) ou affiche un STOP (`meta-stop-lock`), onboarder un dev, ou publier un changement de mod. Un mod est un plugin Claude Code à hooks fonctions : il complète les hooks shell de `.claude/hooks/` en rendant visibles des états et en mécanisant des conventions écrites. Le détail utilisateur est dans `.claude/mods/README.md`.

## Le dispositif

| Mod | Hooks | Commande | Lit |
| :--- | :--- | :--- | :--- |
| `meta-stop-lock` | `session.start`, `tool.call` (Write, Edit, NotebookEdit), `turn.complete`, `prompt.submit` | aucune | marqueur `<git-common-dir>/volontariapp-stop-guard/<session>` posé par `post-edit.sh` |
| `meta-guards` | `tool.call` (Edit, Write, Bash `git commit` et `gh pr create/edit/comment`) | aucune | le contenu ajouté, comparé à l'ancien |
| `meta-repos` | `session.start`, `command.run`, `ui.render` (Pane) | `/repos` | `repos.json`, `git worktree list`, `git status`, `gh pr list --author @me` |
| `meta-skills` | `session.start`, `turn.complete`, `command.run`, `ui.render` (AbovePrompt) | `/skill-search <mots>` | `.agents/skills/*/SKILL.md`, `evolve.py status --json` |

Distribution : le catalogue `.claude-plugin/marketplace.json` (marketplace `volontariapp-meta`) liste les quatre mods par chemin relatif ; `.claude/settings.json` le déclare (`extraKnownMarketplaces`, source GitHub `Volontariapp/meta`) et les active (`enabledPlugins`, clés `<mod>@volontariapp-meta`). Chaque dev doit accepter la confiance du dossier ; la source étant GitHub, un changement n'atteint les devs qu'une fois mergé sur `main`.

## Règles

- **Un mod ne pose et ne lève jamais le verrou STOP.** `meta-stop-lock` ne fait que lire le marqueur ; le verrou reste l'affaire de `post-edit.sh`, `stop-rule-guard.sh` et du Lead Dev (`AGENTS.md` section 1).
- **`meta-guards` ne juge que l'ajout** (après moins avant) : éditer une ligne qui contient déjà un emoji ou un tiret cadratin passe. Fichiers exemptés : `node_modules`, `.git`, lockfiles, binaires. Un `Write` sur un fichier existant illisible passe (le garde-fou ne devine pas).
- **Aucun emoji ni tiret cadratin littéral dans les sources des mods** : construire les caractères par code (`String.fromCharCode(0x2014)`, `String.fromCodePoint`), car même une séquence d'échappement `\u` écrite par un outil peut être convertie en vrai caractère. La politique de `CLAUDE.md` s'applique à eux aussi, et `meta-guards` les refuserait.
- **Fonction qui reçoit `$` : au niveau du module**, jamais dans la closure de `register` ; l'état partagé est une variable de module. Le validateur refuse sinon (`$ is passed to ... which is not a function declared at the top of this file`).
- **Vérifier chaque nom de commande avec `claude plugin validate`.** `/skills` est réservé : le `$.command.register` est refusé et tout le hook qui l'appelle est ignoré, y compris le reste de `session.start`.
- **Matcher `tool` : une liste** (`{ tool: ['Write', 'Edit'] }`), pas une variable de type union (erreur TS2345).
- **Incrémenter `version` dans `plugin.json`** à chaque changement : sans cela, les devs ne reçoivent pas la mise à jour.
- **L'API des mods est en accès anticipé** (écrits contre Claude Code 2.1.318) : après une mise à jour de Claude Code, relancer validate et test sur les quatre mods.
- **Une logique testable va dans `hooks/<nom>.ts`** (fonctions pures), le branchement dans `hooks/register.ts[x]` ; les tests simulent les appels `$` par `on('<opération>', ...)` et un hook `tool.call` tient lieu de l'outil.

## À vérifier au premier clone d'un dev

L'activation par `extraKnownMarketplaces` (source GitHub) n'a pas pu être testée de bout en bout avant le merge, le catalogue n'étant pas encore sur `main`. Constaté : l'installation des quatre mods depuis le clone local (`claude plugin marketplace add <meta>` puis `install`) réussit, les mods sont lus depuis le dossier du clone. Non constaté : que `enabledPlugins` charge les mods sans installation manuelle (la doc dit qu'un plugin de source externe attend une installation explicite). Si un dev voit un mod "not installed", la section Activation du README donne les commandes ; une fois le comportement constaté, remplacer ce paragraphe par le résultat.

## Vérifier un mod

```bash
claude plugin validate .claude/mods/<mod>
claude plugin test .claude/mods/<mod>
claude plugin validate .            # le catalogue marketplace, depuis la racine de meta
tsc -p <tsconfig>                   # include : types claude-code.d.ts du skill plugin-authoring + .claude/mods/*/hooks et tests
```

Le typage demande le `claude-code.d.ts` que la skill `plugin-authoring` écrit au chargement (son chemin est donné par cette skill) : il n'est pas dans le repo.

Quand un mod est chargé depuis son dossier (`claude --plugin-dir`, ou installation lue depuis le clone), le moteur écrit lui-même `<mod>/tsconfig.json` (`extends ./.claude-plugin/types/tsconfig.json`) et pose les types dans `<mod>/.claude-plugin/types/`, dossier ignoré par git. Le `tsconfig.json` est commité (inférence : il a été écrit au chargement des mods depuis le clone ; non revérifié sur une version plus récente de Claude Code) ; ensuite `tsc -p .claude/mods/<mod>` type le mod sans configuration.

## Références

- [Leçons apprises](/volontariapp-meta-mods/references/lessons.md)
- `.claude/mods/README.md` : usage, activation, développement
- `.claude/hooks/stop-rule-guard.sh` et `post-edit.sh` : écriture du marqueur lu par `meta-stop-lock`
- `AGENTS.md` sections 1 (STOP) et 7 (PR prête : sans conflit et CI verte, repris par `/repos`)

## Scripts

- Aucun script propre : la vérification est `claude plugin validate` et `claude plugin test` (ci-dessus).
