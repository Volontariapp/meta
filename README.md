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

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Runtime** | Node.js | 24.14.0 LTS |
| **Package Manager** | Yarn | 4.12.0 (Berry) |
| **Backend** | NestJS | 11.x |
| **Mobile** | Expo (React Native) | SDK 54 / RN 0.81 |
| **Language** | TypeScript | 5.7.3 (strict) |
| **Linting** | ESLint | 9.18 (flat config) |
| **Database** | PostgreSQL + TypeOrm | — |
| **Queue** | Redis (BullMQ) | — |
| **Stream** | Redis Stream | — |
| **CI/CD** | GitHub Actions | — |

---

## Quick Start

### Interactive Menu

```bash
bash root.sh
```

### Command Center Shortcuts

The `root.sh` script is the main entry point for development. You can trigger specific modes without navigating the menu:

| Mode | Command | Description |
|---|---|---|
| **Full Setup** | `echo 1 \| ./root.sh` | Fresh install of everything |
| **Dev Backend** | `echo 12 \| ./root.sh` | Launch Gateway + all microservices |
| **Dev All** | `echo 11 \| ./root.sh` | Backend + Mobile app |
| **Nexus All** | `echo 16 \| ./root.sh` | Intelligence dashboard (Ports 4747-4752) |
| **Clean Install** | `echo 15 \| ./root.sh` | Clear all node_modules/locks and reinstall |

### Full Setup (standard)

### Full Setup (one command)

```bash
bash scripts/setup.sh
```

Installs Node.js, Yarn, developer tools, configures Oh My Zsh, clones all repositories and installs dependencies.

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

Access the UI at [https://gitnexus.vercel.app/](https://gitnexus.vercel.app/) or use it as an **MCP (Model Context Protocol)** server for your AI Agent.

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
