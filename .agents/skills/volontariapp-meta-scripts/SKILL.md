---
name: volontariapp-meta-scripts
description: "Utiliser et faire evoluer la CLI Node de meta (setup, doctor, migrate, certs, repos, bump) et le manifeste repos.json, source unique des repos et unites du workspace."
type: Agent Skill
title: Scripts et CLI du workspace meta
tags: [meta-scripts]
status: draft
paths:
  - "scripts/cli/**"
  - repos.json
  - root.sh
  - setup.sh
  - setup.ps1
  - scripts/install_apps.sh
  - scripts/install_shell.sh
mesh_keys:
  - meta-cli
  - repos.json
generated:
  by: claude-code/agent
  at: "2026-10-28T22:38:27Z"
verified:
  - by: claude-code/agent
    at: "2026-10-28T22:51:00Z"
    digest: 7c385aefb496209b
  - by: claude-code/agent
    at: "2026-10-28T23:02:11Z"
    digest: 7ccf4a975dbb6730
  - by: claude-code/agent
    at: "2026-10-28T23:02:36Z"
    digest: 8344fa15702535bd
  - by: claude-code/agent
    at: "2026-10-28T23:22:35Z"
    digest: 36024be2906c9d79
  - by: claude-code/agent
    at: "2026-10-28T23:28:57Z"
    digest: e69071f06e250c57
sources: []
---

# Scripts et CLI du workspace meta

## Quand utiliser cette skill

Utiliser et faire evoluer la CLI Node de meta (setup, doctor, migrate, certs, repos, bump) et le manifeste `repos.json`, source unique des repos et unites du workspace. Entree : `yarn meta <commande>` ou `./root.sh <commande>` (lanceur, sans menu).

## Règles

- `repos.json` est la seule liste de repos, d'unites demarrables, de profils, d'environnements et d'infra Docker. Ne jamais recopier une liste de repos dans un script : lire `loadManifest()` (`scripts/cli/lib/manifest.mjs`). `yarn meta manifest` verifie la coherence avec `.gitignore`.
- Ajouter un microservice : declarer le repo et l'unite dans `repos.json` (`migrations`, `certs`, `order`), puis `yarn meta manifest` et `yarn test:cli`.
- La CLI n'a aucune dependance npm : Node >= `.node-version`, modules ESM `.mjs` annotes en JSDoc (pas de `any`), tests `node:test` dans `scripts/cli/test/` (`yarn test:cli`, glob obligatoire sous Node 24.2).
- Bootstrap : `setup.sh` (macOS, Linux, WSL2) et `setup.ps1` (Windows 11, winget) garantissent Node et Yarn puis lancent `meta setup`. Toute la logique vit dans la CLI, pas dans les bootstraps.
- `setup` est idempotent et s'arrete a la premiere erreur reelle (code retour non nul, aucun `|| true`). Etapes : apps et shell (terminal interactif seulement, `--no-apps`, `--no-shell`, ou `--yes` les retire), prerequis, clone HTTPS via `gh auth setup-git` (`--ssh` pour SSH), dependances, certificats, infra Docker avec attente des health-checks, migrations, verification.
- Certificats : `certs` n'ecrase jamais des cles existantes sans `--force` (les paires doivent rester coherentes entre services). Generation par `node:crypto`, pas d'openssl.
- Infra locale : `up` demarre uniquement les services de `infra.services` (jamais les images GHCR des ms du compose de `ci-tools`).
- `sync-migrations` copie `ms-X/src/migrations` vers `npm-packages/packages/domain-X/src/test/migrations` (miroir avec suppression). Toujours `--dry-run` d'abord. `--pr` cree branche, changeset, build, test, PR dans `npm-packages`, puis s'arrete : regle STOP, aucun consommateur n'est touche avant la publication CI.
- `bump` (apres publication CI uniquement) ouvre une PR par consommateur ; il ne pousse jamais sur `main`. `notify-pr <repo> <n>` n'envoie le webhook Discord que si la PR est fusionnable et tous les checks verts, une seule fois par PR (`logs/discord-notified.log`).
- `trace-flow` genere une page HTML Sankey (SVG statique) des flux entre services : un lien relie le service d'un span parent a celui de son enfant, valeur = traces distinctes, rouge si un span enfant est en erreur (`scripts/cli/lib/trace-flow.mjs`). Deux phases : (1) chercher les spans de saut asynchrone `operation_name:(Consumer OR Producer)` et ne garder que les traces ou l'un d'eux a un parent (les taches planifiees comme `job ranking.compute_user_ranking` sont des racines isolees), (2) recuperer tous les spans de ces traces par lots (`trace_id:(a OR b)`). Lecture par `POST https://api.<site>/api/v2/spans/events/search`, limite reelle mesuree : 5 requetes par minute (en-tetes `x-ratelimit-*`, la doc annoncait 300 par heure), geree par attente et nouvelle tentative ; `--max-traces 100 --chunk 10` coute 11 requetes. Ne pas exclure `operation_name:Internal` : certains parents de sauts en font partie. Mode hors ligne : `--input`. Identifiants lus dans l'environnement du terminal, jamais ecrits : `DD_TOKEN` (Bearer), sinon `DD_API_KEY` + `DD_APP_KEY`, ou une `DD_API_KEY` de prefixe `ddpa` utilisee en Bearer ; le secret `datadog-keys` du cluster ne contient que l'`api-key`.
- `repos sync` ne fait jamais de stash silencieux : un repo sale est ignore (ou `--autostash`), `pull --ff-only` seulement. `repos rebase` abandonne proprement en cas de conflit.
- Zero emoji et zero tiret cadratin dans le code, les logs et les messages de commit.

