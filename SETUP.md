# SETUP.md : demarrer sur Volontariapp

Objectif : cloner `meta`, lancer une commande, travailler. Tout est pilote par la CLI `meta` (Node, aucune dependance) et par le manifeste `repos.json`, source unique de la liste des repos, des services et de l'infra locale.

## 1. Prerequis

| Outil | Pourquoi | Installe par `setup` ? |
| :--- | :--- | :--- |
| Git | clone des repos | non |
| GitHub CLI (`gh`), connecte | clone en HTTPS sans cle SSH, PR automatiques | non (`gh auth login`) |
| Docker (Docker Desktop, Rancher Desktop ou Docker Engine), demarre | bases PostgreSQL, Neo4j, Redis, MinIO, ClamAV | non |
| Node 24.14.0 (`.node-version`) | execute la CLI et tous les services | oui, par `setup.sh` / `setup.ps1` |
| Yarn 4.12.0 | gestionnaire de paquets | oui, via corepack |
| `rg`, `jq`, `mesh-mcp` | recherche, scripts CI, serveur MCP des agents IA | non (facultatifs, signales par `doctor`) |

Les packages `@volontariapp/*` sont publics sur npm : aucune authentification de registre n'est requise.

## 2. Premier lancement

Cloner `meta`, puis depuis sa racine :

| Environnement | Commande |
| :--- | :--- |
| macOS, Linux, WSL2 | `./setup.sh` |
| Windows 11 (PowerShell) | `powershell -ExecutionPolicy Bypass -File .\setup.ps1` |

Le bootstrap installe Node et Yarn si besoin, puis lance `meta setup` : clone des repos (HTTPS), `yarn install`, certificats, infra Docker avec attente des health-checks, migrations de tous les services, verification. La commande est idempotente : la relancer ne casse rien. Elle s'arrete a la premiere erreur reelle avec un code non nul.

Options utiles : `--yes` (aucune question), `--no-apps`, `--no-shell`, `--ssh` (clone SSH), `--skip-infra`, `--skip-migrations`, `--build-packages`.

Puis : `yarn meta start` (profil `backend-core`, environnement `local`).

## 3. Commandes

Toutes via `yarn meta <commande>` ou `./root.sh <commande>` (`help` liste tout).

| Besoin | Commande |
| :--- | :--- |
| Verifier la machine | `doctor` |
| Infra locale | `up`, `down`, `nuke-db --yes` |
| Demarrer la stack | `start [profil] [--env local\|dev\|test\|prod]` (profils : `backend-core`, `services`, `outbox`, `backend`, `all-no-mobile`, `all`) |
| Voir les logs d'une unite | `logs <unite>` (fichiers `logs/<unite>.log`) |
| Migrations | `migrate --all` ou `migrate --services user,post` |
| Certificats | `certs` (n'ecrase rien), `certs --force` |
| Etat et mise a jour des repos | `repos status [--fetch]`, `repos sync`, `repos rebase` (`--autostash` pour les repos modifies) |
| build, lint, test partout | `run build`, `run lint`, `run test` |
| Migrations vers `npm-packages` | `sync-migrations --dry-run`, `sync-migrations`, `sync-migrations --pr` |
| Propager un package publie | `bump [--only repo,repo] [--dry-run]` |
| Annoncer une PR sur Discord | `notify-pr <repo> <numero>` |
| Ajouter une dependance | `add-package <paquet[@version]> --to repo,repo` |
| Ouvrir un workspace IDE | `ide <cursor\|code\|idea\|antigravity> <filtre>` |
| Valider `repos.json` | `manifest` |

## 4. Flux de travail sur un package partage

1. Modifier le code des `ms-*`, puis lancer `yarn meta sync-migrations --dry-run` et `yarn meta sync-migrations --pr` si des migrations ont change. La commande ouvre la PR dans `npm-packages` puis s'arrete (regle STOP de `AGENTS.md`).
2. Attendre la publication par la CI.
3. Lancer `yarn meta bump` : une PR par consommateur, jamais de push direct sur `main`.
4. Quand la CI est verte et sans conflit : `yarn meta notify-pr <repo> <numero>` (1 PR = 1 message Discord ; renseigner `DISCORD_WEBHOOK_URL` dans `.env.local`, voir `.env.example`).

## 5. Depannage par environnement

**macOS** : si `fnm` n'est pas dans le PATH apres `setup.sh`, ouvrir un nouveau terminal. Docker : demarrer Docker Desktop ou Rancher Desktop avant `setup`.

**Linux** : `setup.sh` utilise `curl` et `unzip` pour installer `fnm` ; les installer au prealable (`apt-get install curl unzip`). Docker Engine doit tourner et l'utilisateur appartenir au groupe `docker`.

**WSL2** : travailler dans le systeme de fichiers Linux (`~/`), pas sous `/mnt/c` (lenteur et droits). Activer l'integration WSL dans Docker Desktop. Environnement non teste automatiquement : tester a la main avec `./setup.sh` puis `yarn meta doctor`.

**Windows 11 natif** : `setup.ps1` installe Node par `winget`. Si `winget` est absent, installer Node 24.14.0 depuis nodejs.org puis relancer. Les etapes `apps` et `shell` sont ignorees (elles necessitent bash). Les hooks de skills (`scripts/install-skill-hooks.sh`) ne sont pas installes sans bash : utiliser WSL2 pour contribuer. Environnement non teste automatiquement.

**Erreur `docker info`** : le daemon n'est pas demarre. **Ports occupes** : une seule instance de l'infra par machine (noms de conteneurs fixes), `yarn meta down` d'abord. **Services non sains apres 3 minutes** : `docker compose -f ci-tools/docker-compose.yml logs <service>`.

## 6. Agents IA

- Regles et aiguillage : `AGENTS.md` (matrice des outils MCP et des skills `volontariapp-*`). Guide technique : `AGENT.md`.
- Serveur MCP `mesh-mcp` (projet `causalmesh`), configure par `.mcp.json` et `.agents/mesh-mcp.toml`.
- Skill des scripts : `.agents/skills/volontariapp-meta-scripts/SKILL.md`.
- Apres un clone : `scripts/install-skill-hooks.sh` est lance par `setup` ; il active le pre-commit de verification des skills dans chaque repo.
