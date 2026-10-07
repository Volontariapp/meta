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
---

# Leçons

## 2026-10-07 - Connexion Redis des Outbox Runners : toujours redis-master

- **Type :** pitfall
- **Leçon :** Tous les runners d'outbox (outbox-*, y compris outbox-ws) doivent impérativement avoir REDIS_HOST pointant sur redis-master, et JAMAIS sur un Redis local de service comme ws-service-redis. Un outbox qui publie sur un Redis local crée un trou noir : les événements sont marqués COMPLETED en base PostgreSQL mais n'atteignent jamais redis-master où écoutent les post-processors des autres microservices.[^src-07ce5da2]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : deploy/apps/**, deploy/infrastructure/**.
- **Consigné par :** claude-code/claude-opus-5-5

[^src-07ce5da2]: deploy/apps/base/ws-service/deployment-outbox.yaml
