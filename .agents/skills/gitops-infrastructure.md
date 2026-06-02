# Volontariapp GitOps Infrastructure Skills

## Architecture GitOps
- Utilisation du pattern **App-of-Apps** avec **ArgoCD** pour la gestion récursive et modulaire.
- **Source of Truth** : Le repository `deploy` est l'unique source de vérité. Toute modification de l'état du cluster se fait via PR.

## Sécurité & Conformité (Zero-Trust)
- **PSA Restricted** : Tous les pods tournent en Non-Root (pas d'uid 0), avec un système de fichiers racine en lecture seule et suppression des capabilities Linux (`drop: ["ALL"]`).
- **Sealed Secrets** : Les secrets ne sont jamais en clair dans le repo Git. Ils sont chiffrés localement avec `kubeseal` (Bitnami) et déchiffrés par le contrôleur Kubernetes.
- **Network Policies** : Default-Deny All. Aucune communication n'est autorisée par défaut. L'ingress et l'egress doivent être explicitement définis par labels.

## Gestion des Certificats et Ingress
- **Ingress Controller** : Traefik.
- **TLS/HTTPS** : Géré par **Cert-Manager** via **DNS-01 Challenge** avec l'API **Cloudflare** et Let's Encrypt.
- Le token Cloudflare doit être stocké via un SealedSecret (`cloudflare-api-token-secret`).

## Base de données
- Approche Wait-For : Utilisation d'un InitContainer `busybox` avec `nc -zv` pour bloquer le démarrage du pod de l'application tant que la base de données (PostgreSQL/Neo4j) n'est pas prête.
- Patch de sécurité via Kustomize (Bash-Wrapper) pour injecter dynamiquement des mots de passe dans des applications comme Neo4j (`NEO4J_AUTH`).
