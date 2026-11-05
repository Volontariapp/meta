---
name: volontariapp-ci-tools
description: "Modifier la CI partagée (workflows réutilisables GitHub Actions appelés par tous les repos) ou l'infrastructure locale docker-compose de ci-tools (bases, Redis, MinIO, Datadog). À utiliser avant de toucher ci-tools : tout changement a un impact multi-repo immédiat."
type: Catalogue
title: CI partagée et infra locale (ci-tools)
tags: [ci, github-actions, docker-compose]
status: stable
paths:
  - "ci-tools/.github/workflows/**"
  - ci-tools/docker-compose.yml
  - "ci-tools/scripts/**"
  - "ci-tools/templates/**"
mesh_keys:
  - ci-tools
  - docker-compose
  - e2e-orchestrator
  - service-ci.yml
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T09:12:34Z"
verified:
  - by: claude-code/agent
    at: "2026-11-01T16:23:06Z"
    digest: 4ddb86dffde6d1e9
  - by: claude-code/agent
    at: "2026-11-02T12:20:48Z"
    digest: f9cb38dcab835223
  - by: claude-code/agent
    at: "2026-11-02T13:06:56Z"
    digest: c4f5e8db2542a34a
  - by: "process:claude-code"
    at: "2026-11-03T14:03:07Z"
    digest: d17365b608116a1c
  - by: claude-code/agent
    at: "2026-11-05T17:34:09Z"
    digest: da39a3ee5e6b4b0d
sources:
  - id: workflows
    resource: ci-tools/.github/workflows
    title: Workflows réutilisables
  - id: compose
    resource: ci-tools/docker-compose.yml
    title: docker-compose local
  - id: buckets
    resource: ci-tools/scripts/init-buckets.sh
    title: init-buckets.sh (MinIO)
---

# CI partagée et infra locale (`ci-tools`)

`ci-tools` ne contient aucune logique métier : des workflows réutilisables appelés par les autres repos (`uses: Volontariapp/ci-tools/.github/workflows/<x>.yml@main`) et l'environnement local complet. Il est aussi présent comme sous-module `ci-tools/` dans chaque repo : on le modifie dans le repo `meta/ci-tools`, jamais dans une copie de sous-module.

## Workflows réutilisables[^workflows]

