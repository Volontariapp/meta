#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
DIM='\033[2m'
NC='\033[0m'

OS="$(uname -s)"

echo -e "${BLUE}--- Developer Tools ---${NC}"

is_installed_mac() {
  local cask="$1"
  brew list --cask "${cask}" &> /dev/null 2>&1
}

is_installed_linux() {
  local binary="$1"
  command -v "${binary}" &> /dev/null || \
    (command -v snap &> /dev/null && snap list 2>/dev/null | grep -q "^${binary} ") || \
    (command -v flatpak &> /dev/null && flatpak list 2>/dev/null | grep -qi "${binary}")
}

install_mac() {
  local name="$1"
  local cask="$2"

  if is_installed_mac "${cask}"; then
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

install_linux() {
  local name="$1"
  local snap_name="$2"
  local apt_name="$3"
  local binary_check="$4"

  if is_installed_linux "${binary_check}"; then
    echo -e "  ${GREEN}✔${NC} ${name} ${DIM}(already installed)${NC}"
    return
  fi

  read -rp "  Install ${name}? [y/N] " answer
  if [[ "${answer}" =~ ^[Yy]$ ]]; then
    if [ -n "${snap_name}" ] && command -v snap &> /dev/null; then
      if sudo snap install "${snap_name}" --classic 2>/dev/null; then
        echo -e "  ${GREEN}✔${NC} ${name} installed via snap"
        return
      fi
    fi

    if [ -n "${apt_name}" ] && command -v apt-get &> /dev/null; then
      if sudo apt-get install -y "${apt_name}" 2>/dev/null; then
        echo -e "  ${GREEN}✔${NC} ${name} installed via apt"
        return
      fi
    fi

    echo -e "  ${YELLOW}⚠  ${name} could not be auto-installed. Install manually.${NC}"
  else
    echo -e "  ${DIM}⏭  ${name} skipped${NC}"
  fi
}

install_cli_tool() {
  local name="$1"
  local binary="$2"
  local brew_formula="$3"
  local apt_name="$4"

  if command -v "${binary}" &> /dev/null; then
    echo -e "  ${GREEN}✔${NC} ${name} ${DIM}(already installed)${NC}"
    return
  fi

  read -rp "  Install ${name}? [y/N] " answer
  if [[ "${answer}" =~ ^[Yy]$ ]]; then
    if [[ "${OS}" == "Darwin" ]]; then
      if brew install "${brew_formula}" 2>/dev/null; then
        echo -e "  ${GREEN}✔${NC} ${name} installed"
      else
        echo -e "  ${YELLOW}⚠  ${name} could not be installed via Homebrew.${NC}"
      fi
    else
      if [ -n "${apt_name}" ] && command -v apt-get &> /dev/null; then
        if sudo apt-get install -y "${apt_name}" 2>/dev/null; then
          echo -e "  ${GREEN}✔${NC} ${name} installed via apt"
          return
        fi
      fi
      echo -e "  ${YELLOW}⚠  ${name} could not be auto-installed. Install manually.${NC}"
    fi
  else
    echo -e "  ${DIM}⏭  ${name} skipped${NC}"
  fi
}

if [[ "${OS}" == "Darwin" ]]; then
  if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}⚠  Homebrew required on macOS. Run install_runtime.sh first.${NC}"
    exit 1
  fi

  declare -a APP_NAMES=("Rancher Desktop" "Cursor" "Visual Studio Code" "Postico 2" "Redis Insight" "Postman" "Antigravity")
  declare -a APP_CASKS=("rancher" "cursor" "visual-studio-code" "postico" "redisinsight" "postman" "antigravity")

  for i in "${!APP_NAMES[@]}"; do
    install_mac "${APP_NAMES[$i]}" "${APP_CASKS[$i]}"
  done

else
  declare -a LINUX_NAMES=("Rancher Desktop" "Cursor" "Visual Studio Code" "Redis Insight" "Postman")
  declare -a LINUX_SNAPS=("rancher-desktop" "" "code" "redisinsight" "postman")
  declare -a LINUX_APTS=("" "" "code" "" "")
  declare -a LINUX_BINS=("rancher-desktop" "cursor" "code" "redisinsight" "postman")

  echo -e "${DIM}  Detected Linux/WSL — using snap/apt${NC}"
  echo ""

  for i in "${!LINUX_NAMES[@]}"; do
    install_linux "${LINUX_NAMES[$i]}" "${LINUX_SNAPS[$i]}" "${LINUX_APTS[$i]}" "${LINUX_BINS[$i]}"
  done

  echo -e "  ${DIM}ℹ  Postico 2 is macOS-only (skipped on Linux)${NC}"
fi

echo ""
echo -e "${BLUE}--- CLI Tools ---${NC}"
install_cli_tool "GitHub CLI" "gh" "gh" "gh"

echo -e "${GREEN}--- Developer tools done ---${NC}"
