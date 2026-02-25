#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${SCRIPT_DIR}/scripts"

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'

show_menu() {
  echo -e "${BOLD}${CYAN}"
  echo "╔══════════════════════════════════════════════╗"
  echo "║          Volontariapp — Command Center       ║"
  echo "╚══════════════════════════════════════════════╝"
  echo -e "${NC}"
  echo -e "  ${BOLD}${CYAN}Setup${NC}"
  echo -e "  ${BOLD}1)${NC}  🚀  Full Setup          ${DIM}— Install runtime, apps, shell & repos${NC}"
  echo -e "  ${BOLD}2)${NC}  ⚙️   Install Runtime     ${DIM}— Node.js 24.14.0 + Yarn 4${NC}"
  echo -e "  ${BOLD}3)${NC}  🖥   Install Apps        ${DIM}— Rancher, Cursor, VS Code, Postman...${NC}"
  echo -e "  ${BOLD}4)${NC}  🐚  Shell Setup          ${DIM}— Oh My Zsh + plugins${NC}"
  echo -e "  ${BOLD}5)${NC}  📦  Init Repositories    ${DIM}— Clone repos, SSH remotes & deps${NC}"
  echo -e "  ${BOLD}6)${NC}  🔄  Sync Repositories    ${DIM}— Fetch & rebase all repos${NC}"
  echo -e "  ${BOLD}7)${NC}  🧱  NPM Packages Setup   ${DIM}— Install shared packages workspace${NC}"
  echo -e "  ${BOLD}8)${NC}  ➕  Create Package        ${DIM}— Scaffold a new shared package${NC}"
  echo -e "  ${BOLD}9)${NC}  🛡️   Audit & Fix          ${DIM}— Check and fix vulnerabilities cross-repo${NC}"
  echo ""
  echo -e "  ${BOLD}${CYAN}Development (Turbo)${NC}"
  echo -e "  ${BOLD}10)${NC} ⚡  Dev All             ${DIM}— Backend + Mobile app${NC}"
  echo -e "  ${BOLD}11)${NC} 🌐  Dev Backend          ${DIM}— Gateway + all microservices${NC}"
  echo -e "  ${BOLD}12)${NC} 🔌  Dev Microservices    ${DIM}— ms-user + ms-event only${NC}"
  echo -e "  ${BOLD}13)${NC} 📱  Dev Mobile           ${DIM}— Expo dev server (nativapp)${NC}"
  echo ""
  echo -e "  ${BOLD}0)${NC}  ❌  Exit"
  echo ""
}

run_script() {
  local script="$1"
  local label="$2"

  echo ""
  echo -e "${BLUE}━━━ Running: ${BOLD}${label}${NC}${BLUE} ━━━${NC}"
  echo ""

  if [ -f "${script}" ]; then
    bash "${script}"
  else
    echo -e "\033[0;31m✖ Script not found: ${script}\033[0m"
    return 1
  fi

  echo ""
  echo -e "${GREEN}━━━ Done: ${label} ━━━${NC}"
  echo ""
}

while true; do
  show_menu
  read -rp "$(echo -e "${CYAN}▸${NC} Pick an option: ")" choice

  case "${choice}" in
    1) run_script "${SCRIPTS_DIR}/setup.sh" "Full Setup" ;;
    2) run_script "${SCRIPTS_DIR}/install_runtime.sh" "Install Runtime" ;;
    3) run_script "${SCRIPTS_DIR}/install_apps.sh" "Install Apps" ;;
    4) run_script "${SCRIPTS_DIR}/install_shell.sh" "Shell Setup" ;;
    5) run_script "${SCRIPTS_DIR}/init_repos.sh" "Init Repositories" ;;
    6) run_script "${SCRIPTS_DIR}/sync-repos.sh" "Sync Repositories" ;;
    7) run_script "${SCRIPT_DIR}/npm-packages/scripts/setup.sh" "NPM Packages Setup" ;;
    8) run_script "${SCRIPT_DIR}/npm-packages/scripts/create-package.sh" "Create Package" ;;
    9) run_script "${SCRIPTS_DIR}/audit_fix.sh" "Audit & Fix vulnerabilities" ;;
    10)
      echo -e "\n${BLUE}━━━ Running: ${BOLD}Dev All${NC}${BLUE} ━━━${NC}\n"
      (cd "${SCRIPT_DIR}" && yarn dev)
      ;;
    11)
      echo -e "\n${BLUE}━━━ Running: ${BOLD}Dev Backend${NC}${BLUE} ━━━${NC}\n"
      (cd "${SCRIPT_DIR}" && yarn dev:backend)
      ;;
    12)
      echo -e "\n${BLUE}━━━ Running: ${BOLD}Dev Microservices${NC}${BLUE} ━━━${NC}\n"
      (cd "${SCRIPT_DIR}" && yarn dev:services)
      ;;
    13)
      echo -e "\n${BLUE}━━━ Running: ${BOLD}Dev Mobile${NC}${BLUE} ━━━${NC}\n"
      (cd "${SCRIPT_DIR}" && yarn dev:mobile)
      ;;
    0)
      echo -e "\n${DIM}Bye!${NC}\n"
      exit 0
      ;;
    *)
      echo -e "\n\033[0;31m  Invalid option. Try again.\033[0m\n"
      ;;
  esac

  read -rp "$(echo -e "${DIM}Press Enter to return to menu...${NC}")"
done
