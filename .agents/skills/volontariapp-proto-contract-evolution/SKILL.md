---
name: volontariapp-proto-contract-evolution
description: "Modifier un contrat Protobuf de proto-registry (champ, message, enum, RPC) sans casser la compatibilité wire, puis suivre la cascade proto-registry, PR automatique dans npm-packages, publication, consommateurs. À utiliser avant toute édition d'un .proto."
type: Agent Skill
title: Proto Contract Evolution
tags: [grpc, protobuf, buf, stop-rule]
status: stable
paths:
  - proto-registry/buf.yaml
  - proto-registry/buf.gen.yaml
  - "proto-registry/.github/workflows/**"
  - "proto-registry/proto/**"
mesh_keys:
  - analyze_grpc
  - proto-registry
  - .proto
  - contracts
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:22:12Z"
sources:
  - id: buf
    resource: proto-registry/buf.yaml
    title: "buf.yaml (lint STANDARD, pas de section breaking)"
  - id: bufgen
    resource: proto-registry/buf.gen.yaml
    title: buf.gen.yaml (ts_proto)
  - id: proto-ci
    resource: proto-registry/.github/workflows
    title: sync-to-npm.yml et emergency-reset.yml
  - id: proto-sync
    resource: ci-tools/.github/workflows/proto-sync.yml
    title: proto-sync.yml réutilisable (ci-tools)
  - id: contrats
    resource: docs/stockage-fichiers/08-contrats-et-evolutions.md
    title: "Contrats et évolutions (numérotation, trou du champ 5)"
verified:
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T15:00:01Z"
    digest: d70b224dffd86cbe
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T15:02:04Z"
    digest: 61b6a8d10a0104d0
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T15:05:28Z"
    digest: f305ac39a0987635
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T15:21:22Z"
    digest: f305ac39a0987635
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-06T15:34:14Z"
    digest: fdc49f89e9cb9d16
---

# Proto Contract Evolution & Cycle de Propagation gRPC

Dans Volontariapp, `proto-registry` est l'unique **Source de Vérité (SSOT)** de tous les contrats de communication inter-services synchrones (gRPC).

---

## 1. Avant de modifier un fichier `.proto`

1. **Identifier les consommateurs gRPC en mémoire (MCP Server) :**
   Ne fais pas de recherche plein texte manuelle. Utilise directement l'outil MCP `analyze_grpc` pour localiser en $< 1\text{ms}$ le contrat, les clients dans l'API Gateway et les contrôleurs dans les microservices :
   ```json
   analyze_grpc({ "target": "SignUp" })
   analyze_grpc({ "target": "UserService" })
   ```
2. **Vérification de non-régression de compatibilité binaire :**
   Exécute toujours `buf lint` et `buf breaking` par rapport au dernier commit de `main` :
   ```bash
   buf lint
   buf breaking --against '.git#branch=main'
   ```

---

## 2. Le Cycle de Propagation Automatique (proto-registry -> npm-packages)

```mermaid
flowchart TD
    A["1. Modification dans proto-registry (.proto)"] --> B["2. Validation locale (buf lint)"]
    B --> C["3. Merge sur main dans proto-registry"]
    C --> D["4. CI : sync-to-npm.yml appelle proto-sync.yml de ci-tools"]
    D --> E["5. Génération auto de PR dans npm-packages\n(@volontariapp/contracts & contracts-nest)"]
    E --> F["6. Publication de la version par la CI de npm-packages"]
    F --> G["7. Reprise : yarn up dans api-gateway & microservices"]
```

> [!CAUTION]
> ### 🛑 RÈGLE BLOQUANTE DU STOP IMMÉDIAT SUR PROTO-REGISTRY
> - Dès que tu as fini de modifier un fichier `.proto` dans `proto-registry` : **TU T'ARRÊTES**.
> - **INTERDICTION FORMELLE** d'aller toucher au code de `api-gateway` ou des microservices `ms-*` en avance.
> - **Pourquoi ?** Parce que le code TypeScript n'est PAS compilé localement : il est généré automatiquement par la CI de `proto-registry` qui crée une Pull Request dans `npm-packages` !
> - **Ce n'est qu'APRÈS** le merge de `proto-registry` sur `main`, la génération de la PR dans `npm-packages`, et la publication effective du nouveau `@volontariapp/contracts` par la CI que tu as le droit de mettre à jour les microservices consommateurs via `yarn up`.

---

