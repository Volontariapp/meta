#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Check for gh CLI
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠  GitHub CLI (gh) required. Installing via brew...${NC}"
    brew install gh
fi

# Check for jq
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠  jq required. Installing via brew...${NC}"
    brew install jq
fi

PR_LINKS=()

# 1. Scan npm-packages for latest versions
echo -e "${BLUE}🔍 Scanning latest internal package versions...${NC}"
cd "${ROOT_DIR}/npm-packages"
git stash --include-untracked --quiet
ORIGINAL_PKG_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git checkout main --quiet && git pull origin main --quiet

LATEST_VERSIONS=()
PKG_JSONS=$(find packages -name "package.json" -not -path "*/node_modules/*")
for pj in ${PKG_JSONS}; do
    NAME=$(jq -r '.name' "${pj}")
    VERSION=$(jq -r '.version' "${pj}")
    LATEST_VERSIONS+=("${NAME}:${VERSION}")
done

git checkout "${ORIGINAL_PKG_BRANCH}" --quiet
git stash pop --quiet || true

# 2. Iterate over repos to check and update
REPOS=("api-gateway" "ms-user" "ms-post" "ms-event" "ms-social" "nativapp")

for repo in "${REPOS[@]}"; do
    target_dir="${ROOT_DIR}/${repo}"
    if [ ! -d "${target_dir}" ] || [ ! -f "${target_dir}/package.json" ]; then continue; fi

    echo -e "\n${BLUE}📂 Checking ${BOLD}${repo}${NC}..."
    cd "${target_dir}"
    
    git stash --include-untracked --quiet
    ORIG_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    git checkout main --quiet && git pull origin main --quiet

    UPDATED=false
    BRANCH_NAME="chore/bump-deps-$(date +%s)"

    for entry in "${LATEST_VERSIONS[@]}"; do
        pkg_name="${entry%%:*}"
        latest_v="${entry#*:}"
        
        # Use jq to get current version in the target package.json
        current_v=$(jq -r ".dependencies[\"$pkg_name\"] // empty" package.json || echo "")
        
        if [ -z "$current_v" ]; then
            current_v=$(jq -r ".devDependencies[\"$pkg_name\"] // empty" package.json || echo "")
        fi

        if [ -n "$current_v" ] && [ "$current_v" != "$latest_v" ]; then
            echo -e "  🔼 Updating ${pkg_name}: ${current_v} -> ${latest_v}"
            # Perform the update in-place on main (we'll branch later if needed)
            jq ".dependencies[\"$pkg_name\"] = \"$latest_v\"" package.json > package.json.tmp && mv package.json.tmp package.json
            jq ".devDependencies[\"$pkg_name\"] = \"$latest_v\"" package.json > package.json.tmp && mv package.json.tmp package.json
            UPDATED=true
        fi
    done

    if [ "$UPDATED" = true ]; then
        echo -e "  📦 Updating lockfile..."
        yarn install
        
        # Only create branch and PR if there are actual diffs
        if ! git diff --quiet package.json yarn.lock; then
            echo -e "  🌿 Creating branch and committing changes..."
            git checkout -b "$BRANCH_NAME" --quiet
            git add package.json yarn.lock
            git commit -m "chore: bump internal dependencies to latest" --quiet
            git push origin "$BRANCH_NAME" --quiet
            
            echo -e "  🚀 Creating Pull Request..."
            PR_URL=$(gh pr create --title "chore: bump internal dependencies" --body "Automated dependency update for @volontariapp packages." --base main --head "$BRANCH_NAME")
            PR_LINKS+=("${repo}: ${PR_URL}")
            echo -e "  ${GREEN}✔ PR Created: ${PR_URL}${NC}"
        else
            echo -e "  ${GREEN}✔ No changes needed in lockfile. Already up to date.${NC}"
        fi
    else
        echo -e "  ${GREEN}✔ Already up to date.${NC}"
    fi

    # Cleanup: return to original state
    git checkout "${ORIG_BRANCH}" --quiet
    git stash pop --quiet || true
done

echo -e "\n${BOLD}${GREEN}━━━ Dependency Bump Complete ━━━${NC}"
if [ ${#PR_LINKS[@]} -gt 0 ]; then
    echo -e "\n${BOLD}Created PRs:${NC}"
    for link in "${PR_LINKS[@]}"; do
        echo -e "  🔗 ${link}"
    done
else
    echo -e "\nNo updates were needed."
fi
