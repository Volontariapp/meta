---
name: Backend NPM & Proto Workflow
description: Strict workflow for modifying npm-packages and proto-registry.
---

# NPM Packages Workflow

## `npm-packages`
- The `npm-packages` repository always represents a definitive version.
- **🛑 RÈGLE CRITIQUE DE STOP IMMÉDIAT** : Dès que tu as fini de modifier un fichier dans `npm-packages` :
  1. Tu vérifies que le package compile (`yarn build`).
  2. Tu crées le changeset si nécessaire (`yarn changeset add message`).
  3. **TU ARRÊTES IMMÉDIATEMENT TOUT CE QUE TU FAIS**.
  4. Tu passes la main au Lead Dev pour qu'il push sur une PR.
  5. **INTERDICTION FORMELLE** d'éditer ou de tenter de compiler les autres microservices avec des hacks/casts tant que la CI n'a pas publié la version (snapshot sur PR ou release sur `main`).
- **Versioning**: 
  - If CI passes on a PR -> you get a temporary version (snapshot).
  - If CI passes on `main` -> you get a definitive version.
- **Dependencies**: You CANNOT run `yarn up` or touch downstream repositories until the CI has completely passed and generated the new version.
- **Changesets**: 
  - After modifications, you MUST run `yarn changeset add message`.
  - Then run `yarn changeset version` to bump all inherited/dependent packages.
  - **CRITICAL**: Never bump the same package twice on the same branch (e.g., do not go from 3.1 -> 3.3).

## `proto-registry`
- All protobuf definitions reside in the `proto-registry` repository.
- Merging on `main` requires `buf lint` to succeed.
- Successful merges automatically update the `contract` and `contract-nest` packages via a PR to deploy a temporary version.
