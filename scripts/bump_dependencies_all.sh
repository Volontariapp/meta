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
PR_LINKS_FILE=$(mktemp)
trap 'rm -f "${PR_LINKS_FILE}"' EXIT


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
REPOS=("api-gateway" "ms-user" "ms-post" "ms-event" "ms-social" "nativapp" "workers-runners" "post-processors-runner" "outbox-runners")

for repo in "${REPOS[@]}"; do
    target_dir="${ROOT_DIR}/${repo}"
    if [ ! -d "${target_dir}" ]; then continue; fi

    echo -e "\n${BLUE}📂 Checking ${BOLD}${repo}${NC}..."
    
    # Run in a subshell to isolate failures and directory changes
    (
        set -e
        cd "${target_dir}"
        
        git stash --include-untracked --quiet
        ORIG_BRANCH=$(git rev-parse --abbrev-ref HEAD)
        
        # Cleanup trap for this specific repository
        repo_cleanup() {
            git checkout "${ORIG_BRANCH}" --quiet 2>/dev/null || true
            git stash pop --quiet 2>/dev/null || true
        }
        trap repo_cleanup EXIT

        git checkout main --quiet && git pull origin main --quiet

        UPDATED=false
        BRANCH_NAME="chore/bump-deps-$(date +%s)"

        PKG_JSONS=$(find . -name "package.json" -not -path "*/node_modules/*")
        
        for pj in ${PKG_JSONS}; do
            pj_dir=$(dirname "$pj")
            
            PROJ_UPDATED=false

            for entry in "${LATEST_VERSIONS[@]}"; do
                pkg_name="${entry%%:*}"
                latest_v="${entry#*:}"
                
                current_v=$(jq -r ".dependencies[\"$pkg_name\"] // empty" "$pj" || echo "")
                if [ -z "$current_v" ]; then
                    current_v=$(jq -r ".devDependencies[\"$pkg_name\"] // empty" "$pj" || echo "")
                fi

                if [ -n "$current_v" ] && [ "$current_v" != "$latest_v" ]; then
                    echo -e "  🔼 Updating ${pkg_name} in ${pj}: ${current_v} -> ${latest_v}"
                    
                    has_dep=$(jq -r ".dependencies[\"$pkg_name\"] // empty" "$pj" || echo "")
                    if [ -n "$has_dep" ]; then
                        jq ".dependencies[\"$pkg_name\"] = \"$latest_v\"" "$pj" > "${pj}.tmp" && mv "${pj}.tmp" "$pj"
                    fi
                    
                    has_dev_dep=$(jq -r ".devDependencies[\"$pkg_name\"] // empty" "$pj" || echo "")
                    if [ -n "$has_dev_dep" ]; then
                        jq ".devDependencies[\"$pkg_name\"] = \"$latest_v\"" "$pj" > "${pj}.tmp" && mv "${pj}.tmp" "$pj"
                    fi
                    
                    PROJ_UPDATED=true
                    UPDATED=true
                fi
            done

            if [ "$PROJ_UPDATED" = true ]; then
                echo -e "  📦 Updating lockfile in ${pj_dir}..."
                (cd "$pj_dir" && yarn install)
            fi
        done

        if [ "$UPDATED" = true ]; then
            if ! git diff --quiet; then
                echo -e "  🌿 Creating branch and committing changes..."
                git checkout -b "$BRANCH_NAME" --quiet
                git add .
                git commit -m "chore: bump internal dependencies to latest" --quiet
                git push origin "$BRANCH_NAME" --quiet
                
                echo -e "  🚀 Creating Pull Request..."
                PR_URL=$(gh pr create --title "chore: bump internal dependencies" --body "Automated dependency update for @volontariapp packages." --base main --head "$BRANCH_NAME")
                echo "${repo}: ${PR_URL}" >> "${PR_LINKS_FILE}"
                echo -e "  ${GREEN}✔ PR Created: ${PR_URL}${NC}"
            else
                echo -e "  ${GREEN}✔ No changes needed in lockfiles. Already up to date.${NC}"
            fi
        else
            echo -e "  ${GREEN}✔ Already up to date.${NC}"
        fi
    ) || echo -e "  ${RED}❌ Error: Failed to process ${repo}. Skipping to next repository.${NC}"
done

# 3. Read back PR links
if [ -f "${PR_LINKS_FILE}" ]; then
    while IFS= read -r line; do
        PR_LINKS+=("$line")
    done < "${PR_LINKS_FILE}"
fi

echo -e "\n${BOLD}${GREEN}━━━ Dependency Bump Complete ━━━${NC}"

if [ ${#PR_LINKS[@]} -gt 0 ]; then
    echo -e "\n${BOLD}Created PRs:${NC}"
    for link in "${PR_LINKS[@]}"; do
        echo -e "  🔗 ${link}"
    done
else
    echo -e "\nNo updates were needed."
fi
