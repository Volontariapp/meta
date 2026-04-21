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

REPOS=(
  "api-gateway"
  "ci-tools"
  "ms-event"
  "ms-post"
  "ms-social"
  "ms-user"
  "nativapp"
  "npm-packages"
  "proto-registry"
)

auto_rebase_repo() {
  local dir="$1"
  local name
  name=$(basename "${dir}")

  if [ ! -d "${dir}" ]; then
    return
  fi

  echo -e "${BLUE}▸${NC} Auto-rebase ${BOLD}${name}${NC}..."

  (
    cd "${dir}"

    if ! git rev-parse --is-inside-work-tree &>/dev/null; then
        echo -e "  ${DIM}Skipped: Not a git repo${NC}"
        return
    fi

    # 1. Store current branch
    ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    
    # 2. Stash changes
    echo -e "  ${DIM}Stashing local changes...${NC}"
    STASH_OUT=$(git stash --include-untracked)
    HAD_STASH=true
    if [[ "$STASH_OUT" == "No local changes to save" ]]; then
       HAD_STASH=false
    fi

    # 3. Identify Main branch
    MAIN_BRANCH="main"
    if ! git show-ref --verify --quiet refs/heads/main && ! git show-ref --verify --quiet refs/remotes/origin/main; then
        if git show-ref --verify --quiet refs/heads/master || git show-ref --verify --quiet refs/remotes/origin/master; then
            MAIN_BRANCH="master"
        fi
    fi

    # 4. Update Main
    echo -e "  ${DIM}Updating ${MAIN_BRANCH} and submodules...${NC}"
    if ! git checkout "${MAIN_BRANCH}" --quiet || ! git pull origin "${MAIN_BRANCH}" --quiet; then
        echo -e "  ${RED}✖${NC} Failed to update ${MAIN_BRANCH}. Aborting."
        [ "$HAD_STASH" = true ] && git checkout "${ORIGINAL_BRANCH}" --quiet && git stash pop --quiet || true
        return 1
    fi
    git submodule update --init --recursive --quiet

    # 5. Merge Main into Original Branch
    echo -e "  ${DIM}Merging ${MAIN_BRANCH} into ${ORIGINAL_BRANCH}...${NC}"
    git checkout "${ORIGINAL_BRANCH}" --quiet
    if ! git merge "${MAIN_BRANCH}" --no-edit; then
        echo -e "  ${YELLOW}⚠  Merge conflict with ${MAIN_BRANCH}!${NC} Aborting merge."
        git merge --abort
        [ "$HAD_STASH" = true ] && git stash pop --quiet || true
        return 1
    fi
    # Update submodules again after merge in case pointers changed
    git submodule update --init --recursive --quiet

    # 6. Pop Stash
    if [ "$HAD_STASH" = true ]; then
        echo -e "  ${DIM}Restoring local changes...${NC}"
        if ! git stash pop --quiet; then
            echo -e "  ${RED}✖  Conflict during stash pop!${NC} Rolling back to clean state."
            git reset --hard HEAD --quiet
            echo -e "  ${YELLOW}💡 Log:${NC} Your changes are still safe in 'git stash list'."
            return 1
        fi
    fi

    echo -e "  ${GREEN}✔${NC} Successfully rebased and restored."
  )
}

echo -e "${BOLD}${BLUE}━━━ Auto-Rebase Workspaces ━━━${NC}\n"

for repo in "${REPOS[@]}"; do
  auto_rebase_repo "${ROOT_DIR}/${repo}"
  echo ""
done

echo -e "${BOLD}${GREEN}━━━ All repositories processed ━━━${NC}"
