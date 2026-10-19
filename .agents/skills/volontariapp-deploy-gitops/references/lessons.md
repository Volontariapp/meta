---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-deploy-gitops, du plus récent au plus ancien."
tags: [lessons, volontariapp-deploy-gitops]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:54:04Z"
sources:
  - id: src-07ce5da2
    resource: deploy/apps/base/ws-service/deployment-outbox.yaml
    title: deploy/apps/base/ws-service/deployment-outbox.yaml
  - id: src-9d62093b
    resource: deploy/apps/base/ms-storage/deployment.yaml
    title: deploy/apps/base/ms-storage/deployment.yaml
  - id: src-18c87cb4
    resource: "https://github.com/Volontariapp/deploy/pull/22"
    title: "https://github.com/Volontariapp/deploy/pull/22"
  - id: src-44389df8
    resource: deploy/apps/base/ms-user/deployment.yaml
    title: deploy/apps/base/ms-user/deployment.yaml
  - id: src-86e8c1ef
    resource: deploy/apps/overlays/prod/shared-infra/kustomization.yaml
    title: deploy/apps/overlays/prod/shared-infra/kustomization.yaml
---

# Leçons

## 2026-10-19 - Checklist d'un nouveau service dans deploy : NetworkPolicies, runners, prod-policies.yaml inutilisé

- **Type :** pitfall
- **Leçon :** Pour un nouveau domaine, ajouter dans deploy : apps/base/<ms>/ (deployment, 3 runners, service), l'overlay prod avec la base bitnami, l'Application ArgoCD (infrastructure/argocd/apps/prod), les NetworkPolicies dans infrastructure/security/network-policies/overlays/prod/<ms>.yaml (policies distinctes plutôt que de modifier celles des autres services) et les listes de global-policies, runners-policies et de l'egress api-gateway. Le fichier racine prod-policies.yaml n'est référencé par aucune kustomization ni Application : ne pas le mettre à jour. Si un worker appelle un autre ms (ex. worker-ranking vers ms-post), il faut MS_<X>_URL et une NetworkPolicy ingress sur le ms cible. L'api-gateway a besoin de MS_<SERVICE>_URL, sinon elle retombe sur localhost. Les images des runners sont épinglées par sha de sous-module, à vérifier sur GHCR. Un worktree sur deploy ne résout pas toujours les sous-modules (non bloquant pour kustomize build --enable-helm).[^src-86e8c1ef]
- **Consigné par :** claude-code/agent

## 2026-10-16 - Nouvel appel gRPC inter-services: variable d'URL et deux NetworkPolicies, sinon ECONNREFUSED sur localhost

- **Type :** pitfall
- **Leçon :** Quand un service en appelle un autre en gRPC, il faut dans deploy (1) la variable d'URL du client dans le deployment du service appelant (ex. MS_STORAGE_URL=ms-storage:80, voir ms-user) et (2) deux NetworkPolicies dediees, egress sur le service appelant et ingress sur le service appele, port 3000 (modeles ms-user-to-ms-storage-policy et ms-storage-from-ms-user-policy dans infrastructure/security/network-policies/overlays/prod/storage-infra-policies.yaml). Sans la variable, la config retombe sur la valeur par defaut de config/default.config.json (localhost:5006) et le client echoue en ECONNREFUSED 127.0.0.1 ou ::1, sans rapport avec le reseau du cluster. Sans les policies, default-deny-all bloque l'appel meme avec la bonne URL. ms-post n'avait ni l'un ni l'autre pour ms-storage : ConfirmFileAttachment echouait, les posts avec image restaient PENDING et ms-post masque les posts PENDING meme a leur auteur. Diagnostic: kubectl -n prod logs du service appelant, kubectl -n prod get networkpolicy, et git grep de la variable dans apps/base. Les policies partagees (ms-post-policy couvre ms-post et post-processor-post) ne se modifient pas pour ca : on ajoute une policy distincte.[^src-44389df8]
- **Consigné par :** claude-code/agent

## 2026-10-16 - Config partagee entre services: un ConfigMap possede par une seule Application ArgoCD

- **Type :** rule
- **Leçon :** Il n'y avait aucun ConfigMap dans deploy avant storage-public-config. Chaque service est une Application ArgoCD distincte (apps/overlays/prod/<svc>), plus shared-infra et storage-infra: une valeur lue par plusieurs services (ex. S3_PUBLIC_BASE_URL pour ms-storage et api-gateway) vit dans un ConfigMap declare dans UNE seule overlay (storage-infra) et les deployments la referencent par configMapKeyRef, jamais en double litteral. Aucune sync wave n'existe dans le repo: le consommateur qui synchronise avant le ConfigMap reste en CreateContainerConfigError puis se corrige, sans coupure si le pod precedent tourne. Utiliser optional: true quand l'absence est tolerable. Valider avec kustomize build --enable-helm: l'overlay ms-storage inclut un chart Helm et echoue sans ce drapeau. Le checkout local de deploy peut etre perime: lire origin/main avec git show ou git grep.[^src-18c87cb4]
- **Consigné par :** claude-code/agent

## 2026-10-16 - Chaque ms-* doit definir MS_<SERVICE>_URL=0.0.0.0:3000 et la StorageClass local-path detruit les volumes

- **Type :** pitfall
- **Leçon :** 1) Le gRPC d'un ms-* ecoute sur la variable MS_<SERVICE>_URL de sa propre config (defaut 0.0.0.0:5006 pour ms-storage) alors que le Service cible le port 3000: sans MS_<SERVICE>_URL=0.0.0.0:3000 dans le deployment les appels de la gateway echouent. Le deployment ms-storage avait MS_USER_URL=0.0.0.0:3000 par copier-coller. Verifier avec kubectl logs: 'gRPC server listening on'. 2) Le cluster K3s est mono-noeud et la StorageClass par defaut local-path a reclaimPolicy Delete: un PVC supprime detruit les donnees. Pour des donnees a conserver (MinIO) utiliser local-path-retain (Retain), et passer en Retain le PV d'un PVC en Terminating avant tout redemarrage. 3) Le certificat wildcard *.cyrus-ag.com (secret volontariapp-wildcard-tls, namespace prod) couvre tout sous-domaine d'un niveau.[^src-9d62093b]
- **Consigné par :** claude-code/sonnet-5-5

## 2026-10-07 - Connexion Redis des Outbox Runners : toujours redis-master

- **Type :** pitfall
- **Leçon :** Tous les runners d'outbox (outbox-*, y compris outbox-ws) doivent impérativement avoir REDIS_HOST pointant sur redis-master, et JAMAIS sur un Redis local de service comme ws-service-redis. Un outbox qui publie sur un Redis local crée un trou noir : les événements sont marqués COMPLETED en base PostgreSQL mais n'atteignent jamais redis-master où écoutent les post-processors des autres microservices.[^src-07ce5da2]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : deploy/apps/**, deploy/infrastructure/**.
- **Consigné par :** claude-code/claude-opus-5-5

[^src-07ce5da2]: deploy/apps/base/ws-service/deployment-outbox.yaml
[^src-9d62093b]: deploy/apps/base/ms-storage/deployment.yaml
[^src-18c87cb4]: https://github.com/Volontariapp/deploy/pull/22
[^src-44389df8]: deploy/apps/base/ms-user/deployment.yaml
[^src-86e8c1ef]: deploy/apps/overlays/prod/shared-infra/kustomization.yaml
