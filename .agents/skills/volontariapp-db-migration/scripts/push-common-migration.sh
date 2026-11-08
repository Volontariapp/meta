#!/bin/bash
# Copie une migration COMMUNE (outbox, job_audit, triggers) dans tous les depots qui ont leur propre
# base ou qui la reconstruisent en CI, depuis un worktree neuf sur origin/main de chaque depot
# (les checkouts de meta sont souvent sur une branche de feature et sales), puis pousse sur main.
#
# Usage: push-common-migration.sh <fichier-migration.ts> "<titre du commit>" [--dry-run]
#   Le fichier source est celui deja publie dans npm-packages (workers/src/test/migrations).
#   A lancer APRES la publication des paquets npm-packages et la levee du verrou du STOP.
#   Le corps du commit est reformule dans MSG_BODY (variable d'environnement, optionnelle).
set -euo pipefail

SRC=${1:?fichier de migration manquant}
TITLE=${2:?titre de commit manquant}
DRY=${3:-}
META=${META:-/Users/victoragahi/Developer/meta}
FILE=$(basename "$SRC")
MD5=$(md5 -q "$SRC")

# depot:dossier de destination (relatif a la racine du depot)
TARGETS=(
  "ms-user:src/migrations/common"
  "ms-social:src/migrations/common"
  "ms-post:src/migrations/common"
  "ms-event:src/migrations/common"
  "ms-storage:src/migrations/common"
  "ms-ranking:src/migrations/common"
  "ws-service:src/migrations/common"
  "post-processors-runner:post-processor-event/src/migrations/common"
  "workers-runners:worker-event/src/migrations/common"
)

BODY=${MSG_BODY:-"Copy of the common migration $FILE published in npm-packages."}
MSG=$(printf '%s\n\n%s\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n' "$TITLE" "$BODY")

for t in "${TARGETS[@]}"; do
  repo=${t%%:*}; dir=${t#*:}
  wt=$META/.worktrees/common-migration-$repo
  echo "== $repo"
  git -C "$META/$repo" fetch -q origin main
  if [ "$DRY" = "--dry-run" ]; then
    echo "   ajouterait $dir/$FILE sur $(git -C "$META/$repo" rev-parse --short origin/main) puis pousserait sur main"
    continue
  fi
  [ -d "$wt" ] || git -C "$META/$repo" worktree add -q --detach "$wt" origin/main
  git -C "$wt" checkout -q --detach origin/main
  mkdir -p "$wt/$dir"
  if [ -f "$wt/$dir/$FILE" ] && [ "$(md5 -q "$wt/$dir/$FILE")" = "$MD5" ]; then
    echo "   deja presente, ignoree"; continue
  fi
  cp "$SRC" "$wt/$dir/$FILE"
  git -C "$wt" add "$dir/$FILE"
  SKILL_CHECK_MODE=warn git -C "$wt" commit -q -m "$MSG"
  git -C "$wt" push -q origin HEAD:main
  echo "   pousse $(git -C "$wt" rev-parse HEAD) (md5 $(md5 -q "$wt/$dir/$FILE"))"
done
echo "Ensuite : surveiller la CI de chaque depot avec le SHA COMPLET (gh run list --commit <sha complet>)."
