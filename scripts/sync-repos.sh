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

REPOS=(
  "api-gateway"
  "ci-tools"
  "ms-event"
  "ms-post"
  "ms-user"
  "nativapp"
  "npm-packages"
)

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

sync_repo() {
  local dir="$1"
  local name
  name=$(basename "${dir}")

  echo -e "${BLUE}▸${NC} Syncing ${BOLD}${name}${NC}..."

  if [ ! -d "${dir}" ]; then
    echo -e "  ${YELLOW}⚠  Directory not found. Run scripts/init_repos.sh to clone it.${NC}"
    SKIPPED=$((SKIPPED + 1))
    return
  fi

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

    if git pull origin "${DEFAULT_BRANCH}" --quiet; then
      git submodule update --init --recursive --quiet
      echo -e "  ${GREEN}✔${NC} Pulled successfully and updated submodules"
      SYNCED=$((SYNCED + 1))
    else
      echo -e "  ${RED}✖${NC} Merge conflict detected. Aborting merge for ${name}."
      echo -e "    ${DIM}Resolve manually: cd ${name} && git pull origin ${DEFAULT_BRANCH}${NC}"
      git merge --abort 2>/dev/null || git rebase --abort 2>/dev/null || true
      FAILED=$((FAILED + 1))
    fi
  )
}

echo -e "${BOLD}${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║        Git Repositories Sync & Rebase        ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

for repo in "${REPOS[@]}"; do
  sync_repo "${ROOT_DIR}/${repo}"
  echo ""
done

echo -e "${BOLD}${BLUE}--- Summary ---${NC}"
echo -e "  ${GREEN}✔${NC} Synced:  ${SYNCED}"
echo -e "  ${YELLOW}⏭${NC}  Skipped: ${SKIPPED}"
echo -e "  ${RED}✖${NC} Failed:  ${FAILED}"
echo ""
