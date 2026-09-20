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

> 🛑 **RÈGLE CRITIQUE ET BLOQUANTE (STOP IMMÉDIAT) :**
> Dès que tu as terminé une modification dans `npm-packages` (ex: ajout d'un enum dans `shared`, modification d'un contrat dans `messaging`, modèle dans `domain-*`) :
> **TU DOIS ABSOLUMENT ARRÊTER TOUT CE QUE TU ES EN TRAIN DE FAIRE**.
> - **Interdiction absolue** de continuer à coder dans les autres microservices (`ms-*`, `ws-service`, runners).
> - **Interdiction absolue** de bricoler des casts types (`as unknown as Type`, `any`) pour contourner l'absence du package publié.
> - **Action requise** : Tu rends immédiatement la main au Lead Dev et tu **ATTENDS qu'il pousse sur une PR** pour que la CI publie la version snapshot temporaire (ou release sur `main`).
> - Ce n'est qu'**APRÈS** la génération de cette version par la CI que les dépendances des consommateurs pourront être mises à jour via `yarn up`.

## Before editing a shared package

1. Determine blast radius: is this a `domain-<domain>` package (scoped to one domain's MS + its 3 satellite runners) or a cross-cutting package (scoped to everything)?
2. For cross-cutting packages, grep all `ms-*`, `outbox-runners`, `workers-runners`, `post-processors-runner`, `api-gateway` for the import before changing a public export or signature.

## Workflow de Modification & Publication

1. **Édition Locale** : Tu modifies le code dans `npm-packages/packages/<package>`.
2. **Build & Test** : Tu vérifies que le package compile (`yarn build`) et que les tests passent (`yarn test`).
3. **Changeset** : Tu prépares le changeset (`yarn changeset add` / `yarn changeset version`).
4. **🛑 STOP & HANDOFF** : Tu t'arrêtes immédiatement. Tu indiques au Lead Dev que le package est prêt à être poussé sur une PR.
5. **Attente du Snapshot** : Le Lead Dev push sur GitHub. La CI s'exécute et publie la version snapshot (ex: `@volontariapp/shared@0.9.1-snapshot-pr-42`).
6. **Consommation** : Une fois la version snapshot disponible, tu reprends le travail dans les microservices consommateurs en mettant à jour la dépendance.

## Never do

- Never change a shared package's public API and merge it in the same PR as a consumer without first validating via the snapshot version.
- Never assume a `domain-<domain>` package change is isolated — its outbox/worker/post-processor satellites read the same domain events and will break silently if a shape changes.
