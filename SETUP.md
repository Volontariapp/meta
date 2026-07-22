# SETUP.md — Travailler avec les agents IA sur ce projet

Ce document explique comment un développeur (humain) doit s'appuyer sur l'outillage IA déjà en place dans ce repo — pas comment le code fonctionne (voir `AGENT.md` pour les patterns techniques, `.agents/AGENTS.md` pour l'architecture globale).

## 1. Vue d'ensemble de l'écosystème

```
meta/
├── .agents/AGENTS.md              ← règles globales pour tout agent IA (archi, DDD/CQRS, PII, rg obligatoire...)
├── .agents/skills/global/         ← skills transverses (proto, npm partagé, flux async) — utiles à TOUT profil
├── .agents/skills/domain/         ← skills archi backend commune (utiles aux profils backend)
├── META_CONTEXT.md                ← résumé 1 page des 14 repos (généré, à lire AVANT d'explorer un repo inconnu)
├── META_GRAPH.json                ← même info en JSON (dépendances cross-repo machine-readable)
├── scripts/setup-ai-context.sh    ← régénère META_CONTEXT.md/META_GRAPH.json après un changement structurel
└── <repo>/CLAUDE.md               ← contenu spécifique à CE repo (domaine, événements, endpoints) — pas de généralités
```

Principe : le contexte global (archi, règles) est écrit **une seule fois** à la racine. Chaque `CLAUDE.md` de repo ne contient que ce qui est spécifique à ce repo. Les skills transverses vivent dans `.agents/skills/global/` et `domain/`, pas copiés-collés dans chaque repo.

## 2. Avant de commencer une tâche, dans cet ordre

1. Lire `META_CONTEXT.md` pour savoir quel(s) repo(s) sont concernés et leurs dépendances `@volontariapp/*`.
2. Lire le `CLAUDE.md` du repo ciblé (domaine, événements, endpoints réels).
3. Si la tâche touche plusieurs repos, consulter le skill transverse pertinent dans `.agents/skills/global/` (voir §4).
4. Chercher avec `rg`, jamais un outil de recherche générique lent — voir `.agents/AGENTS.md` §7.
5. Après un changement structurel (nouveau package, nouvelle route gRPC majeure), relancer `./scripts/setup-ai-context.sh` pour que `META_CONTEXT.md` reste à jour pour les prochains agents.

## 3. Par profil

### Profil "je code uniquement le backend" (ms-user, ms-post, ms-event, ms-social, api-gateway)

- Skills à connaître : `.agents/skills/domain/backend-architecture`, `backend-clean-code`, `backend-outbox-pattern`, `backend-npm-workflow`.
- Toute la logique métier vit dans `npm-packages/packages/domain-<domaine>` — le microservice lui-même ne fait que du câblage NestJS/gRPC (voir le `CLAUDE.md` de chaque `ms-*` qui documente l'agrégat réel et les events émis).
- Patterns de code (DTO, controller, tests, naming) : `AGENT.md` à la racine — c'est la référence technique, ne pas la redemander à l'agent à chaque fois, juste la citer.
- Si tu modifies un contrat `.proto` consommé par ton service : lis `.agents/skills/global/proto-contract-evolution` avant de toucher au `.proto`.
- Si tu modifies un package `npm-packages/packages/*` partagé : lis `.agents/skills/global/shared-npm-package-change` — la propagation aux runners satellites (`outbox-*`, `worker-*`, post-processor) n'est pas automatique.

### Profil "je code uniquement le front / mobile" (nativapp)

- Les skills sont dans `nativapp/.agents/skills/` (pas dans le dossier global — ce sont des skills React Native spécifiques, importés depuis le pack Callstack, pas de duplication avec le backend).
- `nativapp/CLAUDE.md` et `nativapp/AGENTS.md` listent les skills **obligatoires** avant toute tâche front : `rn-architecture`, `rn-clean-code`, `rn-styling`, `rn-data-fetching`, `rn-forms`, `rn-verification`, `react-doctor`, `rn-stability`.
- Les types consommés depuis le backend viennent de `@volontariapp/contracts` (interfaces TS pures, générées depuis `proto-registry`) — ne jamais redéfinir un type déjà présent dans ce package.
- Tu n'as normalement pas besoin des skills `.agents/skills/domain/` (backend) ni `global/proto-contract-evolution` (tu consommes le contrat, tu ne le fais pas évoluer) — sauf si tu dois demander un changement de contrat, auquel cas c'est une tâche cross-repo (profil suivant).

### Profil "je fais du cross-repo / lead technique" (proto-registry, npm-packages, ou une tâche qui touche 2+ repos)

C'est le profil le plus outillé par ce setup, car c'est là que la friction était la plus forte avant ce nettoyage :

- **Changer un contrat gRPC** (`proto-registry`) → `.agents/skills/global/proto-contract-evolution` : qui consomme quoi, `buf breaking`, ordre de rollout.
- **Changer un package npm partagé** (`npm-packages`) → `.agents/skills/global/shared-npm-package-change` : blast radius (domaine vs transverse), snapshot PR / publish main.
- **Debugger un flux asynchrone** (post créé mais événement jamais consommé, etc.) → `.agents/skills/global/trace-async-flow` : la chaîne complète `jobs_outbox` → `outbox-<domaine>` → BullMQ → `worker-<domaine>` → `job_audit` → `event_outbox` → Redis Stream → post-processor, avec les points de contrôle à chaque étape.
- Utilise `META_GRAPH.json` pour savoir en une requête quels repos dépendent de quel package `@volontariapp/*` avant de casser une API partagée.

### Profil "CI/CD, infra, outillage" (ci-tools, changelog-checker, outbox-runners, workers-runners, post-processors-runner, ws-service)

- Ces repos n'ont pas de logique métier — leur `CLAUDE.md` (quand il existe) décrit uniquement leur rôle d'infrastructure (voir `ci-tools/CLAUDE.md`, `changelog-checker/CLAUDE.md`, `outbox-runners/CLAUDE.md`).
- Toute modification d'un workflow réutilisable dans `ci-tools/.github/workflows/` a un impact multi-repo immédiat : vérifier qui consomme le workflow avant de changer sa signature d'input.
- `workers-runners`, `post-processors-runner`, `ws-service` n'ont pas de `CLAUDE.md` propre — se référer à leur `ARCHITECTURE.md`/`README.md` local.

## 4. Où ajouter un nouveau skill

| Le skill s'applique à... | Emplacement |
|---|---|
| Une tâche récurrente qui touche 2+ repos | `.agents/skills/global/<nom>/SKILL.md` |
| Une convention d'architecture backend commune à tous les `ms-*` | `.agents/skills/domain/<nom>/SKILL.md` |
| Une tâche spécifique au front/mobile React Native | `nativapp/.agents/skills/<nom>/SKILL.md` |
| Une règle propre à un seul repo backend et non réutilisable ailleurs | dans le `CLAUDE.md` de ce repo directement, pas un skill séparé |

Ne jamais copier-coller un skill dans plusieurs repos "au cas où" — c'est exactement le problème qu'on vient de nettoyer (pack `mattpocock/skills` dupliqué dans 14 repos, jamais utilisé). Un skill non centralisé et non référencé depuis un `CLAUDE.md`/`AGENTS.md` ne sera jamais lu par un agent.

## 5. Outils installés

- **RTK (Rust Token Killer)** : proxy CLI qui réécrit `git`/`npm`/`jest`/etc. à la volée pour réduire la consommation de tokens (~80% sur les opérations de dev courantes). Transparent via hook — voir la section "RTK" en bas de chaque `CLAUDE.md`. Commandes directes utiles : `rtk gain` (analytics d'économie), `rtk discover` (recherche d'opportunités manquées), `rtk read/ls/find/grep` (sorties compressées).
- **ripgrep (`rg`)** : recherche de code, obligatoire (voir `.agents/AGENTS.md` §7).
- **repomix** (`npx repomix --compress`) : extraction AST à la demande d'un seul repo (signatures sans corps de fonction), pas de génération systématique.
- **graphify** (`graphify update <repo>`) : graphe de code par repo (`<repo>/graphify-out/graph.json`, ignoré par git, régénérable). Utile pour `graphify query`/`graphify affected`/`graphify god-nodes` sur un repo précis.
  - L'intégration Claude Code (`graphify claude install`) est **activée** dans les 14 repos : une section "graphify" a été ajoutée en bas de chaque `CLAUDE.md`, et un hook `PreToolUse` (`.claude/settings.json`) rappelle d'utiliser `graphify query`/`explain`/`path` avant de grepper ou lire du code brut sur `Bash|Grep|Read|Glob`. Le hook est purement informatif (il ajoute du contexte, il ne bloque jamais un outil).
  - Après une modif de code dans un repo, lancer `graphify update .` dans ce repo pour garder le graphe à jour (AST seul, pas d'appel LLM).
