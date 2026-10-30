@./AGENTS.md

## Spécifique à Gemini CLI

- Les skills sont dans `.agents/skills/` (aussi exposées sous `.gemini/skills`) : ouvrir le `SKILL.md` indiqué par la table « Workflow » d'`AGENTS.md`.
- Pas de hooks : appliquer soi-même la règle du STOP (section 1) et le routage `mesh-mcp` (section 2).
- Avant de terminer une tâche qui a modifié du code : `python3 .agents/skills/volontariapp-skill-evolution/scripts/evolve.py plan`, puis suivre le plan.
