#!/usr/bin/env bash
# Tests of the STOP rule hooks (post-edit.sh marks, stop-rule-guard.sh denies).
# Builds a throwaway meta workspace with real git repos and worktrees, then replays hook inputs.
# Usage: .claude/hooks/tests/stop-rule-guard.test.sh
set -u
HOOKS_SRC="$(builtin cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
META="$TMP/meta"
FAILS=0

new_repo() { # new_repo <dir> <remote name> [package.json content]
  mkdir -p "$1"
  git -C "$1" init -q -b main
  git -C "$1" remote add origin "git@github.com:Volontariapp/$2.git"
  [ -n "${3:-}" ] && printf '%s\n' "$3" > "$1/package.json"
  git -C "$1" -c user.name=t -c user.email=t@t commit -q --allow-empty -m init
  [ -f "$1/package.json" ] && git -C "$1" add package.json && git -C "$1" -c user.name=t -c user.email=t@t commit -q -m pkg
  return 0
}

new_repo "$META" meta '{"name":"volontariapp"}'
mkdir -p "$META/.claude/hooks/lib"
cp "$HOOKS_SRC/post-edit.sh" "$HOOKS_SRC/stop-rule-guard.sh" "$META/.claude/hooks/"
cp "$HOOKS_SRC/lib/resolve-repo.sh" "$META/.claude/hooks/lib/"
new_repo "$META/npm-packages" npm-packages '{"name":"npm-packages","private":true}'
new_repo "$META/proto-registry" proto-registry
new_repo "$META/ms-user" ms-user '{"name":"ms-user","dependencies":{"@volontariapp/domain-user":"1.0.0"}}'
git -C "$META/npm-packages" worktree add -q -b wt "$META/.worktrees/npm-wt"
git -C "$META/proto-registry" worktree add -q -b wt "$META/.worktrees/proto-wt"
git -C "$META/ms-user" worktree add -q -b wt "$META/.worktrees/ms-user-wt"
git -C "$META" worktree add -q -b wt "$META/.worktrees/meta-wt"

post_edit() { # post_edit <session> <file>
  jq -n --arg s "$1" --arg f "$2" '{session_id:$s, tool_input:{file_path:$f}}' \
    | "$META/.claude/hooks/post-edit.sh" > /dev/null
}
guard() { # guard <session> <file> -> prints deny or allow
  local out
  out=$(jq -n --arg s "$1" --arg f "$2" '{session_id:$s, tool_input:{file_path:$f}}' \
    | "$META/.claude/hooks/stop-rule-guard.sh")
  if printf '%s' "$out" | grep -q '"permissionDecision": *"deny"'; then echo deny; else echo allow; fi
}
expect() { # expect <label> <expected> <actual>
  if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1 (expected $2, got $3)"; FAILS=$((FAILS + 1)); fi
}

# 1. No upstream edit in the session: consumers stay editable.
expect "no marker, consumer in a worktree" allow "$(guard s0 "$META/.worktrees/ms-user-wt/src/a.ts")"

# 2. Upstream edited in a worktree of npm-packages: the lock must apply (the bug of lot 3).
post_edit s1 "$META/.worktrees/npm-wt/packages/domain-user/src/a.ts"
expect "npm-packages worktree edit locks consumer worktree" deny "$(guard s1 "$META/.worktrees/ms-user-wt/src/a.ts")"
expect "npm-packages worktree edit locks consumer checkout" deny "$(guard s1 "$META/ms-user/src/new-file.ts")"
expect "npm-packages stays editable" allow "$(guard s1 "$META/.worktrees/npm-wt/packages/domain-user/src/b.ts")"
expect "meta worktree stays editable" allow "$(guard s1 "$META/.worktrees/meta-wt/docs-x.md")"

# 3. Upstream edited in the main checkout: unchanged behaviour.
post_edit s2 "$META/npm-packages/packages/shared/src/a.ts"
expect "npm-packages checkout edit locks consumer worktree" deny "$(guard s2 "$META/.worktrees/ms-user-wt/src/a.ts")"

# 4. proto-registry edited in a worktree: generated contracts locked, in a worktree too.
post_edit s3 "$META/.worktrees/proto-wt/proto/user.proto"
expect "proto worktree edit locks contracts in npm worktree" deny "$(guard s3 "$META/.worktrees/npm-wt/packages/contracts/src/a.ts")"
expect "proto worktree edit locks contracts in npm checkout" deny "$(guard s3 "$META/npm-packages/packages/contracts-nest/src/a.ts")"
expect "proto worktree edit leaves other npm packages editable" allow "$(guard s3 "$META/npm-packages/packages/shared/src/a.ts")"

# 5. Markers are per session.
expect "other session not locked" allow "$(guard s4 "$META/.worktrees/ms-user-wt/src/a.ts")"

# 6. Release clears every lock.
"$META/.claude/hooks/stop-rule-guard.sh" release > /dev/null
expect "release unlocks" allow "$(guard s1 "$META/.worktrees/ms-user-wt/src/a.ts")"

[ "$FAILS" -eq 0 ] && echo "all passed" || { echo "$FAILS failed"; exit 1; }
