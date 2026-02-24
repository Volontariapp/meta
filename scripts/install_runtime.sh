#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

REQUIRED_NODE="24.14.0"
REQUIRED_NODE_MAJOR=24
REQUIRED_NODE_MINOR=14

OS="$(uname -s)"

echo -e "${BLUE}--- Runtime Setup ---${NC}"

detect_pkg_manager() {
  if command -v brew &> /dev/null; then
    echo "brew"
  elif command -v apt-get &> /dev/null; then
    echo "apt"
  elif command -v dnf &> /dev/null; then
    echo "dnf"
  elif command -v pacman &> /dev/null; then
    echo "pacman"
  else
    echo "none"
  fi
}

install_pkg() {
  local name="$1"
  local pkg_mgr
  pkg_mgr=$(detect_pkg_manager)

  case "${pkg_mgr}" in
    brew)   brew install "${name}" ;;
    apt)    sudo apt-get install -y "${name}" ;;
    dnf)    sudo dnf install -y "${name}" ;;
    pacman) sudo pacman -S --noconfirm "${name}" ;;
    none)
      echo -e "${RED}✖ No supported package manager found. Install ${name} manually.${NC}"
      return 1
      ;;
  esac
}

ensure_curl() {
  if ! command -v curl &> /dev/null; then
    echo -e "${YELLOW}⚠  curl not found. Installing...${NC}"
    install_pkg "curl"
  fi
}

ensure_curl

install_fnm() {
  if [[ "${OS}" == "Darwin" ]] && command -v brew &> /dev/null; then
    brew install fnm
  else
    curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell
    export PATH="${HOME}/.local/share/fnm:${PATH}"
  fi
  eval "$(fnm env)"
}

install_node() {
  if command -v fnm &> /dev/null; then
    echo -e "${BLUE}  Installing Node.js ${REQUIRED_NODE} via fnm...${NC}"
    fnm install "${REQUIRED_NODE}"
    fnm use "${REQUIRED_NODE}"
  elif command -v nvm &> /dev/null; then
    echo -e "${BLUE}  Installing Node.js ${REQUIRED_NODE} via nvm...${NC}"
    nvm install "${REQUIRED_NODE}"
    nvm use "${REQUIRED_NODE}"
  else
    echo -e "${YELLOW}  No Node version manager found. Installing fnm...${NC}"
    install_fnm
    fnm install "${REQUIRED_NODE}"
    fnm use "${REQUIRED_NODE}"
  fi
}

if command -v node &> /dev/null; then
  CURRENT_NODE_VERSION=$(node -v | sed 's/v//')
  CURRENT_MAJOR=$(echo "${CURRENT_NODE_VERSION}" | cut -d. -f1)
  CURRENT_MINOR=$(echo "${CURRENT_NODE_VERSION}" | cut -d. -f2)

  if [ "${CURRENT_MAJOR}" -lt "${REQUIRED_NODE_MAJOR}" ] || \
     ([ "${CURRENT_MAJOR}" -eq "${REQUIRED_NODE_MAJOR}" ] && [ "${CURRENT_MINOR}" -lt "${REQUIRED_NODE_MINOR}" ]); then
    echo -e "${YELLOW}⚠  Node.js v${CURRENT_NODE_VERSION} found, need >= ${REQUIRED_NODE}${NC}"
    install_node
  else
    echo -e "${GREEN}✔${NC} Node.js v${CURRENT_NODE_VERSION}"
  fi
else
  echo -e "${YELLOW}⚠  Node.js not found.${NC}"
  install_node
fi

echo -e "${BLUE}  Enabling corepack...${NC}"
corepack enable 2>/dev/null || true
echo -e "${GREEN}✔${NC} Corepack enabled"

if command -v yarn &> /dev/null; then
  YARN_VERSION=$(yarn --version 2>/dev/null || echo "0")
  YARN_MAJOR=$(echo "${YARN_VERSION}" | cut -d. -f1)
  if [ "${YARN_MAJOR}" -ge 4 ]; then
    echo -e "${GREEN}✔${NC} Yarn ${YARN_VERSION}"
  else
    echo -e "${YELLOW}⚠  Yarn ${YARN_VERSION} found, upgrading to 4.x...${NC}"
    corepack prepare yarn@4.12.0 --activate
    echo -e "${GREEN}✔${NC} Yarn $(yarn --version)"
  fi
else
  echo -e "${YELLOW}⚠  Yarn not found. Installing via corepack...${NC}"
  corepack prepare yarn@4.12.0 --activate
  echo -e "${GREEN}✔${NC} Yarn $(yarn --version)"
fi

echo -e "${GREEN}--- Runtime ready ---${NC}"
