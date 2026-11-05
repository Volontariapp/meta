---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-meta-mods, du plus récent au plus ancien."
tags: [lessons, volontariapp-meta-mods]
status: stable
generated:
  by: claude-code/agent
  at: "2026-11-05T13:14:14Z"
sources:
  - id: src-41765895
    resource: .claude/mods/meta-skills/hooks/register.tsx
    title: .claude/mods/meta-skills/hooks/register.tsx
  - id: src-5b15ad73
    resource: .claude/mods/meta-stop-lock/hooks/register.ts
    title: .claude/mods/meta-stop-lock/hooks/register.ts
---

# Leçons

## 2026-11-05 - Une fonction qui recoit $ se declare au niveau du module

- **Type :** rule
- **Leçon :** Le validateur des mods refuse une fonction qui recoit $ si elle est declaree dans la closure de register : la declarer au niveau du module (function declaration) et garder l'etat partage dans une variable de module. Le matcher tool prend une liste, pas une variable d'union.[^src-5b15ad73]
- **Consigné par :** claude-code/agent

## 2026-11-05 - Un nom de commande reserve fait ignorer tout le hook qui l'enregistre

- **Type :** rule
- **Leçon :** claude plugin validate signale que /skills est un nom livre par Claude Code : $.command.register le refuse et le hook session.start qui l'appelle est ignore en entier, y compris le rafraichissement de l'indicateur. Renommer (/skill-search) et valider chaque nom de commande avant de livrer.[^src-41765895]
- **Consigné par :** claude-code/agent

## 2026-11-05 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : .claude/mods/**, .claude-plugin/marketplace.json.
- **Consigné par :** claude-code/agent

[^src-41765895]: .claude/mods/meta-skills/hooks/register.tsx
[^src-5b15ad73]: .claude/mods/meta-stop-lock/hooks/register.ts
