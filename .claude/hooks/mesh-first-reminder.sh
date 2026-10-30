#!/usr/bin/env bash
# SessionStart / UserPromptSubmit : rappelle d'utiliser mesh-mcp en premier pour toute investigation de code.
# Le texte est injecté dans le contexte de l'agent (additionalContext), pas affiché comme refus.
set -euo pipefail

event="${1:-SessionStart}"

read -r -d '' MSG <<'EOF' || true
mesh-mcp est le PREMIER reflexe pour toute investigation de code multi-repo (bug, panne, "qui utilise X", flux async, gRPC).
Avant tout grep/ls/Read exploratoire :
1. Charger les schemas : ToolSearch select:mcp__mesh-mcp__find_dependents,mcp__mesh-mcp__analyze_impact,mcp__mesh-mcp__analyze_grpc,mcp__mesh-mcp__smart_search,mcp__mesh-mcp__search_docs
2. Choisir l'outil : find_dependents (qui importe/utilise un symbole ou package), analyze_impact (event, job, outbox, stream, saga), analyze_grpc (RPC/.proto), smart_search (declaration de symbole, scope obligatoire), search_docs (concept d'architecture).
3. Ne verifier ensuite que les lignes path:line retournees (Read cible ou grep dans UN repo pour un identifiant exact).
Regles de raisonnement (AGENTS.md, section 2 quinquies) :
- Absence ("jamais appele", "aucun producteur", "personne ne consomme") : seulement avec l'outil adapte, TOUTES les racines (jamais une liste de repos choisie a la main) et la couverture citee. Sinon ecrire "non trouve dans <perimetre>".
- "0 producteur" + un consommateur present : stream ou type d'evenement peut etre resolu a l'execution (registre, config, gather). Lire les emetteurs non litteraux, puis suivre ce que le consommateur publie ensuite. depth atteinte n'est pas une fin de chaine : relancer a depth+1.
- Avant "X n'est appele nulle part" : gRPC (analyze_grpc), evenement (analyze_impact), post-processors-runner / workers-runners / ws-service / nativapp. Une verification manquante : "non determine".
- Separer FAIT (sortie d'outil ou ligne lue ce tour-ci, fichier:ligne), INFERENCE (marquee) et HYPOTHESE sur mesh-mcp. "T'es sur ?" : refaire la verification sur le perimetre complet avant de repondre.
Piege shell : `cd` est surcharge par `z` dans cet environnement (erreur "command not found: z", le repertoire ne change pas). Utiliser des chemins absolus.
EOF

python3 -c '
import json, sys
print(json.dumps({"hookSpecificOutput": {"hookEventName": sys.argv[1], "additionalContext": sys.argv[2]}}, ensure_ascii=False))
' "$event" "$MSG"
