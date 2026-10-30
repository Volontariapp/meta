#!/usr/bin/env bash
# PostToolUse (Write|Edit|MultiEdit) : marqueur amont de la règle du STOP, ESLint sur le seul fichier
# modifié (dans son repo), et skills qui décrivent ce fichier.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_DIR="$REPO_ROOT/.git/volontariapp-stop-guard"

INPUT=$(cat)
SESSION=$(printf '%s' "$INPUT" | jq -r '.session_id // empty')
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_response.filePath // .tool_input.file_path // empty')
[ -z "$FILE" ] && exit 0

case "$FILE" in
  "$REPO_ROOT"/*) ;;
  *) exit 0 ;;
esac
REL="${FILE#"$REPO_ROOT"/}"
TOP="${REL%%/*}"
CONTEXT=""

# 1. Upstream marker read by stop-rule-guard.sh.
case "$TOP" in
  npm-packages|proto-registry)
    if [ -n "$SESSION" ]; then
      mkdir -p "$STATE_DIR"
      grep -qx "$TOP" "$STATE_DIR/$SESSION" 2>/dev/null || echo "$TOP" >> "$STATE_DIR/$SESSION"
    fi
    CONTEXT="RÈGLE DU STOP active : ${TOP} modifié. Termine ce package (build, test, changeset ou buf lint/breaking), puis arrête-toi et rends la main au Lead Dev. Les éditions des consommateurs sont désormais refusées.
"
    ;;
esac

# 2. Skills governing the file.
case "$REL" in
  .agents/skills/*) ;;
  *)
    OWNERS=$(python3 "$REPO_ROOT/.agents/skills/volontariapp-skill-evolution/scripts/evolve.py" owners "$REL" 2>/dev/null | sed 's/^[^:]*: //')
    if [ -n "$OWNERS" ] && [ "$OWNERS" != "aucune skill" ]; then
      CONTEXT="${CONTEXT}Skills qui décrivent ${REL} : ${OWNERS}. Les relire si une règle, un chemin ou une commande change ; la boucle de fin (evolve.py) demandera leur vérification.
"
    fi
    ;;
esac

# 3. ESLint on this file only, from the nearest directory that has ESLint installed.
LINT_OUT=""
LINT_STATUS=0
case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    dir="$(dirname "$FILE")"
    while [ "${dir#"$REPO_ROOT"/}" != "$dir" ]; do
      if [ -x "$dir/node_modules/.bin/eslint" ]; then
        LINT_OUT=$(cd "$dir" && FORCE_COLOR=0 NO_COLOR=1 ./node_modules/.bin/eslint --no-color --no-warn-ignored "$FILE" 2>&1)
        LINT_STATUS=$?
        break
      fi
      dir="$(dirname "$dir")"
    done
    ;;
esac

if [ "$LINT_STATUS" -ne 0 ]; then
  REASON="ESLint échoue sur ${REL} (exit ${LINT_STATUS}) : corriger sans any ni cast as unknown as.

${LINT_OUT}

${CONTEXT}"
  jq -n --arg reason "$REASON" '{decision:"block", reason:$reason}'
  exit 0
fi

if [ -n "$CONTEXT" ]; then
  jq -n --arg ctx "$CONTEXT" '{hookSpecificOutput:{hookEventName:"PostToolUse", additionalContext:$ctx}}'
fi
exit 0
