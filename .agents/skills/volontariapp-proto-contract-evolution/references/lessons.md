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
  - id: src-46c005bd
    resource: "https://github.com/Volontariapp/docs/blob/main/live-events/04-contrats-et-backend.md"
    title: "https://github.com/Volontariapp/docs/blob/main/live-events/04-contrats-et-backend.md"
---

# Leçons

## 2026-11-07 - PR automatique et PR manuelle sur contracts

- **Type :** decision
- **Leçon :** La PR automatique de proto-registry fait un bump patch de contracts et contracts-nest et de leurs dependants. Une PR manuelle qui touche aussi contracts se code en parallele : changeset add tot, changeset version seulement apres rebase sur la PR automatique fusionnee.[^src-46c005bd]
- **Consigné par :** Claude

## 2026-10-06 - proto-sync ne regenere que le dernier commit d'un push

- **Type :** rule
- **Leçon :** ci-tools/.github/workflows/proto-sync.yml calcule les protos modifies avec git diff HEAD~1 HEAD (fetch-depth 2) : seul le DERNIER commit d'un push sur main est pris en compte. Pousser plusieurs commits protos d'un coup (ex: post + event + user) ne regenere que le domaine du dernier ; les autres restent absents de contracts et contracts-nest bien que les .proto embarques soient a jour. Pousser un seul commit par push, ou squasher, jusqu'a correction du workflow (utiliser github.event.before). Secours : label reset sur une PR de proto-registry (proto-reset.yml), mais DOMAINS y vaut user post event common (sans storage ni social).[^src-69763d1f]
- **Consigné par :** claude-code/agent

[^src-69763d1f]: ci-tools/.github/workflows/proto-sync.yml
[^src-46c005bd]: https://github.com/Volontariapp/docs/blob/main/live-events/04-contrats-et-backend.md
