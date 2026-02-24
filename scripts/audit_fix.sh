#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "${BLUE}--- Starting Vulnerability Audit & Fix ---${NC}"

for dir in "${ROOT_DIR}"/*/; do
  if [ -d "${dir}" ] && [ -f "${dir}package.json" ]; then
    repo_name=$(basename "${dir}")
    
    if [ "${repo_name}" == "nativapp" ] || [ "${repo_name}" == "ci-tools" ]; then
      echo -e "${YELLOW}⏭  Skipping ${repo_name}...${NC}"
      continue
    fi

    echo -e "${BLUE}🔒 Running audit fix in ${repo_name}...${NC}"
    (
      cd "${dir}"
      
      if grep -q '"dependencies"' package.json || grep -q '"devDependencies"' package.json; then
        if [ -f "yarn.lock" ] && command -v yarn &> /dev/null; then
           yarn install >/dev/null 2>&1 || true
        else
           npm install >/dev/null 2>&1 || true
        fi

        npm audit fix --force 2>/dev/null || npm audit fix 2>/dev/null || true
        
        rm -f package-lock.json
        
        if [ -f "yarn.lock" ] && command -v yarn &> /dev/null; then
           yarn install >/dev/null 2>&1 || true
        fi
      else
        echo -e "  No dependencies to audit."
      fi
    )
    echo -e "${GREEN}✔${NC} Finished audit in ${repo_name}"
    echo ""
  fi
done

echo -e "${GREEN}--- Audit Fix Complete ---${NC}"
