---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-ci-tools, du plus récent au plus ancien."
tags: [lessons, volontariapp-ci-tools]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T09:12:34Z"
sources:
  - id: src-471bbb9a
    resource: ci-tools/.github/workflows/service-docker-build-push.yml
    title: ci-tools/.github/workflows/service-docker-build-push.yml
  - id: src-cbb46bc1
    resource: ci-tools/.github/workflows/e2e-orchestrator.yml
    title: ci-tools/.github/workflows/e2e-orchestrator.yml
<<<<<<< Updated upstream
=======
  - id: src-71dc1dab
    resource: ci-tools/.github/workflows/sync-all.yml
    title: ci-tools/.github/workflows/sync-all.yml
>>>>>>> Stashed changes
  - id: src-5601ca7f
    resource: ci-tools/docker-compose.yml
    title: ci-tools/docker-compose.yml
---

# Leçons

<<<<<<< Updated upstream
## 2026-11-03 - Runners async dans l'E2E et creation manuelle de noeuds

- **Type :** rule
- **Leçon :** Avec outbox-user et post-processor-social dans le profil e2e (ci-tools#66), un test ne doit plus creer a la main le noeud social d'un user inscrit via POST /users : la creation manuelle fait la course avec le post-processor et renvoie 409 quand il gagne. Utiliser waitForSocialUserNode (api-gateway e2e/helpers/social-node.helper.ts). Les runners exigent un /health (outbox-runners#41) et ne vont que dans le profil e2e, jamais dans le profil par defaut.[^src-5601ca7f]
- **Consigné par :** claude-code/agent

## 2026-11-03 - Projet compose local partage avec le dev

- **Type :** pitfall
- **Leçon :** Sans -p, docker compose -f ci-tools/docker-compose.yml prend le projet ci-tools : celui des volumes de dev locaux (ci-tools_postgres_*_data). Un replay local de l'E2E y applique les migrations des images latest et un down -v effacerait les donnees de dev. Rejouer l'E2E avec COMPOSE_PROJECT_NAME=volontariapp-e2e-local. Sur Mac arm64 les images GHCR n'existent qu'en amd64 : docker pull --platform linux/amd64, sans DOCKER_DEFAULT_PLATFORM au up (il refuse les images construites localement en arm64).[^src-5601ca7f]
- **Consigné par :** claude-code/agent

## 2026-11-03 - E2E compose lu depuis le sous-module de l'appelant

- **Type :** pitfall
- **Leçon :** e2e-orchestrator.yml vient de ci-tools@main, mais il lance docker compose -f ci-tools/docker-compose.yml depuis le sous-module ci-tools du repo appelant (checkout submodules: recursive). Un changement du compose n'atteint un repo qu'au bump de son pointeur (sync-all). Pour tester un compose non merge dans la CI d'une PR, pointer le sous-module de la PR sur le commit de la branche ci-tools, puis le re-pointer sur main apres merge (api-gateway#91).[^src-cbb46bc1]
=======
## 2026-11-04 - pg_isready par TCP avec un healthcheck rapide

- **Type :** pitfall
- **Leçon :** Avec start_interval 1s, pg_isready sans -h (socket unix) repond pret pendant l'init de l'image postgres (serveur temporaire socket-only, puis redemarrage) : les migrations partent trop tot et echouent en ECONNREFUSED, ce qui a casse l'E2E des 7 repos (ci-tools#68, corrige par #70). Toujours pg_isready -h 127.0.0.1 dans le compose.[^src-5601ca7f]
- **Consigné par :** claude-code/agent

## 2026-11-03 - PR empilee fermee au merge de sa base

- **Type :** pitfall
- **Leçon :** Une PR dont la base est une autre branche de PR est fermee automatiquement quand cette base est mergee avec --delete-branch (ci-tools#67 fermee au merge de #66). Avant de merger la base, rebaser la PR empilee (git rebase --onto origin/main <ancien sha de base>) et changer sa base vers main, ou ouvrir une nouvelle PR (ci-tools#68).[^src-71dc1dab]
>>>>>>> Stashed changes
- **Consigné par :** claude-code/agent

## 2026-11-03 - Label docker-and-e2e requis pour le CI Docker et e2e

- **Type :** pitfall
- **Leçon :** service-docker-build-push.yml et e2e-orchestrator.yml lisent le label docker-and-e2e (payload de la PR puis gh pr view en direct avec ORG_REPO_TOKEN, 10 essais espaces de 30 s). Sans lui, le job docker echoue avec une erreur; les repos declarent e2e avec needs: [ci-docker], donc le job e2e est saute et la PR n'est pas mergeable. Une PR sans le label ne valide donc jamais l'e2e avant merge: ajouter le label des l'ouverture de la PR, sinon les regressions e2e se decouvrent apres coup.[^src-cbb46bc1]
- **Consigné par :** claude-code/agent

## 2026-10-06 - CI d'un service : label docker-and-e2e, et le merge sur main deploie

- **Type :** rule
- **Leçon :** Sur une PR d'un service (ms-*), le job ci-docker / docker echoue avec 'The docker-and-e2e label is missing' tant que le label docker-and-e2e n'est pas pose (garde-fou dans ci-tools/.github/workflows/service-docker-build-push.yml et e2e-orchestrator.yml) : poser le label lance le build et le push de l'image sur GHCR puis les e2e (docker compose --profile e2e). Les depots de services n'ont pas de protection de branche : l'echec n'empeche pas le merge, et gh pr merge --auto peut merger immediatement. Le merge sur main declenche ci-docker, e2e puis deploy-push, qui met a jour le depot deploy (image epinglee par sha, ArgoCD) : verifier avant merge que deploy porte les variables d'environnement necessaires (par ex. MS_<SERVICE>_URL=0.0.0.0:3000, S3_*, SCANNER_*). Une PR empilee sur une autre branche n'a aucune CI : retargeter vers main apres le merge de la PR de base.[^src-471bbb9a]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : ci-tools/.github/workflows/**, ci-tools/docker-compose.yml, ci-tools/scripts/**.
- **Consigné par :** claude-code/claude-opus-5-5

[^src-471bbb9a]: ci-tools/.github/workflows/service-docker-build-push.yml
[^src-cbb46bc1]: ci-tools/.github/workflows/e2e-orchestrator.yml
<<<<<<< Updated upstream
=======
[^src-71dc1dab]: ci-tools/.github/workflows/sync-all.yml
>>>>>>> Stashed changes
[^src-5601ca7f]: ci-tools/docker-compose.yml
