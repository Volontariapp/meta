#!/usr/bin/env bash
# Add or remove labels on pull requests, through the GitHub REST API.
#
# Why REST and not `gh pr edit` / `gh label`: old gh versions (2.4) have no `gh label` command,
# `gh pr edit --add-label` fails on a GraphQL deprecation, and `-f "labels[]=x"` is rejected.
# This script only needs `gh` (logged in), `jq` and `python3`.
#
# Usage:
#   scripts/pr-label.sh --label notify-discord --label docker-and-e2e ms-post#72 ms-ranking#31
#   scripts/pr-label.sh --label notify-discord --remove ms-user#78
#   scripts/pr-label.sh --label notify-discord --create ms-post#72     # create the label if missing
#   scripts/pr-label.sh --dry-run --label notify-discord ms-post#72    # show, change nothing
#
# Targets are `repo#number` (owner defaults to Volontariapp) or `owner/repo#number`.
#
# Options:
#   --label NAME         label to add (or remove with --remove); repeatable, at least one
#   --remove             remove the labels instead of adding them (a missing label is not an error)
#   --create             create a missing label in the repository before adding it
#   --color HEX          colour used by --create (default 5865F2)
#   --description TEXT   description used by --create
#   --dry-run            print what would be done, call nothing that writes
#   --force              allow adding `discord-notified` (see below)
#   -h, --help           this help
#
# `discord-notified` is the dedup claim of ci-tools/.github/workflows/pr-ready-notify.yml: the
# workflow sets it itself. Adding it by hand silences the notification of that PR, so adding it
# is refused unless --force is given. Removing it (to be notified again) is always allowed.
#
# Exit code: 0 if every target succeeded, 1 otherwise.
set -euo pipefail

OWNER="${PR_LABEL_OWNER:-Volontariapp}"
CLAIM_LABEL="discord-notified"

LABELS=()
TARGETS=()
MODE="add"
CREATE=0
DRY_RUN=0
FORCE=0
COLOR="5865F2"
DESCRIPTION=""

usage() { sed -n '2,32p' "$0" | sed 's/^# \{0,1\}//'; }
die() { echo "pr-label: $*" >&2; exit 2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --label) [[ $# -ge 2 ]] || die "--label needs a value"; LABELS+=("$2"); shift 2 ;;
    --remove) MODE="remove"; shift ;;
    --create) CREATE=1; shift ;;
    --color) [[ $# -ge 2 ]] || die "--color needs a value"; COLOR="$2"; shift 2 ;;
    --description) [[ $# -ge 2 ]] || die "--description needs a value"; DESCRIPTION="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    --*) die "unknown option $1" ;;
    *) TARGETS+=("$1"); shift ;;
  esac
done

[[ ${#LABELS[@]} -gt 0 ]] || die "at least one --label is required"
[[ ${#TARGETS[@]} -gt 0 ]] || die "at least one target (repo#number) is required"
[[ "$MODE" == "remove" && $CREATE -eq 1 ]] && die "--create makes no sense with --remove"

if [[ "$MODE" == "add" && $FORCE -eq 0 ]]; then
  for label in "${LABELS[@]}"; do
    [[ "$label" == "$CLAIM_LABEL" ]] && die "refusing to add '$CLAIM_LABEL' by hand (the workflow manages it); use --force to override"
  done
fi

urlencode() { python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"; }

labels_json() { printf '%s\n' "${LABELS[@]}" | jq -R . | jq -s '{labels: .}'; }

failures=0

for target in "${TARGETS[@]}"; do
  if [[ ! "$target" =~ ^([A-Za-z0-9._-]+/)?([A-Za-z0-9._-]+)#([0-9]+)$ ]]; then
    echo "$target: invalid target (expected repo#number)" >&2; failures=$((failures + 1)); continue
  fi
  owner_part="${BASH_REMATCH[1]%/}"
  repo="${owner_part:-$OWNER}/${BASH_REMATCH[2]}"
  number="${BASH_REMATCH[3]}"

  if [[ "$MODE" == "add" ]]; then
    if [[ $CREATE -eq 1 ]]; then
      for label in "${LABELS[@]}"; do
        encoded="$(urlencode "$label")"
        if gh api "repos/$repo/labels/$encoded" --jq .name >/dev/null 2>&1; then continue; fi
        if [[ $DRY_RUN -eq 1 ]]; then echo "$repo: [dry-run] would create label '$label' (#$COLOR)"; continue; fi
        if ! gh api -X POST "repos/$repo/labels" -f "name=$label" -f "color=$COLOR" \
             -f "description=$DESCRIPTION" --jq .name >/dev/null 2>&1; then
          echo "$repo#$number: cannot create label '$label'" >&2; failures=$((failures + 1)); continue 2
        fi
        echo "$repo: label '$label' created"
      done
    fi
    if [[ $DRY_RUN -eq 1 ]]; then echo "$repo#$number: [dry-run] would add ${LABELS[*]}"; continue; fi
    if result="$(labels_json | gh api -X POST "repos/$repo/issues/$number/labels" --input - --jq '[.[].name] | join(", ")' 2>&1)"; then
      echo "$repo#$number: labels now [$result]"
    else
      echo "$repo#$number: FAILED to add labels: $result" >&2; failures=$((failures + 1))
    fi
  else
    for label in "${LABELS[@]}"; do
      if [[ $DRY_RUN -eq 1 ]]; then echo "$repo#$number: [dry-run] would remove '$label'"; continue; fi
      encoded="$(urlencode "$label")"
      if gh api -X DELETE "repos/$repo/issues/$number/labels/$encoded" >/dev/null 2>&1; then
        echo "$repo#$number: removed '$label'"
      else
        echo "$repo#$number: '$label' not removed (not on the PR, or no access)"
      fi
    done
  fi
done

[[ $failures -eq 0 ]]
