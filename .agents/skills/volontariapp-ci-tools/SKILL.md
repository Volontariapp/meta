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
  - by: "process:agent"
    at: "2026-10-27T23:01:57Z"
    digest: 5677798d764b2fc2
  - by: "process:agent"
    at: "2026-10-27T23:12:15Z"
    digest: a2bf41485a502ea6
  - by: "process:agent"
    at: "2026-10-27T23:12:32Z"
    digest: 7853cdac21207e4b
  - by: "process:agent"
    at: "2026-10-27T23:23:07Z"
    digest: c1d4ccd3f14bd1a9
  - by: "process:agent"
    at: "2026-10-28T09:01:59Z"
    digest: c1d4ccd3f14bd1a9
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
| Autres | `runner-pipeline.yml`, `nativapp-ci.yml`, `validate-compose.yml`, `ghcr-cleanup.yml`, `sync-all.yml` |

Dependabot : `ci-tools/.github/dependabot.yml` ne couvre que ci-tools. Les modèles pour les autres repos sont dans `ci-tools/templates/dependabot/` (`service.yml`, `runner.yml`) et se copient dans `<repo>/.github/dependabot.yml` : `sync-all.yml` ne propage que le pointeur du sous-module, jamais ce fichier. Le modèle runner liste tous les sous-packages dans `directories` pour obtenir une seule PR groupée ; garder cette liste alignée sur l'input `services` du `ci.yml` du runner. Les PR Dependabot portent les labels `docker-e2e` (demandé par le Lead Dev) et `docker-and-e2e` (celui qu'exige `service-docker-build-push.yml`, sans lui la CI complète refuse la PR) ; les deux labels doivent exister dans le repo. Dependabot n'expose pas les secrets du repo à la CI : `ORG_REPO_TOKEN` doit aussi être déclaré dans les secrets Dependabot (repo ou organisation) et son `GITHUB_TOKEN` est en lecture seule, ce qui bloque le push GHCR. Une seule PR : npm passe en hebdomadaire (lundi) avec un groupe `dependencies` qui regroupe toutes les mises à jour de version (majeurs et `@volontariapp/*` inclus), plus un groupe `npm-security` séparé pour que les correctifs de sécurité ne soient pas retardés par un majeur risqué ; `github-actions` et `docker` passent en mensuel. Pour un runner, `directories` réunit tous les sous-packages dans cette même PR, donc les E2E ne tournent qu'une fois. Les majeurs de `@nestjs/*`, `eslint`, `typescript`, `@types/node` et de l'image Docker `node` sont ignorés (`ignore`) : les `@volontariapp/*` demandent NestJS `^11` en peer (`Validate Peer Requirements` échoue sinon), la CI et `engines` sont en Node 24, et Node 26 n'embarque plus corepack (`corepack: not found` dans le Dockerfile). Retirer ces règles seulement après migration et publication de `npm-packages`, et passer image, CI et `engines` ensemble.

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
