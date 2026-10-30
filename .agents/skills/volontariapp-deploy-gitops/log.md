# Historique

## 2026-10-28

- **Leçon** - Import JSON de dashboard Datadog : erreurs rencontrees (pitfall) (claude-code/agent)
- **Leçon** - Monitoring : tout dans un dashboard Datadog, pas d'outil externe (rule) (claude-code/agent)
- **Vérification** - request-flow.json: section asynchrone native (spans Consumer/Producer), aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - request-flow.json: trois Service Maps async ajoutees, aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - request-flow.json: Service Map centree sur api-gateway, aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - request-flow.json: coordonnees free-layout remises a l'echelle, aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - request-flow.json sans widget list_stream, README ajuste: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - request-flow.json: schema list_stream corrige, aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - request-flow.json: champ service vide requis par topology_map, aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - request-flow.json aplati sans widget group: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - request-flow.json passe en layout free: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - monitoring: ajout du dashboard request-flow.json, dossier dashboards decrit dans cluster-specifications (claude-code/agent)

## 2026-10-21

- **Vérification** - update ranking-sealed-secret for prod ms-ranking (claude-code/agent)

## 2026-10-20

- **Vérification** - Commit deploy@47e4a73 vérifié (claude-code/agent)
- **Vérification** - Ajout de MS_POST_URL et ouverture ingress ms-post pour worker-ranking (claude-code/agent)

## 2026-10-19

- **Vérification** - Relu le commit cc6b759 (secrets scelles ms-ranking, deja commites a la main apres le wizard) et l'ajout de MS_RANKING_URL dans apps/base/api-gateway/deployment.yaml (81a2615) : conformes aux lecons deja consignees (claude-code/agent)
- **Vérification** - Relu les secrets scelles ms-ranking produits par le wizard (ranking-sealed-secret.yaml, ms-ranking-password dans shared-infra/db-sealed-secret.yaml, ressource ajoutee a la kustomization de l'overlay) : conformes a la lecon deja consignee, aucun changement de skill (claude-code/agent)
- **Vérification** - Relu apres le ticket 1.4 (manifests ms-ranking dans la PR deploy #25, wizard de scellement, bumps de sous-modules) ; lecons ajoutees pour deploy-gitops et sealed-secrets (claude-code/agent)
- **Leçon** - Checklist d'un nouveau service dans deploy : NetworkPolicies, runners, prod-policies.yaml inutilisé (pitfall) (claude-code/agent)

## 2026-10-16

- **Leçon** - Nouvel appel gRPC inter-services: variable d'URL et deux NetworkPolicies, sinon ECONNREFUSED sur localhost (pitfall) (claude-code/agent)
- **Vérification** - ms-post: MS_STORAGE_URL et policies ms-post vers ms-storage; lecon ajoutee (claude-code/agent)
- **Vérification** - ConfigMap partage storage-public-config (deploy#22): lecon ajoutee (claude-code/agent)
- **Leçon** - Config partagee entre services: un ConfigMap possede par une seule Application ArgoCD (rule) (claude-code/agent)
- **Vérification** - ConfigMap partage storage-public-config (deploy#22): motif ajoute, ordre de sync et --enable-helm consignes (claude-code/agent)
- **Leçon** - Chaque ms-* doit definir MS_<SERVICE>_URL=0.0.0.0:3000 et la StorageClass local-path detruit les volumes (pitfall) (claude-code/sonnet-5-5)

## 2026-10-14

- **Vérification** - Verify deploy manifests for runners (claude-code/agent)

## 2026-10-13

- **Vérification** - Variables OTEL et memoire des runners dans deploy: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - DD_ENV ajoute aux deployments: aucune regle de la skill ne change (claude-code/agent)

## 2026-10-12

- **Vérification** - Nettoyage typographique ArgoCD (claude-code/agent)
- **Vérification** - Refactoring en playbook opérationnel et extraction cluster-specifications (claude-code/agent)
- **Vérification** - Workers: conteneur principal passe a 96Mi request / 192Mi limit (usage mesure ~91Mi, 96 % de l'ancien limit) (claude-code/agent)

## 2026-10-07

- **Vérification** - Vérification des bumps de tags d'images ms-social et post-processor-user suite aux releases (claude-code/agent)
- **Vérification** - Commit et push du déploiement 9a5faf9 avec variables et volumes gRPC (claude-code/agent)
- **Vérification** - Image tag 9a5faf9, volume certs et env vars gRPC pour post-processor-user (human:victoragahi)
- **Vérification** - Ajout des variables d'environnement gRPC et montage du secret auth-certs pour pp-user (claude-code/agent)
- **Vérification** - Montage auth-certs et configuration MS_SOCIAL_URL pour post-processor-user (claude-code/agent)
- **Vérification** - Add learnings about outbox redis-master host, getEventStreamName prefix, and gather completion streams (claude-code/agent)
- **Leçon** - Connexion Redis des Outbox Runners : toujours redis-master (pitfall) (claude-code/agent)
- **Vérification** - Bumps images prod (post-processors, ms, ws-service) (claude-code/agent)
- **Vérification** - Relu : les commits deploy recents sont des bumps automatiques de sha d'image et de sous-module (deployment.yaml), conformes a la regle images epinglees par sha, aucune regle modifiee (claude-code/agent)

## 2026-10-06

- **Vérification** - création depuis les CLAUDE.md des repos, vérifiée contre le code (2026-10-06) (claude-code/claude-opus-5-5)
- **Création** - squelette OKF généré par evolve.py new (claude-code/claude-opus-5-5)
- **Leçon** - Création de la skill (decision) (claude-code/claude-opus-5-5)
