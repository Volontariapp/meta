#!/usr/bin/env bash
set -euo pipefail

# --- Configuration & Paths ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${SCRIPT_DIR}/scripts"
cd "${SCRIPT_DIR}"

# --- OS Detection ---
IS_MAC=false
IS_WSL=false
if [[ "$OSTYPE" == "darwin"* ]]; then
  IS_MAC=true
elif grep -q Microsoft /proc/version 2>/dev/null; then
  IS_WSL=true
fi

# --- State ---
CURRENT_ENV="local"

# --- Colors ---
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
MAGENTA='\033[0;35m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

# --- Load Sub-Scripts ---
source "${SCRIPTS_DIR}/lib_utils.sh"
source "${SCRIPTS_DIR}/menu_ui.sh"
source "${SCRIPTS_DIR}/env_manager.sh"
source "${SCRIPTS_DIR}/ide_manager.sh"

# --- Main Application Loop ---
while true; do
  show_menu
  read -rp "$(echo -e "${CYAN}▸${NC} Pick an option: ")" choice

  case "${choice}" in
    # --- Setup & Configuration ---
    1)  run_script "${SCRIPTS_DIR}/setup.sh" "Full Setup" ;;
    2)  run_script "${SCRIPTS_DIR}/install_runtime.sh" "Install Runtime" ;;
    3)  run_script "${SCRIPTS_DIR}/install_apps.sh" "Install Apps" ;;
    4)  run_script "${SCRIPTS_DIR}/install_shell.sh" "Shell Setup" ;;
    5)  run_script "${SCRIPTS_DIR}/init_repos.sh" "Init Repositories" ;;
    6)  run_script "${SCRIPTS_DIR}/sync-repos.sh" "Sync Repositories" ;;
    7)  run_script "${SCRIPTS_DIR}/gen_certs.sh" "Generate Certificates" ;;
    8)  run_script "${SCRIPT_DIR}/npm-packages/scripts/setup.sh" "NPM Packages Setup" ;;
    9)  run_script "${SCRIPT_DIR}/npm-packages/scripts/create-package.sh" "Create Package" ;;
    10) run_script "${SCRIPTS_DIR}/reinstall_deps.sh" "Reinstall All Dependencies" ;;

    # --- Development (Turbo) ---
    11) echo -e "\n${BLUE}━━━ Running: ${BOLD}Dev All (${CURRENT_ENV})${NC}${BLUE} ━━━${NC}\n"
        yarn start:${CURRENT_ENV} ;;
    
    12) echo -e "\n${BLUE}━━━ Running: ${BOLD}Dev All (No Outbox) (${CURRENT_ENV})${NC}${BLUE} ━━━${NC}\n"
        yarn start:${CURRENT_ENV}:no-outbox ;;
    
    13) echo -e "\n${BLUE}━━━ Running: ${BOLD}Dev Backend (${CURRENT_ENV})${NC}${BLUE} ━━━${NC}\n"
        yarn start:${CURRENT_ENV}:backend ;;

    14) echo -e "\n${BLUE}━━━ Running: ${BOLD}Dev Backend Core (${CURRENT_ENV})${NC}${BLUE} ━━━${NC}\n"
        yarn start:${CURRENT_ENV}:backend-core ;;
    
    15) echo -e "\n${BLUE}━━━ Running: ${BOLD}Dev Microservices (${CURRENT_ENV})${NC}${BLUE} ━━━${NC}\n"
        yarn start:${CURRENT_ENV}:services ;;
    
    16) echo -e "\n${BLUE}━━━ Running: ${BOLD}Dev Mobile${NC}${BLUE} ━━━${NC}\n"
        (cd nativapp && yarn dev) ;;
    
    17) run_script "${SCRIPTS_DIR}/add_package.sh" "Add NPM Package" ;;
    
    18) echo -e "\n${BLUE}━━━ Running: ${BOLD}Nexus All${NC}${BLUE} ━━━${NC}\n"
        npx concurrently -k -p '[{name}]' -n gateway,user,post,event,social,mobile,pkgs -c blue,green,cyan,yellow,red,magenta,white \
          "cd api-gateway && npx -y gitnexus serve --port 4747" \
          "cd ms-user && npx -y gitnexus serve --port 4748" \
          "cd ms-post && npx -y gitnexus serve --port 4749" \
          "cd ms-event && npx -y gitnexus serve --port 4750" \
          "cd ms-social && npx -y gitnexus serve --port 4753" \
          "cd nativapp && npx -y gitnexus serve --port 4751" \
          "cd npm-packages && npx -y gitnexus serve --port 4752" ;;

    # --- Database & Utilities ---
    19) run_script "${SCRIPT_DIR}/sync-migrations.sh" "Sync Migrations" ;;
    20) run_script "${SCRIPTS_DIR}/run_migrations.sh ${CURRENT_ENV}" "Run Migrations (${CURRENT_ENV})" ;;
    21) run_script "${SCRIPTS_DIR}/audit_fix.sh" "Audit & Fix" ;;
    22) run_script "${SCRIPTS_DIR}/fix_all_peers.sh" "Fix Peer Deps" ;;
    23) run_script "${SCRIPTS_DIR}/bump_dependencies_all.sh" "Bump Dependencies" ;;
    
    # --- Outbox Runners ---
    24) echo -e "\n${BLUE}━━━ Running: ${BOLD}Dev Outbox All (${CURRENT_ENV})${NC}${BLUE} ━━━${NC}\n"
        yarn start:${CURRENT_ENV}:outbox ;;
    
    25) echo -e "\n  ${BOLD}${CYAN}Select Outbox:${NC}"
        REPOS=( $(find ../outbox-runners -maxdepth 1 -type d -name "outbox-*" | sed 's|../outbox-runners/||' | sort) )
        for i in "${!REPOS[@]}"; do echo -e "  ${BOLD}$((i+1)))${NC} ${REPOS[$i]}"; done
        read -rp "$(echo -e "  ${CYAN}▸${NC} Choice: ")" outbox_choice
        TARGET="${REPOS[$((outbox_choice-1))]}"
        yarn run-outbox "${TARGET#outbox-}" "start:${CURRENT_ENV}" ;;
    
    # --- Settings & Tools ---
    26) run_script "${SCRIPTS_DIR}/auto_rebase_all.sh" "Auto-Rebase All" ;;
    27) change_env ;;
    28) open_ide ;;
    
    0) echo -e "\n${DIM}Bye!${NC}\n"; exit 0 ;;
    *) echo -e "\n\033[0;31m  Invalid option. Try again.\033[0m\n" ;;
  esac

  read -rp "$(echo -e "${DIM}Press Enter to return to menu...${NC}")"
done