| Famille | Workflows |
| :--- | :--- |
| Microservices | `service-ci.yml` (lint, tests, couverture), `service-docker-smoke.yml` (healthcheck en conteneur isolé), `service-docker-build-push.yml` (build et push GHCR) |
| E2E multi-repo | `e2e-orchestrator.yml` (démarre DB et tous les services, lance la suite E2E), `e2e-matrix-checker.yml` (bloque une PR qui viserait des images de test sur `main`) |
| `npm-packages` | `npm-packages-pipeline.yml` (orchestration, test-build, snapshot, release), `npm-packages-snap-release.yml`, `npm-packages-release.yml`, `npm-packages-emergency-release.yml`, `npm-packages-changelog.yml` |
| `proto-registry` | `proto-sync.yml` (lint, puis génération et PR dans `npm-packages` sur `main`), `proto-reset.yml` |
| Sécurité | `security-scan.yml` (Trivy fs : vulnérabilités, secrets, misconfigurations ; input `blocking`, `false` par défaut = mode warning ; appelé en job `security` par `service-ci`, `runner-pipeline`, `npm-packages-pipeline` et `nativapp-ci`, donc aucun repo appelant à modifier ; ci-tools le lance sur lui-même via `security.yml`, et `proto-registry`, `deploy` et `docs` ont leur propre `security.yml` car ils n'utilisent pas la CI partagée) |
| Notification | `pr-ready-notify.yml` : un message Discord par PR prête (voir ci-dessous) |
| Autres | `runner-pipeline.yml`, `nativapp-ci.yml`, `validate-compose.yml`, `ghcr-cleanup.yml`, `sync-all.yml` |

`pr-ready-notify.yml` s'appelle comme DERNIER job du `ci.yml` de chaque repo, avec `needs:` listant tous les jobs de la CI du repo (c'est `needs:` qui garantit « CI verte », pas une interrogation de l'API). Le `if:` de l'appelant est `${{ !failure() && !cancelled() && github.event_name == 'pull_request' }}` : `needs:` impose `success()` implicite, donc un job `skipped` (e2e conditionnel) bloquerait la notification. L'appelant déclare aussi `permissions: { contents: read, issues: write, pull-requests: write }` sur ce job : un workflow réutilisable ne peut pas élever les permissions de son appelant, un `permissions: contents: read` au niveau workflow empêche sinon de poser le label. Input `channel` : `backend` (secret `DISCORD_WEBHOOK_BACKEND`) ou `frontend` (`DISCORD_WEBHOOK_FRONTEND`, nativapp). Il notifie si l'auteur est `dependabot[bot]` ou si la PR porte le label `notify-discord`, sans conflit (`mergeable`, relu jusqu'à 10 x 6 s tant que `UNKNOWN`), hors brouillon. Une PR = un message : le label `discord-notified` est posé AVANT l'envoi (le claim) ; s'il ne peut pas l'être le job échoue sans rien envoyer (sinon chaque push renotifierait), et si l'envoi échoue le label est retiré pour qu'un rerun puisse renvoyer. Retirer le label à la main pour être renotifié. Une `concurrency` par PR sérialise deux runs rapprochés. L'appel Discord a `--max-time 20 --retry 3 --retry-all-errors` et le job `timeout-minutes: 3` ; le payload a `allowed_mentions: {parse: []}` et un titre tronqué. Ce job ne doit pas être un check requis (une panne Discord le met en rouge). Limites assumées : aucune autre gâchette n'existe, donc une PR encore `UNKNOWN`/conflictuelle à la fin de la CI, ou un label `notify-discord` ajouté après la CI, ne notifie qu'au push suivant. Les secrets doivent exister en secrets d'organisation ET en secrets Dependabot ; le `GITHUB_TOKEN` de Dependabot est en lecture seule, le label est donc posé avec `ORG_REPO_TOKEN`. Sans secret webhook, le job avertit et ne fait rien. Les repos qui listent leurs secrets un par un (`npm-packages`, runners) doivent passer les deux webhooks et `ORG_REPO_TOKEN` explicitement. Le titre et les branches de la PR sont lus via `gh`, jamais interpolés avec `${{ }}` dans un script.

Dependabot : `ci-tools/.github/dependabot.yml` ne couvre que ci-tools. Dependabot n'a ni config partagée ni include distant : le fichier doit exister dans chaque repo. Les modèles sont dans `ci-tools/templates/dependabot/` (`service.yml`, `runner.yml`) et `scripts/render-dependabot.py` les rend par type de repo (`service`, `service-nodocker`, `monorepo`, `runner`, `actions`). Le workflow `sync-dependabot.yml` (push sur les modèles ou `workflow_dispatch` avec l'input `repos`) ouvre une PR `ci/dependabot-sync` par repo dont le fichier diffère (secret `ORG_REPO_TOKEN` requis) : ne jamais éditer `<repo>/.github/dependabot.yml` à la main, modifier les modèles. `sync-all.yml` ne propage que le pointeur du sous-module, jamais ce fichier. Le modèle runner liste tous les sous-packages dans `directories` pour obtenir une seule PR groupée ; garder cette liste alignée sur l'input `services` du `ci.yml` du runner. Les PR Dependabot portent les labels `docker-e2e` (demandé par le Lead Dev) et `docker-and-e2e` (celui qu'exige `service-docker-build-push.yml`, sans lui la CI complète refuse la PR) ; les deux labels doivent exister dans le repo. Le contrôle du label `docker-and-e2e` (`service-docker-build-push.yml`, `e2e-orchestrator.yml`) relit les labels en direct avec `ORG_REPO_TOKEN` et réessaie jusqu'à 5 minutes (10 x 30 s), car le payload de l'événement est figé et Dependabot peut ajouter ses labels plusieurs minutes après l'ouverture de la PR (sinon `ci-docker` échoue par course, vu sur ms-event#70). Les repos sont publics : un checkout de PR ne doit pas recevoir `token: ${{ secrets.ORG_REPO_TOKEN }}` (une valeur Dependabot invalide casse alors le checkout, `Bad credentials`, même sur un repo public) ; ce secret reste réservé aux étapes qui poussent ou ouvrent des PR dans un autre repo. Dependabot n'expose pas les secrets du repo à la CI : `ORG_REPO_TOKEN` doit aussi être déclaré dans les secrets Dependabot (repo ou organisation) et son `GITHUB_TOKEN` est en lecture seule, ce qui bloque le push GHCR. Peu de PR : npm passe en hebdomadaire (lundi) avec un groupe `dependencies` (mineurs et patchs, `@volontariapp/*` inclus, mergeable seul), un groupe `majors` séparé (un majeur cassé comme typeorm 1.x, bullmq 6 ou expo 58 ne bloque plus le groupe précédent) et un groupe `npm-security` pour que les correctifs de sécurité ne soient pas retardés ; la limite est de 3 PR npm ; `github-actions` et `docker` passent en mensuel. Pour un runner, `directories` réunit tous les sous-packages dans cette même PR, donc les E2E ne tournent qu'une fois. Les majeurs de `@nestjs/*`, `@types/node` et de l'image Docker `node`, ainsi que les majeurs et mineurs de `eslint`, `@eslint/js` et `typescript` (`typescript-eslint` de `@volontariapp/eslint-config` exige `typescript <5.8`), ainsi que `@opentelemetry/api` (`@opentelemetry/core` exige `<1.10.0`), sont ignorés (`ignore`) : les `@volontariapp/*` demandent NestJS `^11` en peer (`Validate Peer Requirements` échoue sinon), la CI et `engines` sont en Node 24, et Node 26 n'embarque plus corepack (`corepack: not found` dans le Dockerfile). Pour npm-packages (`monorepo`, `directories` `/` et `/packages/*`), `@opentelemetry/sdk-node`, `@opentelemetry/exporter-*`, `@opentelemetry/auto-instrumentations-node`, `bullmq` et `sharp` sont gelés en mineur et majeur : leurs versions 0.x ou mineures ont changé l'API wrappée par les paquets publiés (`metricReader` devenu `metricReaders` dans `monitoring/src/tracing.ts`, appel à 4 arguments dans `workers/src/core/base.worker.ts`, `failOnError` retiré de `SharpOptions` dans `storage-pipeline`) ; les migrer dans une PR dédiée avec changesets (règle du STOP). Attention : le motif de remplacement `directory: "/"` + `open-pull-requests-limit` de `render-dependabot.py` doit suivre la limite du modèle, sinon `packages/*` disparaît silencieusement. Pour nativapp, `react`, `react-dom`, `react-test-renderer`, `@types/react`, `typescript-eslint` et `@typescript-eslint/*` sont aussi ignorés pour toute mise à jour (react 19.1.10 casse l'accord avec le SDK qui épingle 19.1.0 ; typescript-eslint résout en 8.72 et lève 10 erreurs `no-unsafe-enum-assignment`), de même que `react-native`, `react-native-*`, `@react-native-community/*` et `@react-navigation/native-stack` sont ignorés même en patch : l'étape `expo install --check` du CI refuse toute version différente de celle du SDK (datetimepicker 8.4.7, keyboard-controller 1.18.6, worklets 0.5.2) et react-native 0.81.6 casse 24 tests sous SDK 54 (qui épingle 0.81.5), et `@react-navigation/bottom-tabs` 7.21 (`render is not a function`) et `typescript-eslint` 8.72 (10 erreurs `no-unsafe-enum-assignment`) sont gelés en mineur ; trouvé par bisect de la PR groupée contre les tests. Pour nativapp (`service-nodocker`), `react`, `react-dom`, `react-native`, `react-native-*`, `expo`, `expo-*`, `@expo/*`, `@react-native/*` et `@types/react` sont limités aux patchs : leurs versions sont épinglées par l'Expo SDK (la PR groupée qui montait react-native 0.81 vers 0.88 cassait le lint, 35 erreurs contre 0 sur main) et ne bougent que par une montée de SDK (`expo install --fix`). Les majeurs de `typeorm`, `bullmq`, `redis`, `ioredis` et `@opentelemetry/core` sont aussi ignorés (typeorm 1.x contredit le `~0.3` de `@volontariapp/bridge`, `@opentelemetry/core` 3 exige `@opentelemetry/api` >=1.10) : la PR `majors` ne garde alors que les outils de dev (globals, lint-staged, `@types/supertest`). Pour nativapp, les majeurs de `jest`, `jest-expo`, `@types/jest`, `@testing-library/react-native` et `@babel/core` suivent la version d'Expo SDK. Retirer ces règles seulement après migration et publication de `npm-packages`, et passer image, CI et `engines` ensemble.

Règle : `@main` est consommé immédiatement par tous les repos. Avant de changer les `inputs` ou `secrets` d'un workflow, lister ses appelants (`rg "ci-tools/.github/workflows/<x>.yml" <repo>` repo par repo) et garder la compatibilité.

## Infra locale[^compose]

- `docker-compose.yml` : une base Postgres par service (`postgres-user`, `-post`, `-event`, `-social`, `-ws`, `-storage`, `-ranking` sur le port 5438), `neo4j-social`, `redis` et `redis-ws-service`, MinIO (`minio-init` exécute `scripts/init-buckets.sh`[^buckets]), un conteneur `*-migration` avant chaque `ms-*`, `api-gateway` et `api-gateway-e2e`. `otel-collector` et `jaeger` sont encore déclarés à côté de `datadog-agent`.
- Piège : `e2e-orchestrator.yml` lance `--profile migrations pull`, qui tire l'image de TOUS les `*-migration` déclarés. Déclarer `ms-<x>-migration` avant la première publication de `ghcr.io/volontariapp/ms-<x>` casse l'E2E de tous les repos : ajouter d'abord `postgres-<x>` seul (suffisant pour `service-ci.yml`), puis le service de migration une fois l'image publiée.
- Piège (commentaire « CI Snapshot Report » de `npm-packages`) : `npm-packages-snap-release.yml` télécharge les résumés de coverage avec `pattern: coverage-summary-*`. Avec **un seul** artefact correspondant (une PR qui ne construit qu'un paquet), `download-artifact` l'extrait directement dans `coverage-artifacts/` au lieu d'un dossier par artefact, et `scripts/ci-pr-comment.py` (qui lit `coverage-artifacts/coverage-summary-<id>/coverage-summary.json`) affichait des tirets. L'étape « Normalize the coverage artifact layout » range le fichier dans son dossier quand un seul paquet est en `BUILD`.
- Observabilité locale : service `datadog-agent` (`gcr.io/datadoghq/agent:7`), OTLP gRPC sur 4317, APM sur 8126 ; `OTEL_EXPORTER_OTLP_ENDPOINT=http://datadog-agent:4317` dans `x-ms-common-env` ; `DD_API_KEY` lu dans le `.env` local.
- `MS_STORAGE_URL: ms-storage:5006` est déjà déclaré, mais `ms-storage` n'écoute pas encore en gRPC (voir `volontariapp-file-storage-flow`).

[^workflows]: Workflows réutilisables
[^compose]: docker-compose local
[^buckets]: init-buckets.sh (MinIO)
