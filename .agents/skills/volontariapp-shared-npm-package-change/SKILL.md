---
name: volontariapp-shared-npm-package-change
description: "Modifier un package partagé de npm-packages (messaging, shared, database, domain-*, auth...) et propager la nouvelle version aux consommateurs : rayon d'impact, build, changeset, STOP, snapshot CI, yarn up. À utiliser avant toute édition sous npm-packages/packages/."
type: Agent Skill
title: Shared NPM Package Change
tags: [npm-packages, changesets, stop-rule]
status: stable
paths:
  - npm-packages/package.json
  - npm-packages/.changeset/config.json
  - "npm-packages/.github/workflows/**"
mesh_keys:
  - npm-packages
  - "@volontariapp/"
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:22:12Z"
sources:
  - id: changeset
    resource: npm-packages/.changeset/config.json
    title: Configuration changesets
  - id: npm-ci
    resource: npm-packages/.github/workflows
    title: CI de publication npm-packages
  - id: orchestrate
    resource: npm-packages/scripts/ci-orchestrate.py
    title: "ci-orchestrate.py (plan, version snapshot)"
  - id: snap
    resource: npm-packages/scripts/ci-snap-publish.sh
    title: ci-snap-publish.sh (dist-tag next)
  - id: pipeline
    resource: ci-tools/.github/workflows/npm-packages-pipeline.yml
    title: Pipeline réutilisable npm-packages (ci-tools)
verified:
  - by: claude-code/claude-opus-5-5
    at: "2026-10-06T08:27:39Z"
    digest: f8d4767ea11f974c
  - by: claude-code/claude-opus-5-5
    at: "2026-10-06T09:00:39Z"
    digest: f8d4767ea11f974c
---

# Shared NPM Package Change & Règle d'Or du Stop Immédiat

Le répertoire `npm-packages/packages/` contient l'ensemble du code partagé entre microservices et leurs processus satellites :
- **Packages de domaine (`domain-<domaine>`)** : partagés entre `ms-<domaine>`, `outbox-<domaine>`, `worker-<domaine>` et `post-processors-runner`.
- **Packages transverses (`messaging`, `contracts`, `database`, `auth`, `logger`, `errors`, `monitoring`)** : consommés par l'ensemble des 17 dépôts.

---

## 🛑 RÈGLE D'OR ABSOLUE : LE STOP IMMÉDIAT

> [!CAUTION]
> **DÈS QUE TU AS TERMINÉ DE MODIFIER QUOI QUE CE SOIT DANS `npm-packages` :**
> 1. Tu vérifies localement la compilation : `yarn build` (et `yarn test`).
> 2. Tu crées le changeset puis tu appliques le bump : `yarn changeset add` puis `yarn changeset version` (une seule fois par branche).
> 3. **TU T'ARRÊTES IMMÉDIATEMENT**. Tu ne touches à AUCUN autre fichier ou repository.
> 4. **INTERDICTION FORMELLE** d'aller modifier, tester ou compiler les microservices consommateurs (`ms-*`, `api-gateway`, runners) en avance.
> 5. **INTERDICTION FORMELLE** de bricoler des types, d'utiliser du casting `as unknown as Type`, ou de poser du `any` pour faire semblant que le code compile sans le paquet publié.
> 6. **ACTION EXIGÉE** : Tu passes la main au Lead Dev. Tu lui indiques que les modifications dans `npm-packages` sont prêtes et tu **ATTENDS qu'il pousse sur une PR**.
> 7. La CI GitHub Actions s'exécute sur la PR et génère une version snapshot `<version>-snap-<sha court>`, publiée sous le dist-tag `next` et listée en commentaire de la PR (ex: `@volontariapp/messaging@2.17.1-snap-a1b2c3d`) ou définitive sur `main`.
> 8. **Ce n'est qu'APRÈS la publication effective par la CI** que tu pourras mettre à jour les dépendances dans les microservices consommateurs (`yarn up @volontariapp/<pkg>@<version>`).

---

## 1. Avant de modifier un package partagé (Impact Analysis)

Ne jamais modifier un package à l'aveugle :
1. **Mesurer le rayon d'impact** : Utilise l'outil MCP `find_dependents` pour identifier en $O(1)$ tous les fichiers et services qui importent le package ou symbole modifié :
   ```json
   find_dependents({ "target": "@volontariapp/messaging" })
   find_dependents({ "target": "SignUpCommand" })
   ```
2. **Pour les flux asynchrones** : Si tu modifies un événement ou un job dans `messaging`, utilise l'outil MCP `analyze_impact` pour visualiser les producteurs, consommateurs et sagas impactés :
   ```json
   analyze_impact({ "target": "USER_CREATED" })
   ```

---

