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
  "changelog-checker"
  "proto-registry"
)



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

  (
    cd "${dir}"

    DEFAULT_BRANCH="main"
    if ! git rev-parse --verify origin/main &>/dev/null; then
      if git rev-parse --verify origin/master &>/dev/null; then
        DEFAULT_BRANCH="master"
      fi
    fi

    echo -e "  ${DIM}Stashing changes, checking out ${DEFAULT_BRANCH}, and pulling...${NC}"

    git stash --quiet

    git checkout "${DEFAULT_BRANCH}" --quiet

    if git pull origin "${DEFAULT_BRANCH}" --quiet; then
      git submodule update --init --recursive --quiet
      echo -e "  ${GREEN}✔${NC} Pulled successfully and updated submodules"
      SYNCED=$((SYNCED + 1))
    else
      echo -e "  ${RED}✖${NC} Error pulling ${name}."
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
