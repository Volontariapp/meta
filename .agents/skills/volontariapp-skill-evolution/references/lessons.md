---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-skill-evolution, du plus récent au plus ancien."
tags: [lessons, volontariapp-skill-evolution]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:30:27Z"
sources:
  - id: src-e76e88b2
    resource: .agents/skills/volontariapp-skill-evolution/scripts/evolve.py
    title: .agents/skills/volontariapp-skill-evolution/scripts/evolve.py
  - id: src-5352af57
    resource: .agents/skills/volontariapp-skill-evolution/scripts/okf.py
    title: .agents/skills/volontariapp-skill-evolution/scripts/okf.py
  - id: src-17b81fa2
    resource: .agents/skills/volontariapp-skill-evolution/tests/test_evolve.py
    title: .agents/skills/volontariapp-skill-evolution/tests/test_evolve.py
---

# Leçons

## 2026-10-06 - Les tests doivent isoler chaque chemin module

- **Type :** pitfall
- **Leçon :** Les tests remplacent REPO, SKILLS_DIR, AGENTS_MD et MESH_TOML de evolve.py par le dépôt temporaire. Un nouveau chemin calculé au chargement du module (MESH_TOML) oublié dans RepoTestCase a fait réécrire le vrai mesh-mcp.toml par write_indexes pendant les tests.[^src-17b81fa2]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-10-06 - Frontmatter YAML invalide avec @

- **Type :** pitfall
- **Leçon :** okf.py écrivait @volontariapp/x sans guillemets ; le YAML strict refuse un scalaire qui commence par @, et Claude Code affichait le titre H1 à la place de la description. L'émetteur quote désormais toute valeur commençant par un indicateur YAML ; vérifier un frontmatter douteux avec un parseur strict.[^src-5352af57]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-10-06 - STOP n'est pas un marqueur de correction

- **Type :** pitfall
- **Leçon :** Dans Volontariapp, STOP désigne la règle de blocage d'AGENTS.md (section 1) : le marqueur anglais stop a été retiré de CORRECTION_MARKERS, sinon chaque message qui parle de la règle déclenche une fausse demande de leçon.[^src-e76e88b2]
- **Consigné par :** claude-code/claude-opus-5-5

[^src-e76e88b2]: .agents/skills/volontariapp-skill-evolution/scripts/evolve.py
[^src-5352af57]: .agents/skills/volontariapp-skill-evolution/scripts/okf.py
[^src-17b81fa2]: .agents/skills/volontariapp-skill-evolution/tests/test_evolve.py
