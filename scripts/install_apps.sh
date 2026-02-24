#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
DIM='\033[2m'
NC='\033[0m'

echo -e "${BLUE}--- Developer Tools ---${NC}"

if ! command -v brew &> /dev/null; then
  echo -e "${YELLOW}⚠  Homebrew required. Run install_runtime.sh first.${NC}"
  exit 1
fi

declare -a APP_NAMES=(
  "Rancher Desktop"
  "Cursor"
  "Visual Studio Code"
  "Postico 2"
  "Redis Insight"
  "Postman"
  "Antigravity"
)

declare -a APP_CASKS=(
  "rancher"
  "cursor"
  "visual-studio-code"
  "postico"
  "redisinsight"
  "postman"
  "antigravity"
)

install_app() {
  local name="$1"
  local cask="$2"

  if brew list --cask "${cask}" &> /dev/null; then
    echo -e "  ${GREEN}✔${NC} ${name} ${DIM}(already installed)${NC}"
    return
  fi

  read -rp "  Install ${name}? [y/N] " answer
  if [[ "${answer}" =~ ^[Yy]$ ]]; then
    if brew install --cask "${cask}" 2>/dev/null; then
      echo -e "  ${GREEN}✔${NC} ${name} installed"
    else
      echo -e "  ${YELLOW}⚠  ${name} not available via Homebrew. Install manually.${NC}"
    fi
  else
    echo -e "  ${DIM}⏭  ${name} skipped${NC}"
  fi
}

for i in "${!APP_NAMES[@]}"; do
  install_app "${APP_NAMES[$i]}" "${APP_CASKS[$i]}"
done

echo -e "${GREEN}--- Developer tools done ---${NC}"
