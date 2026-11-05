#!/usr/bin/env bash
# Sourced by post-edit.sh and stop-rule-guard.sh.
# resolve_repo FILE META_ROOT sets:
#   REPO_NAME  repository the file belongs to (origin remote basename, e.g. npm-packages),
#              so that a worktree under .worktrees/ maps to its real repository;
#   REPO_TOP   absolute root of that checkout or worktree;
#   REPO_REL   path of the file relative to REPO_TOP;
#   REPO_FILE  physical absolute path of the file (symlinks resolved, like git's paths).
# The file may not exist yet (Write): the nearest existing parent directory is used.
# Without git, falls back to the first path segment under META_ROOT.
resolve_repo() {
  local file="$1" meta_root="$2" dir phys url
  REPO_NAME=""
  REPO_TOP=""
  REPO_REL=""
  REPO_FILE="$file"

  dir="$(dirname "$file")"
  while [ ! -d "$dir" ] && [ "$dir" != "/" ]; do
    dir="$(dirname "$dir")"
  done

  # git returns physical paths: compare against the physical path of the file.
  phys="$(builtin cd "$dir" 2>/dev/null && pwd -P)"
  [ -n "$phys" ] && REPO_FILE="$phys${file#"$dir"}"

  REPO_TOP="$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)"
  if [ -n "$REPO_TOP" ]; then
    url="$(git -C "$REPO_TOP" remote get-url origin 2>/dev/null)"
    if [ -n "$url" ]; then
      REPO_NAME="$(basename "$url" .git)"
    else
      REPO_NAME="$(basename "$REPO_TOP")"
    fi
    REPO_REL="${REPO_FILE#"$REPO_TOP"/}"
    return 0
  fi

  local rel="${file#"$meta_root"/}"
  REPO_NAME="${rel%%/*}"
  REPO_TOP="$meta_root/$REPO_NAME"
  REPO_REL="${rel#*/}"
}
