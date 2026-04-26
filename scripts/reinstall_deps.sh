#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}--- Reinstalling all dependencies (Multi-Repo mode) ---${NC}"

echo -e "  🧹 Cleaning root..."
rm -rf "${ROOT_DIR}/node_modules" "${ROOT_DIR}/yarn.lock"

REPOS=(
  "api-gateway"
  "ms-event"
  "ms-post"
  "ms-social"
  "ms-user"
  "nativapp"
  "npm-packages"
  "outbox-runners/outbox-user"
  "outbox-runners/outbox-social"
  "outbox-runners/outbox-post"
  "outbox-runners/outbox-event"
)

for repo in "${REPOS[@]}"; do
  dir="${ROOT_DIR}/${repo}"
  if [ -d "${dir}" ] && [ -f "${dir}/package.json" ]; then
    echo -e "  📦 Processing ${BLUE}${repo}${NC}..."
    (
      cd "${dir}"
      echo -e "    🗑️  Removing node_modules and lockfile..."
      rm -rf node_modules yarn.lock dist .turbo
      echo -e "    📌 Ensuring local lockfile exists..."
      touch yarn.lock
      echo -e "    📥 Installing dependencies..."
      yarn install
    )
  fi
done

echo -e "${GREEN}--- All dependencies reinstalled successfully ---${NC}"
