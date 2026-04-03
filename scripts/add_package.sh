#!/usr/bin/env bash
set -euo pipefail

# Colors
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

# 1. Identify services (directories with package.json that aren't excluded)
EXCLUDED_DIRS=("node_modules" "npm-packages" "scripts" "ci-tools" "proto-registry")
SERVICES=()

for d in */; do
    d=${d%/}
    if [[ ! " ${EXCLUDED_DIRS[@]} " =~ " ${d} " ]] && [ -f "${d}/package.json" ]; then
        SERVICES+=("${d}")
    fi
done

if [ ${#SERVICES[@]} -eq 0 ]; then
    echo -e "${RED}✖ No services found.${NC}"
    exit 1
fi

# 2. Select Services with fzf (multi-select)
echo -e "${CYAN}▸ Select services to add packages to (TAB to toggle, ENTER to confirm):${NC}"
SELECTED_SERVICES=$(printf "%s\n" "${SERVICES[@]}" | fzf -m --prompt="Services> " --height=10 --border)

if [ -z "${SELECTED_SERVICES}" ]; then
    echo -e "${RED}✖ No services selected.${NC}"
    exit 0
fi

# 3. Identify and Parse NPM Packages
# Using jq to get name and version. If jq is not available, we regex it.
HAS_JQ=false
if command -v jq &> /dev/null; then
    HAS_JQ=true
fi

NPM_PKGS=()
PACKAGE_JSONS=$(find npm-packages/packages -name "package.json" -not -path "*/node_modules/*")

for pj in ${PACKAGE_JSONS}; do
    if ${HAS_JQ}; then
        NAME=$(jq -r '.name' "${pj}")
        VERSION=$(jq -r '.version' "${pj}")
    else
        NAME=$(grep '"name":' "${pj}" | head -1 | cut -d'"' -f4)
        VERSION=$(grep '"version":' "${pj}" | head -1 | cut -d'"' -f4)
    fi
    NPM_PKGS+=("${NAME}@${VERSION}")
done

# 4. Select Packages with fzf (multi-select)
echo -e "\n${CYAN}▸ Select packages to add (TAB to toggle, ENTER to confirm):${NC}"
SELECTED_PKGS=$(printf "%s\n" "${NPM_PKGS[@]}" | fzf -m --prompt="Packages> " --height=15 --border)

if [ -z "${SELECTED_PKGS}" ]; then
    echo -e "${RED}✖ No packages selected.${NC}"
    exit 0
fi

# 5. Process Installation
echo -e "\n${BLUE}━━━ Processing installation ━━━${NC}\n"

echo "${SELECTED_SERVICES}" | while read -r service; do
    [ -z "${service}" ] && continue
    echo -e "${BOLD}${CYAN}Service: ${service}${NC}"
    cd "${ROOT_DIR}/${service}"
    
    echo "${SELECTED_PKGS}" | while read -r pkg; do
        [ -z "${pkg}" ] && continue
        echo -e "  Adding ${GREEN}${pkg}${NC}..."
        yarn add "${pkg}"
    done
    
    echo -e "${GREEN}✔ Done for ${service}${NC}\n"
done

echo -e "${BOLD}${GREEN}━━━ All packages added successfully! ━━━${NC}"
