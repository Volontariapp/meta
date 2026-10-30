---
name: volontariapp-scaffold-microservice
description: "Playbook opérationnel pas-à-pas pour créer et raccorder un nouveau domaine/microservice de bout en bout (proto, domain package, ms-*, outbox, worker, post-processor, gateway, deploy, ci-tools)."
type: Playbook
title: "Scaffolding d'un Nouveau Microservice gRPC et de ses Runners"
tags: [scaffolding, microservice, grpc, nestjs, ddd, runners, playbook]
status: stable
paths:
  - "proto-registry/proto/**"
  - "npm-packages/packages/**"
  - "ms-*/src/**"
  - "outbox-runners/**"
  - "workers-runners/**"
  - "post-processors-runner/**"
  - "api-gateway/src/**"
  - "deploy/**"
  - "ci-tools/**"
mesh_keys:
  - scaffold-microservice
  - new-microservice
  - create-service
generated:
  by: claude-code/agent
  at: "2026-10-12T12:18:00Z"
verified:
  - by: claude-code/agent
    at: "2026-10-28T23:06:19Z"
    digest: 8f0d662a1e845ef0
  - by: claude-code/agent
    at: "2026-10-28T23:37:27Z"
    digest: 9d5e40436f38ccc1
  - by: claude-code/agent
    at: "2026-10-29T12:13:53Z"
    digest: bc59914b493b3457
  - by: claude-code/agent
    at: "2026-10-29T12:15:55Z"
    digest: 7deffcd624e148da
  - by: claude-code/agent
    at: "2026-10-29T15:10:19Z"
    digest: 4f4b25b681e4385c
sources:
  - id: doc-creation
    kind: local_file
    resource: docs/matching/07-creation-du-microservice.md
    title: Inventaire exhaustif de création de microservice
  - id: agent-md
    kind: local_file
    resource: AGENT.md
    title: "AGENT.md (structure de microservice et règles d'or)"
  - id: outbox-script
    kind: local_file
    resource: outbox-runners/scripts/create-outbox.sh
    title: create-outbox.sh
  - id: compose
    kind: local_file
    resource: ci-tools/docker-compose.yml
    title: ci-tools/docker-compose.yml
  - id: sync-mig
    kind: local_file
    resource: scripts/cli/commands/sync-migrations.mjs
    title: sync-migrations.mjs
---

# Scaffolding d'un Nouveau Microservice gRPC et de ses Runners

## Quand utiliser ce playbook

Utiliser ce playbook lorsqu'un nouveau bounded context métier nécessite la création d'un microservice dédié et de son écosystème satellite complet :
- Nouveau domaine métier isolé (ex. `ms-affinity`, `ms-billing`, etc.).
- Écosystème asynchrone associé : runner Outbox, worker BullMQ, post-processors Redis Streams.
- Raccordement Edge : exposition des routes REST dans `api-gateway`.
- Déploiement et infrastructure : base PostgreSQL dédiée, manifests Kubernetes K3s/ArgoCD, NetworkPolicies, et configuration locale `docker-compose`.

---

## Règles d'or d'architecture

1. **Respect absolu des deux STOPs bloquants** :
   - **Premier STOP** : `proto-registry` (attente PR automatique dans `npm-packages` générée par la CI).
   - **Second STOP** : `npm-packages` (attente release NPM publiée par la CI).
   - **INTERDICTION FORMELLE** d'implémenter les microservices ou passerelles consommateurs en avance avec du casting fictif (`as unknown as Type` ou `any`).
2. **Clean Architecture & DDD strict** :
   - Le microservice `ms-*` est une coquille d'infrastructure mince. Toute la logique métier réside dans `@volontariapp/domain-<nom>`[^agent-md].
3. **Isolation des données** :
   - Chaque microservice dispose de sa base PostgreSQL dédiée. Aucune requête SQL inter-bases n'est permise.
4. **Sécurité et moindre privilège dès le premier commit** :
   - Manifests Kubernetes durcis **PSA Restricted**, NetworkPolicies **default-deny**, secrets scellés asymétriquement via `kubeseal` (aucun secret en clair dans Git).

