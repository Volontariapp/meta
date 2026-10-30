---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-scaffold-microservice, du plus récent au plus ancien."
tags: [lessons, volontariapp-scaffold-microservice]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-12T12:18:42Z"
sources:
  - id: src-37dd6836
    resource: AGENTS.md
    title: AGENTS.md
---

# Leçons

## 2026-10-19 - Un fichier a un seul role : la classe seule dans son fichier, le reste dans interfaces, types, constants, helpers

- **Type :** rule
- **Leçon :** Regle de Victor (2026-10-19), valable dans tout nouveau code (ms-*, runners, workers, post-processors). Un fichier dont le nom finit par .service, .client, .handler, .module, .provider, .transformer ne contient que sa classe. Toute interface va dans interfaces/<nom>.interface.ts, tout type dans types/<nom>.type.ts, toute constante dans constants/<nom>.constants.ts, toute fonction hors classe dans helpers/<nom>.helpers.ts, avec un nommage coherent. Modele : worker-ranking/src/clients/ (apres le commit cdf7070 de workers-runners). Verifier en fin de ticket qu'aucun fichier ne melange une classe et une declaration : pour chaque fichier .ts, compter les lignes de premier niveau commencant par const, interface, type, function, enum a cote d'une class. Exceptions assumees : les fichiers de configuration regroupant plusieurs classes de config, et le tableau entities d'un database.module.ts copie des modules freres.[^src-37dd6836]
- **Consigné par :** claude-code/agent

## 2026-10-12 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : proto-registry/proto/**, npm-packages/packages/**, ms-*/src/**, outbox-runners/**, workers-runners/**, post-processors-runner/**, api-gateway/src/**, deploy/**, ci-tools/**.
- **Consigné par :** claude-code/agent

[^src-37dd6836]: AGENTS.md