## Pièges verifies

- Les `@volontariapp/*` sont publics sur npm (`access: public` dans `npm-packages/.changeset/config.json`) : aucune authentification de registre n'est requise au setup.
- La route de sante de l'api-gateway est `/api/v1/health` (verifie : 200 apres `start backend-core`), pas `/health`.
- Node < `.node-version` fait echouer `doctor` et donc `setup` (cas constate sur une machine en 24.2.0).
- `clamd` n'a pas d'image arm64 (Apple Silicon) : `up` echoue en bloc s'il est dans la liste principale. Il est donc dans `infra.optional` de `repos.json`, demarre en emulation amd64 (`DOCKER_DEFAULT_PLATFORM`) et son echec n'arrete pas le setup.
- Ne jamais sauter `yarn install` sous pretexte que `node_modules` existe : celui de `ms-ranking` etait incomplet (`@volontariapp/domain-ranking` absent), Node remontait vers un `node_modules` perime a la racine de `meta`. `setup` lance donc toujours `yarn install` (no-op si a jour).
- Arreter `start` : `child.kill()` ne tue pas les petits-enfants (yarn, nest, node) et laisse les ports occupes. Les unites sont lancees dans leur groupe de processus (`spawnGroup`) et arretees par `killTree`.
- Une migration renommee apres application (meme timestamp, autre nom) fait echouer `migrate` sur une base de dev existante (`type ... already exists`, cas `ms-event` : `AddSagaStatus1780932284627` en base, `AddSagaStatusToEvent1780932284627` dans le code). Une base vierge n'est pas concernee : les 7 services migrent proprement (verifie sur un Postgres jetable). Ne pas vider la base d'un developpeur pour contourner.
- Les ports et conteneurs du compose sont fixes (`container_name`) : une seule instance de l'infra par machine.

## Références

- [Leçons apprises](/volontariapp-meta-scripts/references/lessons.md)

## Scripts

- `yarn test:cli` : tests unitaires de la CLI.
- `yarn meta manifest` : valide `repos.json` et `.gitignore`.
- `yarn meta doctor` : prerequis de la machine.