---

## Procédure pas-à-pas

### Étape 1 : Contrats Protobuf dans `proto-registry` (🛑 PREMIER STOP)

Dans le dépôt `proto-registry`[^doc-creation] :
1. Créer le dossier `proto/volontariapp/<domaine>/` avec les 5 fichiers conventionnels :
   - `<domaine>.proto` : Modèles d'entités du domaine.
   - `<domaine>.command.proto` : Messages des commandes RPC d'écriture.
   - `<domaine>.query.proto` : Messages des requêtes RPC de lecture.
   - `<domaine>.responses.proto` : Messages de réponse RPC.
   - `<domaine>.services.proto` : Définition des services gRPC (`<Domaine>CommandService` et `<Domaine>QueryService`).
2. Vérifier la conformité du contrat :
   ```bash
   cd proto-registry
   buf lint
   buf breaking --against '.git#branch=main'
   ```
3. **🛑 STOP IMMÉDIAT** : Ouvrir la Pull Request sur `proto-registry`. Attendre le merge sur `main`. La CI déclenche la génération automatique de la PR dans `npm-packages` (`contracts` et `contracts-nest`).

---

### Étape 2 : Domaine et Messagerie dans `npm-packages` (🛑 SECOND STOP)

Une fois la PR Protobuf générée dans `npm-packages`[^doc-creation] :
1. **Création du package de domaine** `packages/domain-<domaine>/` (prendre modèle sur `domain-social`) :
   - Entités du domaine (`*Entity`), modèles TypeORM, interfaces de repository.
   - Services de logique métier pure.
   - Migrations de test sous `src/test/migrations/{common,domain}/`.
2. **Définition des flux asynchrones dans `packages/messaging/`** :
   - Déclarer les payloads et queues sous `src/jobs/<domaine>/`.
   - Enregistrer les types dans `JobRegistry` et `JobMessagingType`.
   - Déclarer les noms de streams dans `packages/shared/src/enums/streams.enum.ts`.
   - Configurer le mapping WebSocket dans `packages/messaging/src/websockets/events/mapping.ts` (`JOB_TO_EVENT_MAPPING` et `EVENT_EVENT_TO_WS_EVENT_MAPPING`).
3. **Validation et Versionnage** :
   ```bash
   yarn build && yarn test
   yarn changeset add
   yarn changeset version
   ```
4. **🛑 STOP IMMÉDIAT** : Passer la main au Lead Dev pour pousser sur PR et attendre la publication NPM par la CI (`@volontariapp/domain-<domaine>`, `@volontariapp/messaging`, etc.).

---

### Étape 3 : Scaffolding du microservice `ms-<domaine>`

1. Créer le dépôt `ms-<domaine>` (prendre modèle sur `ms-social` ou `ms-user`)[^doc-creation] :
   - Initialiser les dépendances via `yarn up` sur les nouveaux paquets publiés.
   - Copier `ci-tools/templates/dependabot/service.yml` dans `.github/dependabot.yml` (retirer le bloc `docker` sans Dockerfile). Le job `security` (Trivy) est déjà fourni par `service-ci.yml`, rien à ajouter dans le `ci.yml`.
2. **Bootstrap et Observabilité** :
   - `src/main.ts` : Démarrage hybride (serveur gRPC sur port 3000 + serveur HTTP Express pour la sonde `/health`).
   - `src/tracing.ts` : Initialisation du SDK OpenTelemetry (Datadog OTLP) avant l'instanciation de NestJS.
   - `src/app.module.ts` : Enregistrement de `AppConfigModule`, `DatabaseModule`, `HealthModule`, `GrpcValidationPipe` et `GrpcInternalGuard` global[^agent-md].
3. **Configuration & Data Source TypeORM** :
   - `src/config/data-source.ts` : Déclaration de `AppDataSource` référençant les entités du domaine et le glob des migrations.
   - `src/migrations/common/` : Récupérer les migrations partagées via `yarn meta sync-migrations`[^sync-mig].
   - `src/migrations/domain/` : Déposer la migration initiale de schéma métier.
