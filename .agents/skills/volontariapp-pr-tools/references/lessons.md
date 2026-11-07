---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-pr-tools, du plus récent au plus ancien."
tags: [lessons, volontariapp-pr-tools]
status: stable
generated:
  by: claude-code/agent
  at: "2026-11-04T13:23:49Z"
sources:
  - id: src-b4ad13c6
    resource: "https://github.com/Volontariapp/ci-tools/pull/74"
    title: "https://github.com/Volontariapp/ci-tools/pull/74"
  - id: src-8cc65ece
    resource: scripts/pr-label.sh
    title: scripts/pr-label.sh
---

# Leçons

## 2026-11-07 - CI complete des depots back : label puis rerun

- **Type :** command
- **Leçon :** La CI complete (docker et E2E) des depots back exige le label docker-and-e2e. Poser le label ne relance pas la CI : gh run rerun <id> --failed.[^src-8cc65ece]
- **Consigné par :** Claude

## 2026-11-07 - PR empilee fermee a la fusion de sa parente

- **Type :** pitfall
- **Leçon :** Une PR empilee est fermee definitivement si sa branche de base est supprimee a la fusion de la PR parente (--delete-branch). La rebaser sur main avant cette fusion : gh pr edit --base main.[^src-8cc65ece]
- **Consigné par :** Claude

## 2026-11-05 - Branches protégées : ms-user, ms-post, api-gateway, ci-tools et deploy exigent une approbation

- **Type :** pitfall
- **Leçon :** gh pr merge renvoie BLOCKED (REVIEW_REQUIRED) sur ms-user, ms-post, api-gateway, ci-tools et deploy, même CI verte ; ms-event, ms-storage, post-processors-runner et npm-packages n'en demandent pas (constaté le 2026-11-05). Ne pas contourner avec --admin : poser notify-discord (puis relancer le job notify-ready si la CI est finie) ; ci-tools et deploy n'ont pas de job notify-ready, prévenir le Lead Dev directement. gh pr merge --auto échoue (erreur GraphQL) avec le gh de la machine.[^src-b4ad13c6]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-11-04 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : scripts/pr-label.sh, scripts/pr-retrigger.sh.
- **Consigné par :** claude-code/agent

[^src-b4ad13c6]: https://github.com/Volontariapp/ci-tools/pull/74
[^src-8cc65ece]: scripts/pr-label.sh
