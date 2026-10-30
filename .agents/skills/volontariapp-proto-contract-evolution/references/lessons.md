---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-proto-contract-evolution, du plus récent au plus ancien."
tags: [lessons, volontariapp-proto-contract-evolution]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-06T15:21:22Z"
sources:
  - id: src-69763d1f
    resource: ci-tools/.github/workflows/proto-sync.yml
    title: ci-tools/.github/workflows/proto-sync.yml
---

# Leçons

## 2026-10-06 - proto-sync ne regenere que le dernier commit d'un push

- **Type :** rule
- **Leçon :** ci-tools/.github/workflows/proto-sync.yml calcule les protos modifies avec git diff HEAD~1 HEAD (fetch-depth 2) : seul le DERNIER commit d'un push sur main est pris en compte. Pousser plusieurs commits protos d'un coup (ex: post + event + user) ne regenere que le domaine du dernier ; les autres restent absents de contracts et contracts-nest bien que les .proto embarques soient a jour. Pousser un seul commit par push, ou squasher, jusqu'a correction du workflow (utiliser github.event.before). Secours : label reset sur une PR de proto-registry (proto-reset.yml), mais DOMAINS y vaut user post event common (sans storage ni social).[^src-69763d1f]
- **Consigné par :** claude-code/agent

[^src-69763d1f]: ci-tools/.github/workflows/proto-sync.yml