4. **Contrôleurs CQRS** :
   - Contrôleurs séparés pour les commandes (`BaseCommandController` avec `withFallback`) et les requêtes de lecture.
   - Mappers stricts sans conversion magique.
5. **Matrice de tests e2e** :
   - Créer `e2e-matrix.json` dans `ms-<domaine>` et ajouter le nouveau service aux fichiers `e2e-matrix.json` des services communicants et de l'API Gateway.

---

### Étape 4 : Démon Outbox (`outbox-runners/`)

1. Utiliser le script de génération officiel[^outbox-script] :
   ```bash
   cd outbox-runners
   ./scripts/create-outbox.sh
   # Indiquer le nom du domaine (ex. 'affinity')
   ```
2. Le script génère `outbox-<domaine>/` surveillant les tables `jobs_outbox` et `event_queue` de la base du microservice.
3. Vérifier les targets Redis Streams et BullMQ dans la configuration.

---

### Étape 5 : Flotte de Workers BullMQ (`workers-runners/`)

1. Créer le répertoire `workers-runners/worker-<domaine>/` (prendre modèle sur `worker-social`)[^doc-creation].
2. Implémenter deux classes étanches dérivées de `BaseWorker` :
   - `<domaine>.worker.ts` pour la file nominale.
   - `fallback-<domaine>.worker.ts` pour la file de fallback dégradée.
3. Développer les handlers de jobs implémentant l'interface `IJobHandler`.
4. Injecter les certificats/clés de signature interne sous `certs/` pour permettre au worker d'appeler d'autres microservices via gRPC en tant que système.

---

### Étape 6 : Consommateurs Post-Processors (`post-processors-runner/`)

1. Créer `post-processors-runner/post-processor-<domaine>/` (modèle `post-processor-social`)[^doc-creation].
2. Déclarer les post-processors métier avec groupes de consommateurs dédiés (`options/*.options.ts`).
3. **Composants critiques obligatoires** :
   - Enregistrer impérativement `JobOutboxSuccessPostProcessor` et `JobOutboxFailedPostProcessor` dans `post-processors.module.ts`. Sans eux, les lignes `jobs_outbox` ne sont jamais purgées et les notifications WebSocket ne sont jamais diffusées.

---

### Étape 7 : Raccordement API Gateway Edge (`api-gateway/`)

Dans le dépôt `api-gateway` :
1. Créer le module `src/modules/<domaine>/`.
2. Implémenter le contrôleur REST `@GatewayController('<domaine>')` :
   - DTO Swagger complets avec décorateurs `class-validator`, qui `implements` les types `<X>Request` de `@volontariapp/contracts` (`npm-packages/packages/contracts/src/gateway/<domaine>/{request,response}`, partagés avec nativapp). Les créer d'abord dans npm-packages (règle du STOP) s'ils n'existent pas.
   - Propagation de la métadonnée interne d'autorisation : `req['internalMetadata']`.
   - Gestion des codes de retour (HTTP 200 standard, HTTP 206 `FALLBACK_ACTIVATED` en cas de mode dégradé).
3. Déclarer le client gRPC et le token d'injection correspondant dans `src/grpc/`.

---

### Étape 8 : Déploiement GitOps Kubernetes (`deploy/`)

Dans le dépôt `deploy` :
1. **Manifests de base** sous `deploy/apps/base/ms-<domaine>/` :
   - `deployment.yaml` (microservice principal).
   - `deployment-outbox.yaml` (démon outbox connecté au `redis-master`).
   - `deployment-worker.yaml` (worker BullMQ).
   - `deployment-post-processor.yaml` (consommateurs Redis Streams).
   - `service.yaml` (exposition gRPC port 3000).
   - `kustomization.yaml` (durcissement PSA Restricted : `readOnlyRootFilesystem: true`, `runAsNonRoot: true`, `drop: [ALL]`).
2. **Base de données PostgreSQL** :
   - Déclarer l'instance sous `deploy/infrastructure/databases/ms-<domaine>/`.
