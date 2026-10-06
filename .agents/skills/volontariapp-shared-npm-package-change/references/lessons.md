---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-shared-npm-package-change, du plus récent au plus ancien."
tags: [lessons, volontariapp-shared-npm-package-change]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-06T15:19:37Z"
sources:
  - id: src-10d1da5b
    resource: npm-packages
    title: npm-packages
  - id: src-9f856e83
    resource: npm-packages/.changeset/config.json
    title: npm-packages/.changeset/config.json
---

# Leçons

## 2026-10-06 - yarn changeset version exige GITHUB_TOKEN et le changeset deja pousse

- **Type :** rule
- **Leçon :** Le changelog du depot utilise @changesets/changelog-github (config .changeset/config.json) : yarn changeset version appelle l'API GitHub pour lier commit et PR, donc il exige un GITHUB_TOKEN dans l'environnement et que le commit qui ajoute le changeset soit deja pousse sur origin. Pousser la branche avant le commit de version, puis lancer la commande avec le jeton fourni en variable d'environnement inline (par ex. GITHUB_TOKEN=$(gh auth token) yarn changeset version) sans l'afficher ni l'ecrire dans un fichier. Dans un worktree git, supprimer les tsconfig.tsbuildinfo perimes si yarn build ne produit pas dist.[^src-9f856e83]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Merge d'une PR de npm-packages : revue obligatoire, utiliser --auto

- **Type :** rule
- **Leçon :** La branche main de npm-packages exige une approbation de revue (REVIEW_REQUIRED) : gh pr merge direct echoue (base branch policy prohibits the merge). gh pr merge --admin et un git merge pousse sur main sont refuses par le classificateur de permissions de Claude Code (Merge Without Review) sauf instruction explicite du Lead Dev pour une PR donnee (cas des PR de sync bot proto). Pour une PR de feature : gh pr merge <n> --merge --auto, qui merge des que la revue est approuvee et la CI verte. Le merge sur main declenche la release npm, irreversible : ne merger qu'une PR relue, CI verte.[^src-10d1da5b]
- **Consigné par :** claude-code/agent

[^src-10d1da5b]: npm-packages
[^src-9f856e83]: npm-packages/.changeset/config.json
