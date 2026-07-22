---
name: Shared NPM Package Change
description: Workflow for editing a shared package in npm-packages and propagating it to the microservice plus its satellite processes.
---

# Shared NPM Package Change

`npm-packages/packages/` holds the shared code. Each domain has a dedicated `domain-<domain>` package (`domain-post`, `domain-user`, `domain-social`) shared between:
- the `ms-<domain>` microservice
- its `outbox-<domain>` runner (in `outbox-runners`)
- its `worker-<domain>` runner (in `workers-runners`)
- its post-processor (in `post-processors-runner`, via the `post-processors` package)

Cross-cutting packages (`auth`, `logger`, `errors`, `messaging`, `monitoring`, `contracts`, `database`) are consumed even more broadly — check usage before assuming a change is domain-local.

## Before editing a shared package

1. Determine blast radius: is this a `domain-<domain>` package (scoped to one domain's MS + its 3 satellite runners) or a cross-cutting package (scoped to everything)?
2. For cross-cutting packages, grep all `ms-*`, `outbox-runners`, `workers-runners`, `post-processors-runner`, `api-gateway` for the import before changing a public export or signature.

## Publishing the change

- On PR: a snapshot version is published automatically — consumers can pin to it to test integration before merge.
- On merge to `main`: the definitive version is published.
- Consumers (MS + satellite runners) must bump to the new version explicitly — a snapshot publish does not auto-propagate.

## Never do

- Never change a shared package's public API and merge it in the same PR as a consumer without first validating via the snapshot version.
- Never assume a `domain-<domain>` package change is isolated — its outbox/worker/post-processor satellites read the same domain events and will break silently if a shape changes.