3. **Secrets scellés** :
   - Sceller les identifiants de base et les clés privées via `kubeseal` (playbook `volontariapp-sealed-secrets`).
4. **NetworkPolicies (Default-Deny)** :
   - Autoriser l'ingress depuis `api-gateway` sur le port 3000.
   - Autoriser l'egress des pods uniquement vers PostgreSQL et Redis.
   - Bloquer tout le reste par défaut.
5. **Application ArgoCD** :
   - Déclarer l'application sous `deploy/infrastructure/argocd/`.

---

### Étape 9 : Outillage Local & Synchronisation CI (`ci-tools/`)

1. **Docker Compose Local** :
   - Ajouter l'instance PostgreSQL (`postgres-<domaine>`) sur un port dédié (ex. 5437 pour storage, 5438 pour ranking) dans `ci-tools/docker-compose.yml`[^compose]. Le service `ms-<domaine>-migration` ne s'ajoute qu'une fois l'image GHCR publiée (l'E2E tire toutes les images du profil `migrations`).
   - Déclarer le conteneur de migration `<domaine>-migration`.
2. **Script de synchronisation** :
   - Déclarer le nouveau microservice dans `repos.json` (`repos` et `units`, avec `migrations: true`, `certs: true`) : les commandes `sync-migrations`, `migrate`, `certs`, `start` le lisent[^sync-mig].
3. **Gouvernance et Hooks** :
   - Référencer le service dans [AGENT.md](file:///Users/victoragahi/Developer/meta/AGENT.md) et [AGENTS.md](file:///Users/victoragahi/Developer/meta/AGENTS.md).
   - Déclarer le nouveau chemin dans [.agents/mesh-mcp.toml](file:///Users/victoragahi/Developer/meta/.agents/mesh-mcp.toml).
   - Exécuter `./scripts/install-skill-hooks.sh` pour armer les hooks pre-commit sur le nouveau dépôt.

---

### Étape 10 : Intégration Client Mobile (`nativapp/`)

Dans `nativapp` :
1. Développer le hook TanStack Query `use<Domaine>` (discrimination du code `FALLBACK_ACTIVATED` en cas de 206).
2. Brancher le listener WebSocket dans `src/hooks/useNotificationHandlers.ts` pour invalider le cache dès réception de la notification de complétion du job.

---

## Checklist de validation finale

- [ ] Les 5 fichiers `.proto` sont créés et validés par `buf lint` et `buf breaking` (Premier STOP validé).
- [ ] Le package `@volontariapp/domain-<domaine>` et les contrats de messagerie sont publiés sur NPM (Second STOP validé).
- [ ] Le microservice `ms-<domaine>` démarre en mode hybride (gRPC 3000 + `/health`) et applique ses migrations sans erreur.
- [ ] L'Outbox runner est généré via `create-outbox.sh`[^outbox-script] et connecté à Redis.
- [ ] Les workers implémentent les deux files (nominale et fallback dégradé).
- [ ] `JobOutboxSuccessPostProcessor` et `JobOutboxFailedPostProcessor` sont déclarés dans le post-processor[^doc-creation].
- [ ] L'API Gateway expose la route avec `@GatewayController` et propage `req['internalMetadata']`.
- [ ] Les manifests K8s respectent PSA Restricted et les NetworkPolicies bloquent tout trafic non explicitement autorisé.
- [ ] La base locale est déclarée dans `ci-tools/docker-compose.yml`[^compose] et déclarée dans `repos.json` (`yarn meta manifest` valide la cohérence avec `.gitignore`)[^sync-mig].
- [ ] Les hooks pre-commit sont installés via `./scripts/install-skill-hooks.sh`.

---

## Références

[^doc-creation]: docs/matching/07-creation-du-microservice.md
[^agent-md]: AGENT.md
[^outbox-script]: outbox-runners/scripts/create-outbox.sh
[^compose]: ci-tools/docker-compose.yml
[^sync-mig]: scripts/cli/commands/sync-migrations.mjs
