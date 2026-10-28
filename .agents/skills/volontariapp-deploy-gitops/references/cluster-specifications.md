---
type: Concept
title: "Spécifications du Cluster K3s et Architecture GitOps"
description: "Structure des dossiers, topologie Kubernetes, dimensionnement des ressources et points d'attention du dépôt deploy (ArgoCD)."
tags: [deploy, kubernetes, argocd, gitops, k3s, resources]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:54:04Z"
sources:
  - id: c4
    resource: docs/architecture/C4-Deployment-And-Infrastructure.md
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

# Spécifications du Cluster K3s et Architecture GitOps

Le dépôt `deploy` est l'unique source de vérité de l'infrastructure de production du cluster K3s : ArgoCD synchronise continuellement son arborescence avec l'état réel du cluster[^c4].

---

## 1. Structure Réelle du Dépôt `deploy`

| Dossier | Contenu & Rôle |
| :--- | :--- |
| `apps/base/<service>/` | `deployment.yaml` (le service), `deployment-outbox.yaml`, `deployment-worker.yaml`, `deployment-post-processor.yaml`, `service.yaml`, `kustomization.yaml`. Services : `api-gateway`, `ms-user`, `ms-event`, `ms-post`, `ms-social`, `ms-storage`, `ws-service`, `mcp-meta-indexer` |
| `apps/overlays/prod/` | Seul overlay existant (le README parle d'un overlay `dev` qui n'existe pas) ; secrets scellés partagés dans `shared-infra/` |
| `infrastructure/argocd/` | `bootstrap/`, `apps/`, `projects/`, `ingress.yaml` |
| `infrastructure/databases/` | Un dossier par base (`ms-user`, `ms-event`, `ms-post`, `ms-social`, `ws-service`, `neo4j`, `redis`) ; **pas de base `ms-storage`**[^dbs] |
| `infrastructure/security/` | `cert-manager`, `network-policies`, `sealed-secrets`, `resource-quotas`, `traefik` |
| `infrastructure/monitoring/` | Agent Datadog |
| `submodules/` | Code source des services, en lecture seule : mis à jour par la CI de chaque repo |

---

## 2. Dimensionnement & Ports Standards

- **Ports** : gRPC des microservices et HTTP de la gateway sur `3000` ; PostgreSQL `5432` ; Neo4j `7687` ; Redis `6379`.
- **Ressources (Requests & Limits)**[^readme] :
  - **API Gateway & Runners** : Requests 50m / 64Mi, Limits 200m / 128Mi.
  - **Microservices gRPC** : Requests 100m / 128Mi, Limits 500m / 256Mi.
  - **Workers (`deployment-worker.yaml`)** : Request 96Mi, Limit 192Mi (car une limite à 96Mi provoquait ~96 % d'usage et un risque d'OOMKill Node.js).
  - **InitContainers (`busybox`)** : Requests 32Mi, Limits 64Mi.
- **Broker d'Outbox (`REDIS_HOST`)** :
  - Tous les runners d'outbox (`deployment-outbox.yaml`), y compris pour `ws-service`, doivent impérativement pointer vers `redis-master` (broker global du mesh).

---

## 3. Points d'Attention Historiques

- `api-gateway` est déployée avec `NODE_ENV=production`[^gw], ce qui monte le module de génération de tokens de test.
- `mcp-meta-indexer` est toujours déployé alors que le dépôt a été remplacé par `causalmesh` dans `meta`.
- Une base PostgreSQL `ms-storage` sera à instancier avec le flux de stockage (base dédiée, NetworkPolicy, SealedSecret).

[^c4]: C4 Deployment & Infrastructure
[^readme]: deploy/README.md
[^base-user]: Manifest ms-user (initContainer, securityContext, image sha)
[^gw]: Manifest api-gateway (NODE_ENV)
[^dbs]: Bases de données par service
