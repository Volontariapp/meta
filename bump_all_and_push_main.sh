#!/usr/bin/env bash
set -euo pipefail

# --- Configuration & Paths ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}"

# --- Colors ---
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

# Repositories to process
SINGLE_REPOS=(
  "api-gateway"
  "ms-user"
  "ms-post"
  "ms-event"
  "ms-social"
  "ms-storage"
  "ws-service"
  "nativapp"
)

RUNNER_REPOS=(
  "workers-runners"
  "post-processors-runner"
  "outbox-runners"
)

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo -e "${YELLOW}🔍 Running in DRY-RUN mode (no commits, no pushes)${NC}\n"
fi

UPDATED_REPOS=()
UNCHANGED_REPOS=()
FAILED_REPOS=()

update_repo() {
  local repo="$1"
  local is_runner="$2"
  local target_dir="${ROOT_DIR}/${repo}"

  if [ ! -d "${target_dir}" ]; then
    echo -e "${YELLOW}⚠ Directory ${repo} not found, skipping.${NC}"
    return 0
  fi

  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}▸ Processing repository: ${repo}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  local status=0
  set +e
  (
    set -e
    cd "${target_dir}"

    # Stash any pending work
    local had_stash=false
    if ! git diff --quiet || ! git diff --staged --quiet || [ -n "$(git status --porcelain)" ]; then
      echo -e "  ${DIM}Stashing local modifications...${NC}"
      git stash --include-untracked --quiet
      had_stash=true
    fi

    cleanup() {
      if [ "$had_stash" = true ]; then
        echo -e "  ${DIM}Restoring stashed changes...${NC}"
        git stash pop --quiet 2>/dev/null || true
      fi
    }
    trap cleanup EXIT

    # Checkout main and pull latest
    echo -e "  ${DIM}Checking out main & pulling latest...${NC}"
    git checkout main --quiet
    git pull origin main --quiet

    if [ "$is_runner" = true ]; then
      # Subdirectories with package.json
      local subdirs
      subdirs=$(find . -maxdepth 2 -name "package.json" -not -path "*/node_modules/*" -exec dirname {} \; | sort -u)
      for sub in $subdirs; do
        if [ "$sub" = "." ]; then continue; fi
        echo -e "  ${CYAN}📦 Updating ${sub} via yarn up \"@volontariapp/**\"...${NC}"
        (cd "$sub" && yarn up "@volontariapp/**")
      done
    else
      echo -e "  ${CYAN}📦 Running yarn up \"@volontariapp/**\"...${NC}"
      yarn up "@volontariapp/**"
    fi

    # Stage only package.json and yarn.lock files
    local modified_pkg_files
    modified_pkg_files=$(git status --porcelain | awk '{print $2}' | grep -E '(package\.json|yarn\.lock)$' || true)

    if [ -n "${modified_pkg_files}" ]; then
      for file in ${modified_pkg_files}; do
        git add "$file"
      done

      if ! git diff --cached --quiet; then
        echo -e "  ${GREEN}✔ Dependencies updated in package.json / yarn.lock${NC}"

        if [ "$DRY_RUN" = true ]; then
          echo -e "  ${YELLOW}ℹ [DRY-RUN] Would commit and push to origin/main.${NC}"
          git reset --hard HEAD --quiet
        else
          echo -e "  ${DIM}Committing and pushing directly to main...${NC}"
          SKIP_SKILL_CHECK=1 git commit -m "chore: bump @volontariapp dependencies to latest" --quiet
          git push origin main --quiet
          echo -e "  ${GREEN}🚀 Successfully pushed to main!${NC}"
        fi
        exit 10
      else
        echo -e "  ${DIM}No changes staged after resolution.${NC}"
        exit 0
      fi
    else
      echo -e "  ${DIM}Already up to date.${NC}"
      exit 0
    fi
  )
  status=$?
  set -e

  if [ $status -eq 10 ]; then
    UPDATED_REPOS+=("${repo}")
  elif [ $status -eq 0 ]; then
    UNCHANGED_REPOS+=("${repo}")
  else
    echo -e "  ${RED}❌ Error processing ${repo} (exit code ${status}).${NC}"
    FAILED_REPOS+=("${repo}")
  fi
}

echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     Volontariapp — Bulk Bump & Push @volontariapp/**     ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"

# 1. Update single-package repos
for repo in "${SINGLE_REPOS[@]}"; do
  update_repo "$repo" false
done

# 2. Update runner repos
for repo in "${RUNNER_REPOS[@]}"; do
  update_repo "$repo" true
done

# --- Summary ---
echo -e "\n${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━ Summary ━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ ${#UPDATED_REPOS[@]} -gt 0 ]; then
  echo -e "\n${BOLD}${GREEN}✔ Repositories updated and pushed to main:${NC}"
  for r in "${UPDATED_REPOS[@]}"; do
    echo -e "  - ${GREEN}${r}${NC}"
  done
fi

if [ ${#UNCHANGED_REPOS[@]} -gt 0 ]; then
  echo -e "\n${BOLD}${DIM}ℹ Repositories already up to date:${NC}"
  for r in "${UNCHANGED_REPOS[@]}"; do
    echo -e "  - ${DIM}${r}${NC}"
  done
fi

if [ ${#FAILED_REPOS[@]} -gt 0 ]; then
  echo -e "\n${BOLD}${RED}❌ Repositories that encountered an error:${NC}"
  for r in "${FAILED_REPOS[@]}"; do
    echo -e "  - ${RED}${r}${NC}"
  done
  exit 1
fi

echo -e "\n${BOLD}${GREEN}✨ All repositories processed successfully!${NC}\n"
