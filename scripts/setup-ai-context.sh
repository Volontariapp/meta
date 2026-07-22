#!/bin/bash
# Génère META_CONTEXT.md et META_GRAPH.json : résumé ultra-léger des 14 sous-repos
# (nom, responsabilité, contrats exportés, dépendances cross-repo) pour que les
# agents IA n'aient pas à charger le contenu complet de chaque repo pour s'orienter.
set -e

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

if ! command -v rg >/dev/null 2>&1; then
  echo "❌ ripgrep (rg) est requis mais introuvable. Installe-le (brew install ripgrep) avant de continuer." >&2
  exit 1
fi

REPOS="api-gateway ms-event ms-post ms-social ms-user ci-tools proto-registry npm-packages outbox-runners workers-runners post-processors-runner ws-service changelog-checker nativapp"

GRAPH_JSON="$ROOT/META_GRAPH.json"
CONTEXT_MD="$ROOT/META_CONTEXT.md"

echo "{" > "$GRAPH_JSON"
echo "  \"repos\": [" >> "$GRAPH_JSON"

{
  echo "# META_CONTEXT"
  echo ""
  echo "Résumé auto-généré (scripts/setup-ai-context.sh) — ne pas éditer à la main, régénérer via le script."
  echo ""
} > "$CONTEXT_MD"

first=1
for repo in $REPOS; do
  [ -d "$ROOT/$repo" ] || continue

  # 1. Responsabilité : 1ère phrase utile du CLAUDE.md du repo, sinon description package.json, sinon README
  resp=""
  if [ -f "$ROOT/$repo/CLAUDE.md" ]; then
    # ignore la section RTK (présente dans presque tous les CLAUDE.md, pas informative sur le domaine)
    resp=$(rg '^## ' "$ROOT/$repo/CLAUDE.md" 2>/dev/null | rg -iv 'rtk|rust token killer' | head -1 | sed 's/^## //' | sed 's/[#*`]//g')
    # titre trop générique ("Domaine" seul) -> concatène avec la ligne suivante
    if [ "${#resp}" -lt 10 ] && [ -n "$resp" ]; then
      next=$(rg -A3 "^## $resp$" "$ROOT/$repo/CLAUDE.md" 2>/dev/null | rg -v '^(##|--|$)' | head -1)
      [ -n "$next" ] && resp="$next"
    fi
  fi
  if [ -z "$resp" ] && [ -f "$ROOT/$repo/package.json" ]; then
    resp=$(node -e "try{console.log(require('$ROOT/$repo/package.json').description||'')}catch(e){}" 2>/dev/null)
  fi
  if [ -z "$resp" ] && [ -f "$ROOT/$repo/README.md" ]; then
    resp=$(rg -m1 '^# ' "$ROOT/$repo/README.md" 2>/dev/null | sed 's/^# //')
  fi
  # nettoie emojis/caractères non imprimables laissés par certains titres
  resp=$(echo "$resp" | LC_ALL=C sed 's/[^[:print:]]//g' | sed 's/  */ /g' | sed 's/^ *//;s/ *$//')
  [ -z "$resp" ] && resp="(non documenté)"

  # 2. Dépendances cross-repo : packages @volontariapp/* déclarés dans package.json (racine du repo)
  deps=""
  if [ -f "$ROOT/$repo/package.json" ]; then
    deps=$(rg -o '"@volontariapp/[a-zA-Z0-9_-]+"' "$ROOT/$repo/package.json" 2>/dev/null | tr -d '"' | sort -u | tr '\n' ',' | sed 's/,$//')
  fi

  # 3. Contrats exportés : uniquement pour proto-registry (services gRPC réels)
  contracts=""
  if [ "$repo" = "proto-registry" ] && [ -d "$ROOT/$repo/proto" ]; then
    contracts=$(rg -o '^service \w+' "$ROOT/$repo/proto" -g '*.proto' --no-filename 2>/dev/null | sed 's/^service //' | sort -u | tr '\n' ',' | sed 's/,$//')
  fi

  # --- META_CONTEXT.md ---
  {
    echo "## $repo"
    echo "- Responsabilité : $resp"
    [ -n "$contracts" ] && echo "- Services gRPC exportés : $contracts"
    [ -n "$deps" ] && echo "- Dépend de (packages partagés) : $deps"
    echo ""
  } >> "$CONTEXT_MD"

  # --- META_GRAPH.json ---
  [ $first -eq 0 ] && echo "    ," >> "$GRAPH_JSON"
  first=0
  {
    echo "    {"
    echo "      \"repo\": \"$repo\","
    echo "      \"responsibility\": \"$(echo "$resp" | sed 's/"/\\"/g')\","
    echo "      \"deps\": [$(echo "$deps" | sed 's/\([^,]*\)/"\1"/g')]"
    echo "    }"
  } >> "$GRAPH_JSON"
done

echo "  ]" >> "$GRAPH_JSON"
echo "}" >> "$GRAPH_JSON"

tokens_estimate=$(( $(wc -c < "$CONTEXT_MD") / 4 ))
echo "✅ Générés : $CONTEXT_MD (~${tokens_estimate} tokens estimés), $GRAPH_JSON"
if [ "$tokens_estimate" -gt 2000 ]; then
  echo "⚠️  META_CONTEXT.md dépasse le budget de 2000 tokens (~${tokens_estimate}). Réduire le niveau de détail par repo." >&2
fi