## 3. Gestion des Changements Compatibles vs Cassants

- **Changements additifs (Rétrocompatibles) :**
  - Ajout d'un nouveau champ optionnel avec un nouveau tag protobuf (ex: `string bio = 5;`).
  - Ajout d'une nouvelle méthode `rpc`.
  - Ces changements peuvent être déployés sans risque de rupture d'exécution.
- **Changements cassants (Breaking Changes) :**
  - Renommage ou suppression d'un champ existant.
  - Changement de numéro de tag d'un champ.
  - Changement de type d'un champ (ex: `int32` -> `string`).
  - **Ordre de déploiement obligatoire :** Les consommateurs (API Gateway, MS) doivent d'abord cesser de lire/écrire le champ avant que celui-ci ne soit définitivement retiré de `proto-registry`.

---

## 4. Règles d'Or

- [ ] **Ne JAMAIS renuméroter un tag existant** sous prétexte de "nettoyer" la numérotation des champs protobuf (cela corrompt la désérialisation binaire wire gRPC).
- [ ] **Toujours vérifier `buf breaking`** avant de soumettre une modification de schéma.
- [ ] **Respecter la cascade :** `proto-registry` $\rightarrow$ PR dans `npm-packages` $\rightarrow$ publication NPM $\rightarrow$ microservices consommateurs.

## 5. Faits vérifiés dans le code (2026-10-06)

| Sujet | Réalité |
| :--- | :--- |
| CI de `proto-registry` | `sync-to-npm.yml` délègue à `proto-sync.yml` de `ci-tools`[^proto-sync] : sur PR, **`buf lint` uniquement** ; sur `main`, lint puis `buf generate` et PR « chore: sync proto typings » dans `npm-packages` (`contracts` et `contracts-nest`). **`buf breaking` n'est lancé nulle part en CI** : c'est à toi de le lancer avant de rendre la main. `emergency-reset.yml` régénère tout en cas de désynchronisation[^proto-ci]. |
| `buf breaking` local | `buf.yaml` n'a pas de section `breaking` : catégorie par défaut `FILE`[^buf]. Elle ne détecte pas la réutilisation d'un numéro de champ supprimé sans `reserved`. |
| Lint | `STANDARD` sauf `PACKAGE_VERSION_SUFFIX`, `FILE_LOWER_SNAKE_CASE`, `RPC_REQUEST_STANDARD_NAME`, `RPC_RESPONSE_STANDARD_NAME`[^buf]. Les enums suivent `STANDARD` : préfixe du type et valeur `_UNSPECIFIED = 0`. |
| Génération | `ts_proto` vers `gen/ts`, options `nestJs=true`, `outputClientImpl=false`, `useDate=false`, `addMetadata=true`, `importSuffix=.js`[^bufgen]. Ne jamais éditer `contracts/src` ni `contracts-nest/src` (sauf `grpc.helpers.ts`). |
| Structure | Domaines `common`, `user`, `event`, `post`, `social`, `storage`. Un domaine = 5 fichiers : `<d>.proto` (entité), `.command.proto`, `.query.proto`, `.responses.proto`, `.services.proto`. Exception : `post/comment*.proto` sans `comment.services.proto`, RPC exposés par `post.services.proto`. Un nouveau champ va dans le fichier du bon type. |
| Dette connue | Aucun `reserved` dans le registre ; `CreateEventCommand` a un trou au champ 5 (ancien `location`) à réserver[^contrats]. |

### Checklist avant de rendre la main

```bash
cd proto-registry
buf lint
buf breaking --against '.git#branch=main'
```

Puis `analyze_grpc({ "target": "<Service ou Method>", "base": "main" })` : liste handlers et clients, et ajoute la vérification wire-format avec les enums (renumérotation, suppression sans `reserved`).

- Ajout de champ : numéro **explicite**, au-dessus du maximum actuel du message, jamais un numéro libéré.
- Suppression : `reserved <n>;` et `reserved "<nom>";` dans le même commit.
- Nouvel enum : préfixé, `<TYPE>_UNSPECIFIED = 0`.

[^proto-sync]: proto-sync.yml réutilisable (ci-tools)
[^proto-ci]: sync-to-npm.yml et emergency-reset.yml
[^buf]: buf.yaml (lint STANDARD, pas de section breaking)
[^bufgen]: buf.gen.yaml (ts_proto)
[^contrats]: Contrats et évolutions (numérotation, trou du champ 5)
