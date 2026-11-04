#!/usr/bin/env bash
# Re-run the CI of pull requests by pushing an empty commit on their branch.
#
# The commit is created through the GitHub git-data API (same tree as the current head, one
# parent), so nothing is cloned, checked out or committed locally: no SSH key, no pre-commit
# hook, no skill check. A push made with your gh token starts the workflows like a normal push.
# It needs a token that can write to the repository (not the `workflow` scope: no workflow file
# is changed).
#
# Usage:
#   scripts/pr-retrigger.sh ms-post#72 ms-ranking#31
#   scripts/pr-retrigger.sh --message "ci: re-run now that the labels are set" ms-post#72
#   scripts/pr-retrigger.sh --dry-run ms-post#72
#
# Targets are `repo#number` (owner defaults to Volontariapp) or `owner/repo#number`.
#
# Options:
#   --message TEXT   commit message (default: "ci: empty commit to re-trigger the CI"). When an
#                    agent runs this script, end the message with its attribution lines.
#   --dry-run        show the branch and head of each PR, create nothing
#   -h, --help       this help
#
# Refused for a PR that is closed or merged, that comes from a fork, or whose branch is
# main/master (an empty commit must never land on a protected branch).
#
# A cheaper way to re-run is "Re-run jobs" in the Actions tab: the notification job reads the
# labels live, so a label added after a run only needs that job re-run. Use this script when a
# new run is really wanted (new commit sha, `synchronize` event).
#
# Exit code: 0 if every target succeeded, 1 otherwise.
set -euo pipefail

OWNER="${PR_RETRIGGER_OWNER:-Volontariapp}"
MESSAGE="ci: empty commit to re-trigger the CI"
DRY_RUN=0
TARGETS=()

usage() { sed -n '2,29p' "$0" | sed 's/^# \{0,1\}//'; }
die() { echo "pr-retrigger: $*" >&2; exit 2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --message) [[ $# -ge 2 ]] || die "--message needs a value"; MESSAGE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    --*) die "unknown option $1" ;;
    *) TARGETS+=("$1"); shift ;;
  esac
done

[[ ${#TARGETS[@]} -gt 0 ]] || die "at least one target (repo#number) is required"

failures=0

for target in "${TARGETS[@]}"; do
  if [[ ! "$target" =~ ^([A-Za-z0-9._-]+/)?([A-Za-z0-9._-]+)#([0-9]+)$ ]]; then
    echo "$target: invalid target (expected repo#number)" >&2; failures=$((failures + 1)); continue
  fi
  owner_part="${BASH_REMATCH[1]%/}"
  repo="${owner_part:-$OWNER}/${BASH_REMATCH[2]}"
  number="${BASH_REMATCH[3]}"
  label="$repo#$number"

  if ! pr="$(gh api "repos/$repo/pulls/$number" \
       --jq '{state, merged, branch: .head.ref, sha: .head.sha, fork: (.head.repo.full_name != .base.repo.full_name)}' 2>&1)"; then
    echo "$label: cannot read the PR: $pr" >&2; failures=$((failures + 1)); continue
  fi
  state="$(jq -r .state <<<"$pr")"
  merged="$(jq -r .merged <<<"$pr")"
  branch="$(jq -r .branch <<<"$pr")"
  head_sha="$(jq -r .sha <<<"$pr")"
  fork="$(jq -r .fork <<<"$pr")"

  if [[ "$state" != "open" || "$merged" == "true" ]]; then
    echo "$label: refused, the PR is not open (state=$state, merged=$merged)" >&2; failures=$((failures + 1)); continue
  fi
  if [[ "$fork" == "true" ]]; then
    echo "$label: refused, the branch lives in a fork" >&2; failures=$((failures + 1)); continue
  fi
  if [[ "$branch" == "main" || "$branch" == "master" ]]; then
    echo "$label: refused, the head branch is $branch" >&2; failures=$((failures + 1)); continue
  fi

  if [[ $DRY_RUN -eq 1 ]]; then
    echo "$label: [dry-run] would push an empty commit on '$branch' (head ${head_sha:0:7})"; continue
  fi

  if ! tree="$(gh api "repos/$repo/git/commits/$head_sha" --jq .tree.sha 2>&1)"; then
    echo "$label: cannot read the head commit: $tree" >&2; failures=$((failures + 1)); continue
  fi
  if ! new_sha="$(jq -n --arg m "$MESSAGE" --arg t "$tree" --arg p "$head_sha" \
       '{message: $m, tree: $t, parents: [$p]}' |
       gh api -X POST "repos/$repo/git/commits" --input - --jq .sha 2>&1)"; then
    echo "$label: cannot create the commit: $new_sha" >&2; failures=$((failures + 1)); continue
  fi
  # Not forced: if someone pushed in the meantime, the update is rejected and nothing is lost.
  if out="$(jq -n --arg s "$new_sha" '{sha: $s, force: false}' |
       gh api -X PATCH "repos/$repo/git/refs/heads/$branch" --input - --jq .object.sha 2>&1)"; then
    echo "$label: pushed ${new_sha:0:7} on '$branch' (was ${head_sha:0:7})"
  else
    echo "$label: cannot move '$branch' to the new commit: $out" >&2; failures=$((failures + 1))
  fi
done

[[ $failures -eq 0 ]]
