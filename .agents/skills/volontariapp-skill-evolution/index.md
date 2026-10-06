# Évolution des skills (auto-apprentissage)

Boucle d'auto-apprentissage des skills Volontariapp : savoir quelles skills sont désynchronisées du code (tous repos confondus), les mettre à jour, consigner une leçon apprise (correction de l'utilisateur, piège découvert), créer une skill quand un sujet n'est couvert par aucune, et garder le bundle conforme OKF v0.2. À utiliser quand le hook de fin de boucle le demande, après une correction de l'utilisateur, ou pour toute modification de .agents/skills/.

## Concepts

- [SKILL.md](/volontariapp-skill-evolution/SKILL.md) - point d'entrée de la skill
- [Leçons apprises](/volontariapp-skill-evolution/references/lessons.md) - Règles et pièges découverts en travaillant sur volontariapp-skill-evolution, du plus récent au plus ancien.
- [Configuration multi-agents](/volontariapp-skill-evolution/references/multi-agent-layout.md) - Comment Claude Code, Codex, Cursor, Gemini CLI et Antigravity reçoivent les mêmes instructions, les mêmes skills et quels hooks s'appliquent.
- [Conventions OKF du dépôt](/volontariapp-skill-evolution/references/okf-conventions.md) - Structure d'un bundle de skill, champs de frontmatter et règles de rédaction propres à Volontariapp.
- [Workflow de la boucle d'auto-apprentissage](/volontariapp-skill-evolution/references/workflow.md) - Déclencheurs, étapes et garde-fous de la mise à jour automatique des skills.

## Scripts

- [`check_symbols.py`](/volontariapp-skill-evolution/scripts/check_symbols.py) - Symboles de code cités dans les skills qui n'existent nulle part dans le code (API inventées ou renommées).
- [`evolve.py`](/volontariapp-skill-evolution/scripts/evolve.py) - Skill evolution loop for the Volontariapp agent skills (OKF v0.2 bundles).
- [`okf.py`](/volontariapp-skill-evolution/scripts/okf.py) - Minimal OKF v0.2 helpers: frontmatter parsing/emission, timestamps, actors.

Historique : [log.md](/volontariapp-skill-evolution/log.md)
