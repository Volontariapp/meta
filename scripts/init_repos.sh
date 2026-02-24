#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

ORG_SSH="git@github.com:Volontariapp"

echo -e "${BLUE}--- Repository Initialization ---${NC}"

(cd "${ROOT_DIR}" && git remote set-url origin "${ORG_SSH}/meta.git" 2>/dev/null || true)
echo -e "${GREEN}✔${NC} Meta remote set to SSH"

echo -e "${BLUE}  Updating submodules...${NC}"
(cd "${ROOT_DIR}" && git submodule update --init --recursive)
echo -e "${GREEN}✔${NC} Submodules initialized"

for dir in "${ROOT_DIR}"/*/; do
  if [ -d "${dir}" ] && ([ -d "${dir}.git" ] || [ -f "${dir}.git" ]); then
    repo_name=$(basename "${dir}")
    echo -e "  🔧 Configuring ${BLUE}${repo_name}${NC}..."

    (cd "${dir}" && git remote set-url origin "${ORG_SSH}/${repo_name}.git" 2>/dev/null || true)

    if [ -d "${dir}ci-tools" ]; then
      (cd "${dir}ci-tools" && git remote set-url origin "${ORG_SSH}/ci-tools.git" 2>/dev/null || true)
    fi

    if [ -f "${dir}package.json" ]; then
      if [ ! -f "${dir}yarn.lock" ]; then
        touch "${dir}yarn.lock"
      fi
      if [ ! -f "${dir}.yarnrc.yml" ]; then
        echo "nodeLinker: node-modules" > "${dir}.yarnrc.yml"
      fi
      echo -e "    📦 Installing dependencies for ${BLUE}${repo_name}${NC}..."
      (cd "${dir}" && yarn install 2>/dev/null || npm install 2>/dev/null || true)
    fi
  fi
done

(cd "${ROOT_DIR}" && git config submodule.recurse true)
(cd "${ROOT_DIR}" && git submodule foreach git checkout main 2>/dev/null || true)

echo -e "${GREEN}--- Repositories ready ---${NC}"
