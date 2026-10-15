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
    at: "2026-10-13T21:57:01Z"
    digest: 1d56e70c2352bbd2
  - by: claude-code/agent
    at: "2026-10-14T11:23:52Z"
    digest: df16d0c27e86980d
  - by: "process:agent"
    at: "2026-10-15T15:05:58Z"
    digest: 7c0dbfc54639c48f
  - by: "process:agent"
    at: "2026-10-15T15:17:18Z"
    digest: 931c6ef98f172bfc
  - by: "process:ci-integration-tests"
    at: "2026-10-15T16:45:31Z"
    digest: 0e0ef7a227942811
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
| Autres | `runner-pipeline.yml`, `nativapp-ci.yml`, `validate-compose.yml`, `ghcr-cleanup.yml`, `sync-all.yml` |

Règle : `@main` est consommé immédiatement par tous les repos. Avant de changer les `inputs` ou `secrets` d'un workflow, lister ses appelants (`rg "ci-tools/.github/workflows/<x>.yml" <repo>` repo par repo) et garder la compatibilité.

## Infra locale[^compose]

- `docker-compose.yml` : une base Postgres par service (`postgres-user`, `-post`, `-event`, `-social`, `-ws`, `-storage`), `neo4j-social`, `redis` et `redis-ws-service`, MinIO (`minio-init` exécute `scripts/init-buckets.sh`[^buckets]), un conteneur `*-migration` avant chaque `ms-*`, `api-gateway` et `api-gateway-e2e`. `otel-collector` et `jaeger` sont encore déclarés à côté de `datadog-agent`.
- Observabilité locale : service `datadog-agent` (`gcr.io/datadoghq/agent:7`), OTLP gRPC sur 4317, APM sur 8126 ; `OTEL_EXPORTER_OTLP_ENDPOINT=http://datadog-agent:4317` dans `x-ms-common-env` ; `DD_API_KEY` lu dans le `.env` local.
- `MS_STORAGE_URL: ms-storage:5006` est déjà déclaré, mais `ms-storage` n'écoute pas encore en gRPC (voir `volontariapp-file-storage-flow`).

[^workflows]: Workflows réutilisables
[^compose]: docker-compose local
[^buckets]: init-buckets.sh (MinIO)
