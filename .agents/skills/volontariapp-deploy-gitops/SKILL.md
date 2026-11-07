---
name: volontariapp-deploy-gitops
description: "Playbook opérationnel pas-à-pas pour faire évoluer l'infrastructure Kubernetes dans le repo deploy (ArgoCD) : création de manifests durcis PSA Restricted, NetworkPolicies default-deny et validation kustomize."
type: Playbook
title: "Déploiement GitOps (Cluster K3s & ArgoCD)"
tags: [deploy, kubernetes, argocd, security, gitops, playbook]
status: stable
paths:
  - "deploy/apps/**"
  - "deploy/infrastructure/**"
mesh_keys:
  - deploy/
  - argocd
  - networkpolic
  - kustomiz
  - initcontainer
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:54:04Z"
verified:
  - by: claude-code/agent
    at: "2026-11-07T15:32:13Z"
    digest: 9bae38756510c312
  - by: claude-code/agent
    at: "2026-11-07T15:34:32Z"
    digest: b48ec88eaae14f12
  - by: claude-code/agent
    at: "2026-11-07T15:49:18Z"
    digest: 588cb1216d7d8ddb
  - by: claude-code/agent
    at: "2026-11-07T15:55:35Z"
    digest: f42f7925a6ae2c42
  - by: claude-code/agent
    at: "2026-11-07T18:48:20Z"
    digest: 874988c93538ded7
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

# Playbook : Déploiement GitOps (Cluster K3s & ArgoCD)

Le dépôt `deploy` est l'unique source de vérité de l'infrastructure du cluster K3s : ArgoCD (pattern app-of-apps) synchronise automatiquement ce que contient la branche `main`[^c4]. 

> [!CAUTION]
> **RÈGLE CRITIQUE : ZÉRO `kubectl apply` MANUEL EN PRODUCTION.**
> Toute modification d'infrastructure, de dimensionnement, de secret ou de réseau passe impérativement par une Pull Request sur le dépôt `deploy`.

La documentation détaillée de la structure du cluster, des bases de données et des ressources est disponible dans [Spécifications Cluster](/volontariapp-deploy-gitops/references/cluster-specifications.md).

---

## Trigger

Ce playbook doit être exécuté dès qu'une tâche nécessite :
- Le déploiement d'un nouveau microservice, runner outbox, worker BullMQ ou post-processor.
- L'ajustement des variables d'environnement, requests/limits ou sondes de liveness/readiness.
- L'ouverture d'un nouveau flux réseau inter-services ou vers une base de données.
- La mise à jour d'un manifest dans `deploy/apps/base/` ou de l'overlay de production `deploy/apps/overlays/prod/`.

---

## Procédure A : Création ou Mise à Jour d'un Manifest (`deployment.yaml`)

Emplacement : `deploy/apps/base/<service>/`.

Chaque conteneur déployé doit se conformer strictement au profil **PSA Restricted** (Pod Security Standards) et intégrer l'attente active de ses dépendances :

### 1. Template de Durcissement PSA Restricted (Obligatoire) :
```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: service
          image: ghcr.io/volontariapp/<service>:sha-<court> # Épinglé par commit sha
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
```

### 2. InitContainer d'Attente de Dépendance (Base de Données / Redis) :
Pour éviter les crash-loops au démarrage du pod, injecter l'initContainer standard bouclant sur la disponibilité réseau de la base[^base-user] :
```yaml
      initContainers:
        - name: wait-for-db
          image: busybox:1.28
          command:
            - sh
            - -c
            - "until nc -zv <service>-db-postgresql 5432; do echo waiting for db; sleep 2; done"
          resources:
            requests:
              cpu: 32m
              memory: 64Mi
            limits:
              cpu: 32m
              memory: 64Mi
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
```

