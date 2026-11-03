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
---

# Leçons

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
