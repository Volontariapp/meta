# Volontariapp

Modular monorepo powering the **Volontariapp** platform — connecting volunteers with organizations.

---

## Architecture

```
meta/
├── api-gateway/          NestJS API Gateway (HTTP entry point)
├── ms-user/              User microservice
├── ms-event/             Event microservice
├── ms-post/              Post microservice
├── nativapp/             React Native mobile app (Expo SDK 54)
├── npm-packages/         Shared NPM packages (Yarn 4 workspaces)
│   └── packages/
│       ├── domain-event/       Domain event contracts
│       ├── domain-post/        Domain post contracts
│       ├── domain-user/        Domain user contracts
│       └── eslint-config/      Shared ESLint flat config
├── ci-tools/             CI/CD reusable workflows
└── scripts/              Project-wide automation
```

Each service and `npm-packages` is a **Git submodule**, enabling independent versioning and CI/CD pipelines while keeping a unified developer experience.

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
| **Database** | PostgreSQL + Sequelize | — |
| **Queue** | Redis (BullMQ) | — |
| **CI/CD** | GitHub Actions | — |

---

## Quick Start

### Interactive Menu

```bash
bash root.sh
```

This opens the **Command Center** — an interactive menu to run any setup or maintenance script.

### Full Setup (one command)

```bash
bash scripts/setup.sh
```

Installs Node.js, Yarn, developer tools, configures Oh My Zsh, inits all submodules and dependencies.

### Individual Scripts

| Script | Description |
|---|---|
| `scripts/install_runtime.sh` | Install Node.js 24.14.0 + Yarn 4 via corepack |
| `scripts/install_apps.sh` | Interactive install of Rancher, Cursor, VS Code, Postico, Redis Insight, Postman |
| `scripts/install_shell.sh` | Oh My Zsh + autosuggestions, syntax highlighting, Powerlevel10k |
| `scripts/init_repos.sh` | Init submodules, set SSH remotes, install deps |
| `scripts/sync-submodules.sh` | Fetch + rebase all submodules, update pointers |

---

## Shared Packages

The `npm-packages/` workspace contains shared libraries published to NPM under the `@volontariapp` scope.

```bash
cd npm-packages

yarn setup          # Verify config + install deps
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

## Submodule Management

### Sync all submodules (rebase onto latest main)

```bash
bash scripts/sync-submodules.sh
```

### Add a new submodule

```bash
git submodule add git@github.com:Volontariapp/<repo>.git <folder>
```

### Clone with submodules

```bash
git clone --recurse-submodules git@github.com:Volontariapp/meta.git
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

UNLICENSED — Proprietary software. All rights reserved.
