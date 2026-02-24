#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

SYNCED=0
FAILED=0
SKIPPED=0

check_dirty() {
  local dir="$1"
  local name="$2"

  if [ -n "$(cd "${dir}" && git status --porcelain 2>/dev/null)" ]; then
    echo -e "  ${RED}✖${NC} ${name} has uncommitted changes."
    echo -e "    ${DIM}Run: cd ${name} && git stash${NC}"
    return 1
  fi
  return 0
}

sync_submodule() {
  local dir="$1"
  local name
  name=$(basename "${dir}")

  echo -e "${BLUE}▸${NC} Syncing ${BOLD}${name}${NC}..."

  if ! check_dirty "${dir}" "${name}"; then
    SKIPPED=$((SKIPPED + 1))
    return
  fi

  (
    cd "${dir}"

    git fetch origin --prune --quiet

    DEFAULT_BRANCH="main"
    if ! git rev-parse --verify origin/main &>/dev/null; then
      if git rev-parse --verify origin/master &>/dev/null; then
        DEFAULT_BRANCH="master"
      else
        echo -e "  ${YELLOW}⚠  No origin/main or origin/master found. Skipping.${NC}"
        SKIPPED=$((SKIPPED + 1))
        return
      fi
    fi

    if ! git rev-parse --verify "${DEFAULT_BRANCH}" &>/dev/null; then
      git checkout -b "${DEFAULT_BRANCH}" "origin/${DEFAULT_BRANCH}" --quiet
      echo -e "  ${GREEN}✔${NC} Created local branch ${DEFAULT_BRANCH} from origin/${DEFAULT_BRANCH}"
    else
      git checkout "${DEFAULT_BRANCH}" --quiet
    fi

    BEHIND=$(git rev-list --count "${DEFAULT_BRANCH}..origin/${DEFAULT_BRANCH}" 2>/dev/null || echo "0")

    if [ "${BEHIND}" -eq 0 ]; then
      echo -e "  ${GREEN}✔${NC} Already up to date"
      SYNCED=$((SYNCED + 1))
      return
    fi

    echo -e "  ${BLUE}↓${NC} ${BEHIND} commit(s) behind origin/${DEFAULT_BRANCH}"

    if git rebase "origin/${DEFAULT_BRANCH}" --quiet; then
      echo -e "  ${GREEN}✔${NC} Rebased successfully"
      SYNCED=$((SYNCED + 1))
    else
      echo -e "  ${RED}✖${NC} Rebase conflict detected. Aborting rebase for ${name}."
      echo -e "    ${DIM}Resolve manually: cd ${name} && git rebase origin/${DEFAULT_BRANCH}${NC}"
      git rebase --abort 2>/dev/null || true
      FAILED=$((FAILED + 1))
    fi
  )
}

echo -e "${BOLD}${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║        Git Submodule Sync & Rebase           ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

if ! check_dirty "${ROOT_DIR}" "meta (root)"; then
  echo -e "${YELLOW}⚠  Root repository has uncommitted changes.${NC}"
  echo -e "${DIM}   Stash or commit before syncing submodules.${NC}"
  read -rp "   Continue anyway? [y/N] " answer
  if [[ ! "${answer}" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
  fi
fi

SUBMODULES=$(cd "${ROOT_DIR}" && git submodule --quiet foreach 'echo $toplevel/$sm_path' 2>/dev/null)

if [ -z "${SUBMODULES}" ]; then
  echo -e "${YELLOW}No submodules found. Run: git submodule update --init --recursive${NC}"
  exit 1
fi

while IFS= read -r submodule_path; do
  if [ -d "${submodule_path}" ]; then
    sync_submodule "${submodule_path}"
    echo ""
  fi
done <<< "${SUBMODULES}"

echo -e "${BOLD}${BLUE}--- Summary ---${NC}"
echo -e "  ${GREEN}✔${NC} Synced:  ${SYNCED}"
echo -e "  ${YELLOW}⏭${NC}  Skipped: ${SKIPPED}"
echo -e "  ${RED}✖${NC} Failed:  ${FAILED}"
echo ""

CHANGED_SUBMODULES=$(cd "${ROOT_DIR}" && git diff --name-only 2>/dev/null || true)

if [ -n "${CHANGED_SUBMODULES}" ]; then
  echo -e "${BLUE}Updated submodule pointers detected:${NC}"
  echo "${CHANGED_SUBMODULES}" | while IFS= read -r line; do
    echo -e "  ${DIM}${line}${NC}"
  done
  echo ""
  read -rp "Stage updated submodule pointers? [Y/n] " stage_answer
  if [[ ! "${stage_answer}" =~ ^[Nn]$ ]]; then
    (cd "${ROOT_DIR}" && git add .)
    echo -e "${GREEN}✔${NC} Submodule pointers staged."
    echo -e "${DIM}   Run: git commit -m \"chore: sync submodule pointers\"${NC}"
  else
    echo -e "${DIM}⏭  Skipped staging.${NC}"
  fi
else
  echo -e "${GREEN}All submodule pointers are already in sync.${NC}"
fi
