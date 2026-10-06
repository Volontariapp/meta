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
---

# Leçons

## 2026-10-06 - CI d'un service : label docker-and-e2e, et le merge sur main deploie

- **Type :** rule
- **Leçon :** Sur une PR d'un service (ms-*), le job ci-docker / docker echoue avec 'The docker-and-e2e label is missing' tant que le label docker-and-e2e n'est pas pose (garde-fou dans ci-tools/.github/workflows/service-docker-build-push.yml et e2e-orchestrator.yml) : poser le label lance le build et le push de l'image sur GHCR puis les e2e (docker compose --profile e2e). Les depots de services n'ont pas de protection de branche : l'echec n'empeche pas le merge, et gh pr merge --auto peut merger immediatement. Le merge sur main declenche ci-docker, e2e puis deploy-push, qui met a jour le depot deploy (image epinglee par sha, ArgoCD) : verifier avant merge que deploy porte les variables d'environnement necessaires (par ex. MS_<SERVICE>_URL=0.0.0.0:3000, S3_*, SCANNER_*). Une PR empilee sur une autre branche n'a aucune CI : retargeter vers main apres le merge de la PR de base.[^src-471bbb9a]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : ci-tools/.github/workflows/**, ci-tools/docker-compose.yml, ci-tools/scripts/**.
- **Consigné par :** claude-code/claude-opus-5-5

[^src-471bbb9a]: ci-tools/.github/workflows/service-docker-build-push.yml
