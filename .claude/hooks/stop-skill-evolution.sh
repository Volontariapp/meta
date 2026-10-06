#!/usr/bin/env bash
# Stop hook : boucle d'auto-apprentissage des skills. Bloque l'arrêt une fois avec un plan précis quand
# des skills sont désynchronisées du code qu'elles décrivent (voir volontariapp-skill-evolution).
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHONDONTWRITEBYTECODE=1 python3 "$REPO_ROOT/.agents/skills/volontariapp-skill-evolution/scripts/evolve.py" hook
