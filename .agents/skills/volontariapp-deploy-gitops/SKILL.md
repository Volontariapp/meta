---
name: volontariapp-deploy-gitops
description: "Modifier l'infrastructure Kubernetes de Volontariapp dans le repo deploy (GitOps ArgoCD) : manifests d'un service et de ses runners, overlay prod, secrets scellés, network policies, bases de données, sécurité des pods. À utiliser pour tout changement d'infra ; jamais de kubectl apply manuel en production."
type: Agent Skill
title: Déploiement GitOps (deploy)
tags: [deploy, kubernetes, argocd, security]
status: stable
paths:
  - "deploy/apps/**"
  - "deploy/infrastructure/**"
mesh_keys:
  - deploy/
  - argocd
  - sealedsecret
  - kubeseal
  - networkpolic
  - kustomiz
  - initcontainer
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:54:04Z"
verified:
  - by: claude-code/agent
    at: "2026-10-07T14:12:26Z"
    digest: 6119b9dd4cb0cf9e
  - by: claude-code/agent
    at: "2026-10-07T18:08:36Z"
    digest: 8e56366ddf6181dd
  - by: claude-code/agent
    at: "2026-10-07T18:23:25Z"
    digest: 2fa13ce517c1f662
  - by: "human:victoragahi"
    at: "2026-10-07T18:30:37Z"
    digest: 57097d4605d7f4d1
  - by: claude-code/agent
    at: "2026-10-07T18:32:09Z"
    digest: 63f58acd042a28d8
sources:
  - id: c4
    resource: docs/C4-Deployment-And-Infrastructure.md
    title: "C4 Deployment & Infrastructure"
  - id: readme
    resource: deploy/README.md
    title: deploy/README.md
  - id: base-user
    resource: deploy/apps/base/ms-user/deployment.yaml
    title: "Manifest ms-user (initContainer, securityContext, image sha)"
  - id: gw
    resource: deploy/apps/base/api-gateway/deployment.yaml
    title: Manifest api-gateway (NODE_ENV)
  - id: dbs
    resource: deploy/infrastructure/databases
    title: Bases de données par service
---

# Déploiement GitOps (`deploy`)

`deploy` est la source de vérité du cluster K3s : ArgoCD (app-of-apps) synchronise ce que contient `main`. Toute modification passe par une PR sur ce repo ; jamais de `kubectl apply` manuel en production[^c4].

## Structure réelle

| Dossier | Contenu |
| :--- | :--- |
| `apps/base/<service>/` | `deployment.yaml` (le service), `deployment-outbox.yaml`, `deployment-worker.yaml`, `deployment-post-processor.yaml`, `service.yaml`, `kustomization.yaml`. Services : `api-gateway`, `ms-user`, `ms-event`, `ms-post`, `ms-social`, `ms-storage`, `ws-service`, `mcp-meta-indexer` |
| `apps/overlays/prod/` | Seul overlay existant (le README parle d'un overlay `dev` qui n'existe pas) ; secrets scellés partagés dans `shared-infra/` |
| `infrastructure/argocd/` | `bootstrap/`, `apps/`, `projects/`, `ingress.yaml` |
| `infrastructure/databases/` | Un dossier par base (`ms-user`, `ms-event`, `ms-post`, `ms-social`, `ws-service`, `neo4j`, `redis`) ; **pas de base `ms-storage`**[^dbs] |
| `infrastructure/security/` | `cert-manager`, `network-policies`, `sealed-secrets`, `resource-quotas`, `traefik` |
| `infrastructure/monitoring/` | Agent Datadog |
| `submodules/` | Code source des services, en lecture seule : mis à jour par la CI de chaque repo |

## Règles

- **Images épinglées par sha** (`ghcr.io/volontariapp/<service>:sha-<court>`)[^base-user] : la CI de chaque service met à jour sous-module et image par un commit `chore(deploy): update <service> submodule and deployment images`. Ne pas éditer ces lignes à la main sauf rollback volontaire.
- **Pods durcis (PSA Restricted)** : `runAsNonRoot`, système de fichiers racine en lecture seule (`/tmp` en `emptyDir`), pas d'escalade, `seccompProfile: RuntimeDefault`, `capabilities.drop: ["ALL"]`. Tout nouveau conteneur, initContainer compris, reprend ce bloc. Seul `mcp-meta-indexer/deployment.yaml` n'a pas `readOnlyRootFilesystem: true`.
- **Attente des dépendances** : chaque déploiement a un initContainer `busybox:1.28` qui boucle sur `nc -zv <service>-db-postgresql 5432` (ou Neo4j 7687) avant de démarrer[^base-user].
- **Secrets** : uniquement des `SealedSecret` chiffrés avec `kubeseal` et la clé publique du cluster ; jamais de `Secret` en clair ni de valeur sensible dans un `ConfigMap`.
- **Réseau Default-Deny** : un nouveau flux (service vers base, service vers service, sortie Internet) exige une NetworkPolicy explicite par label `app`. Sans elle, la connexion est bloquée même dans le namespace.
- **Ressources** : requests/limits obligatoires (gateway 50m/64Mi à 200m/128Mi, microservice 100m/128Mi à 500m/256Mi, runners comme la gateway)[^readme].
- **Ports** : gRPC des microservices et HTTP de la gateway sur 3000 ; Postgres 5432 ; Neo4j 7687 ; Redis 6379.
- **Redis des Outboxes (`REDIS_HOST`)** : Tous les `deployment-outbox.yaml` (y compris pour `ws-service`) DOIVENT pointer sur `redis-master` (broker global du mesh). Ne jamais configurer un Redis local de service (ex: `ws-service-redis`), sinon les événements dépilés par l'outbox sont publiés dans un trou noir et n'atteignent jamais les post-processors.

## Points d'attention relevés

- `api-gateway` est déployée avec `NODE_ENV=production`[^gw], ce qui monte le module de génération de tokens (voir `volontariapp-api-gateway`, risques connus).
- `mcp-meta-indexer` est toujours déployé alors que le dépôt a été remplacé par `causalmesh` dans `meta`.
- Une base `ms-storage` sera à ajouter avec le flux de stockage (Postgres dédié, NetworkPolicy, SealedSecret).

[^c4]: C4 Deployment & Infrastructure
[^base-user]: Manifest ms-user (initContainer, securityContext, image sha)
[^dbs]: Bases de données par service
[^readme]: deploy/README.md
[^gw]: Manifest api-gateway (NODE_ENV)
