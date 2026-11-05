# Mods Claude Code de meta

Quatre mods (plugins Claude Code à hooks fonctions) qui complètent les hooks shell de `.claude/hooks/` : ils rendent visibles des états que les hooks ne font que bloquer, et mécanisent des conventions écrites.

| Mod | Ce qu'il fait | Source de vérité |
| :--- | :--- | :--- |
| `meta-stop-lock` | Status line : "STOP actif : npm-packages modifié...". Lecture seule du marqueur posé par `post-edit.sh` (`<git-common-dir>/volontariapp-stop-guard/<session>`). Ne pose et ne lève jamais le verrou. | `AGENTS.md` section 1 |
| `meta-guards` | Refuse d'ajouter un emoji ou un tiret cadratin dans un `Write`, un `Edit`, un `git commit` ou un `gh pr create/edit/comment`. Seul l'ajout est jugé : modifier une ligne qui en contient déjà n'est pas bloqué. | `CLAUDE.md` ("No emojis or em-dashes") |
| `meta-repos` | Commande `/repos` : panneau avec, pour chaque repo cloné et chaque worktree, la branche, les modifications, l'avance/retard, et pour vos PR ouvertes la CI et la mergeabilité (marque PRETE : sans conflit et CI verte). Nécessite `gh` connecté. | `repos.json`, `AGENTS.md` section 7 |
| `meta-skills` | Au-dessus du prompt : "Skills : N à relire, M non conforme(s)" (lit `evolve.py status --json`, au plus toutes les 90 s). Commande `/skill-search <mots>` pour retrouver une skill parmi celles du projet. | `.agents/skills/` |

## Activation

Le catalogue est `.claude-plugin/marketplace.json` (marketplace `volontariapp-meta`). `.claude/settings.json` le déclare (`extraKnownMarketplaces`) et active les quatre mods (`enabledPlugins`) : après un clone, ouvrir `claude` dans `meta` et accepter la confiance du dossier.

Si Claude Code signale un mod "not installed" (un plugin dont la source est externe n'est pas chargé tant qu'il n'est pas installé), installer à la main :

```bash
claude plugin marketplace update volontariapp-meta
claude plugin install meta-stop-lock@volontariapp-meta --scope project
claude plugin install meta-guards@volontariapp-meta --scope project
claude plugin install meta-repos@volontariapp-meta --scope project
claude plugin install meta-skills@volontariapp-meta --scope project
```

Désactiver un mod pour soi seul : `claude plugin disable meta-guards@volontariapp-meta --scope local`.

## Développer un mod

L'API des mods est en accès anticipé : elle peut changer d'une version de Claude Code à l'autre. Chaque mod ne dépend que de `claude-code` (types) et sépare sa logique pure (`hooks/<nom>.ts`, testée) de son branchement (`hooks/register.ts[x]`).

```bash
claude plugin validate .claude/mods/<mod>     # manifeste + module, ce que le moteur refuserait
claude plugin test .claude/mods/<mod>         # tests/*.test.ts
claude --plugin-dir .claude/mods/<mod>        # charge le mod pour une session
```

Règles apprises en les écrivant :

- Une fonction qui reçoit `$` est déclarée au niveau du module, pas dans la closure de `register` (le validateur le refuse sinon). L'état partagé est une variable de module.
- `/skills` est un nom de commande réservé par Claude Code : le `$.command.register` est refusé et tout le hook `session.start` est ignoré. Vérifier chaque nom avec `claude plugin validate`.
- Le matcher `tool` accepte une liste (`{ tool: ['Write', 'Edit'] }`), pas une variable d'union.
- Les tests simulent les appels `$` par un hook nommé d'après l'opération (`on('fs.read', () => ({ value: ... }))`) ; un hook `tool.call` y tient lieu de l'outil.
- Pas d'emoji ni de tiret cadratin littéral dans les sources : construire les caractères par code (`String.fromCharCode(0x2014)`, `String.fromCodePoint`), la politique s'applique aussi aux mods.

Après un changement de comportement, mettre à jour la skill `volontariapp-meta-mods` et incrémenter `version` dans `plugin.json` (Claude Code ne propose la mise à jour que si ce champ change).