### 3. Règles d'Attribution des Ressources & Réseau :
- **Requests / Limits**[^readme] :
  - Microservices `ms-*` : Requests 100m / 128Mi, Limits 500m / 256Mi.
  - Runners outbox / post-processors : Requests 50m / 64Mi, Limits 200m / 128Mi.
  - Workers Node.js : Request 96Mi, Limit 192Mi (ne jamais fixer 96Mi de limit : risque d'OOMKill avéré).
- **Limits CPU x4 (2026-11-07)** : toutes les `limits.cpu` (apps, runners, bases Postgres, Redis, Neo4j) ont été multipliées par 4 ; les `requests` sont inchangées car le cluster n'a qu'un nœud de 8 CPU (requests à 44 %). Les valeurs ci-dessus pour les limits CPU sont donc à lire x4. Le quota `prod` passe à `limits.cpu: 56` (l'api-gateway à 6 pods en prend 12 à elle seule) et `limits.memory: 28Gi` (à 18Gi, un redémarrage du nœud bloquait la création de `redis-master` : les anciens pods `Unknown` comptent dans le quota, `kubectl describe statefulset` montre alors `exceeded quota`) ; il faut le recalculer à chaque ajout de composant ou de `maxReplicas`. Monter les requests suppose d'abord d'ajouter un nœud worker K3s.
- **Broker d'Outbox (`REDIS_HOST`)** :
  - Tout `deployment-outbox.yaml` doit pointer vers `redis-master` (broker global du mesh). Ne jamais brancher une outbox sur un Redis local isolé.

### 4. Haute disponibilité et autoscaling (modèle : `api-gateway`) :
- Le load balancer est Traefik (Ingress vers le Service ClusterIP, répartition sur les endpoints des pods prêts) : aucun LB à ajouter.
- `deploy/apps/base/api-gateway/` : pas de champ `replicas` dans le Deployment (l'HPA le pilote, sinon ArgoCD se bat avec lui), `hpa.yaml` (min 3, max 6, CPU 70 % seul, scale-down stabilisé 300 s ; pas de métrique mémoire : elle se mesure contre la request et dépasse toujours 80 % sur un pod Node, d'où un scale-up parasite jusqu'au quota), `pdb.yaml` (`minAvailable: 2`), `readinessProbe`, `preStop: sleep 10`, `maxUnavailable: 0` et `topologySpreadConstraints` par nœud.
- Le `ResourceQuota` de `prod` (requests CPU 6, limits CPU 10) plafonne `maxReplicas` : recalculer avant d'augmenter.
- L'HPA exige metrics-server (livré par défaut avec K3s) et des `requests` sur chaque conteneur.

---

## Procédure B : Définition des NetworkPolicies (Réseau Default-Deny)

Le cluster applique une politique de **Default-Deny** : tout trafic ingress/egress non explicitement déclaré est bloqué par défaut, même au sein du même namespace Kubernetes.

Pour ouvrir un flux réseau vers un microservice ou une base :

1. Créer ou éditer la `NetworkPolicy` sous `deploy/infrastructure/security/network-policies/<service>-netpol.yaml` :
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: <service>-network-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: <service>
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Autoriser les appels gRPC entrants depuis l'API Gateway ou un autre service autorisé
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 3000
  egress:
    # Autoriser la connexion vers sa base PostgreSQL dédiée
    - to:
        - podSelector:
            matchLabels:
              app: <service>-db-postgresql
      ports:
        - protocol: TCP
          port: 5432
    # Autoriser la résolution DNS du cluster
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
```

---

## Procédure C : Validation Kustomize & Synchronisation ArgoCD

1. **Déclarer les manifests dans `kustomization.yaml` :**
   - Base locale : vérifier `deploy/apps/base/<service>/kustomization.yaml`.
   - Overlay de production : déclarer le nouveau service ou le secret scellé dans `deploy/apps/overlays/prod/kustomization.yaml`.

2. **Validation Dry-Run locale :**
   Exécuter Kustomize localement pour valider la syntaxe et l'interpolation :
   ```bash
   kubectl kustomize deploy/apps/overlays/prod/ > /dev/null
   ```

3. **Livraison GitOps :**
   - Commiter sur une branche de feature du dépôt `deploy`.
   - Ouvrir la Pull Request. Dès le merge sur `main`, ArgoCD synchronise l'état en moins de 3 minutes.
   - Contrôler le déploiement sur la console ArgoCD : statut Synced et santé Healthy.

---

## Checklist d'Assurance Qualité & Critères d'Arrêt

Avant de valider une modification d'infrastructure :
- [ ] Aucun `Secret` en clair ni mot de passe dans les manifests Git (utiliser exclusivement `SealedSecret`).
- [ ] Profil PSA Restricted intégralement respecté (`readOnlyRootFilesystem: true`, `/tmp` en `emptyDir`).
- [ ] InitContainer `busybox:1.28` configuré pour attendre la disponibilité du port DB.
- [ ] Requests et limits définies pour chaque conteneur.
- [ ] NetworkPolicy déclarée pour tout nouveau flux réseau.
- [ ] `deployment-outbox.yaml` configuré avec `REDIS_HOST: redis-master`.
- [ ] `kubectl kustomize` compile sans aucune erreur de syntaxe.

[^c4]: C4 Deployment & Infrastructure
[^readme]: deploy/README.md
[^base-user]: Manifest ms-user (initContainer, securityContext, image sha)
[^gw]: Manifest api-gateway (NODE_ENV)
[^dbs]: Bases de données par service
