# Volontariapp

Modular monorepo powering the **Volontariapp** platform — connecting volunteers with organizations.

---

## Architecture

```
meta/
├── api-gateway/          NestJS API Gateway (HTTP entry point)
├── ms-user/              User microservice (NestJS)
├── ms-event/             Event microservice (NestJS)
├── ms-post/              Post microservice (NestJS)
├── nativapp/             React Native mobile app (Expo SDK 54)
├── npm-packages/         Shared NPM packages (Yarn 4 workspaces)
│   └── packages/
│       ├── domain-event/       Domain event contracts
│       ├── domain-post/        Domain post contracts
│       ├── domain-user/        Domain user contracts
│       └── eslint-config/      Shared ESLint flat config
├── proto-registry/       Centralized Protobuf registry (gRPC via Buf)
├── changelog-checker/    CI validation tool (Go-based)
├── ci-tools/             CI/CD reusable workflows
└── scripts/              Project-wide automation
```

Each service and `npm-packages` is a separate repository, enabling independent versioning and CI/CD pipelines while keeping a unified developer experience through this umbrella repository.

> 📖 **Architecture Détaillée (Modèle C4)** : 
> Pour comprendre en profondeur la tuyauterie asynchrone (Outbox, Scatter-Gather), l'isolation des domaines et le déploiement GitOps, **[consultez la documentation complète de l'architecture ici](docs/README.md)**.

---

## Tech Stack

| Layer | Technology | Rôle / Usage |
|---|---|---|
| **Runtime** | Node.js (24.14.0 LTS) | Moteur d'exécution asynchrone ultra-rapide. |
| **Package Manager** | Yarn (4.12.0 Berry) | Gestion stricte des dépendances via Workspaces. |
| **Backend API** | NestJS (11.x) | Framework modulaire pour les Microservices (gRPC). |
| **Backend Workers** | NestJS Standalone | Consommateurs (Background Jobs) à très faible empreinte RAM. |
| **Mobile** | React Native (Expo 54) | Application frontend unifiée (iOS / Android). |
| **Real-Time** | Socket.io | Passerelle WebSockets avec Redis Adapter Pub/Sub. |
| **Persistance** | PostgreSQL (TypeORM) | Bases de données isolées par domaine (ACID). |
| **Event Broker** | Redis Streams | Bus d'événements persistant pour le backend asynchrone. |
| **Job Queue** | Redis (BullMQ) | Gestion des files d'attente (Envoi emails, calculs lourds). |
| **Déploiement** | K3s + ArgoCD | GitOps, Pod Security Admissions, Sealed Secrets. |

---

## 🚀 Quick Start & Setup

Le point d'entrée central de ce monorepo est le script interactif **`root.sh`**. Il remplace les commandes complexes par un menu CLI intuitif.

### 1. Installation Initiale (Full Setup)

Si vous clonez ce projet pour la première fois, lancez simplement :

```bash
bash root.sh
# Sélectionnez l'option 1) Full Setup
```
Cette commande automatise entièrement l'onboarding :
- Installation de Node.js, Yarn (Corepack), et des outils (VS Code, Redis Insight).
- Configuration de votre shell (Oh My Zsh).
- Clonage et initialisation de **tous les sous-dépôts** (Microservices, NPM Packages, Runners).
- Installation des dépendances transverses.

### 2. Lancement au Quotidien (Dev Mode)

Pour démarrer l'environnement de développement, exécutez `bash root.sh` et choisissez l'une des options de la section **Development (Turbo)** :

- **`11) Dev All`** : Lance l'intégralité du projet (API Gateway, tous les Microservices, Outbox, Post-Processors, WS-Service ET l'application Mobile). Idéal pour un test end-to-end.
- **`13) Dev Backend`** : Lance uniquement la partie serveur (sans le Mobile).
- **`15) Dev Microservices`** : Ne lance que les briques API synchrones.

*Astuce : Vous pouvez utiliser des raccourcis directs sans passer par le menu :*
```bash
echo 11 | ./root.sh  # Lance le Dev All instantanément
```

### 3. Gestion des Migrations de Base de Données

Le menu intègre également les utilitaires de base de données :
- **`19) Sync Migrations`** : Synchronise l'état TypeORM avec vos entités.
- **`20) Run Migrations`** : Joue les scripts SQL sur l'environnement en cours (local, dev, etc.).

### Individual Scripts

| Script | Description |
|---|---|
| `scripts/install_runtime.sh` | Install Node.js 24.14.0 + Yarn 4 via corepack |
| `scripts/install_apps.sh` | Interactive install of Rancher, Cursor, VS Code, Postico, Redis Insight, Postman |
| `scripts/install_shell.sh` | Oh My Zsh + autosuggestions, syntax highlighting, Powerlevel10k |
| `scripts/init_repos.sh` | Clone repositories, set SSH remotes, install deps |
| `scripts/sync-repos.sh` | Fetch + rebase all repositories |
| `scripts/audit_fix.sh` | Check and fix vulnerabilities across all workspaces (skips nativapp) |

---

## GitNexus Intelligence

This repository is powered by **GitNexus** for deep code understanding, impact analysis, and visualization.

### Dashboard & MCP

To visualize the knowledge graph and search across all services simultaneously:

```bash
bash root.sh
# Select option 16) 🧠 Nexus All
```

This launches GitNexus servers on dedicated ports:

| Service | Port |
|---|---|
| `api-gateway` | 4747 |
| `ms-user` | 4748 |
| `ms-post` | 4749 |
| `ms-event` | 4750 |
| `nativapp` | 4751 |
| `npm-packages` | 4752 |


---

## Shared Packages

The `npm-packages/` workspace contains shared libraries published to NPM under the `@volontariapp` scope.

```bash
cd npm-packages

yarn build          # Build all packages
yarn lint           # Lint all packages
yarn create-package # Scaffold a new package interactively
```

### Available Packages

| Package | Description |
|---|---|
| `@volontariapp/domain-event` | Domain event definitions and contracts |
| `@volontariapp/domain-post` | Domain post definitions and contracts |
| `@volontariapp/domain-user` | Domain user definitions and contracts |
| `@volontariapp/eslint-config` | Shared ESLint flat config (strict TypeScript) |

---

## Mobile App

The `nativapp/` directory contains the React Native mobile application built with Expo SDK 54.

```bash
cd nativapp

yarn install
yarn start        # Start Expo dev server
yarn ios          # Run on iOS simulator
yarn android      # Run on Android emulator
```

---

## Repository Management

### Sync all repositories (rebase onto latest main)

```bash
bash scripts/sync-repos.sh
```

### Clone meta and initialize all repositories

```bash
git clone git@github.com:Volontariapp/meta.git
cd meta
bash scripts/init_repos.sh
```

---

## Project Standards

- **TypeScript Strict Mode** — `strict: true` with all flags enabled
- **ESLint** — Single shared config via `@volontariapp/eslint-config`
- **No comments in code** — Clean, self-documenting implementations
- **Changelog** — Every package maintains a `CHANGELOG.md` with PR links
- **Conventional Commits** — `feat:`, `fix:`, `chore:`, `docs:`

---

## License

MIT— Proprietary software. All rights reserved.