## 2. Déroulement du Workflow Pas-à-Pas

```mermaid
flowchart TD
    A["1. Édition du code dans npm-packages/"] --> B["2. Validation locale (yarn build & yarn test)"]
    B --> C["3. Changeset et bump (yarn changeset add puis version)"]
    C --> D["🛑 4. STOP IMMÉDIAT (Passage de main au Lead Dev)"]
    D --> E["5. Le Lead Dev push sur PR GitHub"]
    E --> F["6. La CI publie la version Snapshot / Release"]
    F --> G["7. Reprise : yarn up dans les microservices consommateurs"]
```

1. **Édition locale** : Modifications ciblées dans `npm-packages/packages/<package>`.
2. **Build & Tests** : Vérifier que `yarn build` passe sans aucune erreur.
3. **Changeset** :
   - Exécuter `yarn changeset add` et sélectionner les packages modifiés, puis `yarn changeset version` pour écrire la version et le `CHANGELOG.md` que la CI vérifie.
   - Ne JAMAIS bumper deux fois le même package sur la même branche (ex: pas de 3.1 -> 3.3).
4. **🛑 STOP TOTAL** : Arrêt de toute exécution. Informer le Lead Dev que le package est prêt pour la PR.
5. **Attente de publication** : Attendre le retour de la CI avec la version snapshot ou définitive.
6. **Consommation** : Reprendre dans les microservices concernés via `yarn up @volontariapp/<package>@<version-snapshot>` et adapter le code consommateur.

---

## 2 bis. Ce que fait réellement la CI

`npm-packages/.github/workflows/ci.yml` appelle le pipeline réutilisable de `ci-tools`[^pipeline] :

| Étape | Déclencheur | Effet |
| :--- | :--- | :--- |
| `check-changelogs` | PR et `main` | Pour chaque package modifié, vérifie que `CHANGELOG.md` contient la version de `package.json` (`yarn check-changelogs`) : sans `yarn changeset version`, la PR est rouge |
| Orchestration | PR et `main` | Calcule les packages à construire : ceux modifiés **et leurs dépendants internes**, par couches topologiques[^orchestrate] |
| Build et tests | PR et `main` | Matrice parallèle sur ces packages |
| Snapshot | PR uniquement | Publie `<version>-snap-<sha court>` sous le dist-tag `next`, et liste les versions en commentaire de la PR[^snap] |
| Release | push sur `main` | Publie la version **déjà écrite** dans `package.json` (ignorée si elle existe déjà sur le registre), puis met à jour le sous-module `npm-packages` du repo `deploy` |
| Secours | `workflow_dispatch` | `job-emergency-release.yml` (option `dry_run`) |

Conséquences pratiques :
- Le bump se fait dans la PR : `yarn changeset add` puis `yarn changeset version`, **une seule fois par branche** (deux `version` sur la même branche font sauter une version, 3.1 vers 3.3).
- La version à mettre dans un consommateur pendant la PR est celle du commentaire de la CI, par exemple `yarn up @volontariapp/messaging@2.17.1-snap-a1b2c3d`. Elle change à chaque push sur la PR.
- Modifier `shared` reconstruit aussi tout ce qui en dépend dans le monorepo : le build de la PR est le premier test d'impact.
- Les versions déclarées par les consommateurs dérivent : les runners épinglent souvent une version exacte ancienne. Vérifier avec `scripts/consumers.py <package>` avant de supposer qu'un consommateur suit la dernière version.

## 2 ter. Avant d'écrire du code avec un package

Les README de plusieurs packages décrivent des API qui n'existent pas (`BaseJobHandler`, `JwtVerifier`, table `event_outbox`). La table des API réelles et des écarts est dans [Catalogue des packages](/volontariapp-shared-npm-package-change/references/package-catalogue.md). En cas de doute : `smart_search({ query, scope: "npm-packages/packages/<package>" })`.

## 3. Lien avec `proto-registry`

- Si ta modification de contrat prend sa source dans des fichiers `.proto` (dans `proto-registry`), la chaîne est asynchrone :
  1. Modification dans `proto-registry`.
  2. Merge sur `main` dans `proto-registry`.
  3. La CI de `proto-registry` ouvre/met à jour automatiquement une PR dans `npm-packages` pour régénérer `@volontariapp/contracts` et `@volontariapp/contracts-nest`.
  4. Cette PR dans `npm-packages` doit être mergée et publiée par la CI.
  5. **Tu ne dois JAMAIS tenter de toucher aux microservices avant que toute cette boucle ne soit terminée !**

[^pipeline]: Pipeline réutilisable npm-packages (ci-tools)
[^orchestrate]: ci-orchestrate.py (plan, version snapshot)
[^snap]: ci-snap-publish.sh (dist-tag next)
