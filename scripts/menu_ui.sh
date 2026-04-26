show_menu() {
  clear
  ENV_COLOR=$(get_env_color)
  echo -e "${BOLD}${CYAN}"
  echo "╔══════════════════════════════════════════════════════════╗"
  echo -e "║          Volontariapp — Command Center (env: ${ENV_COLOR}${CURRENT_ENV}${CYAN}${BOLD})          ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  
  echo -e "  ${BOLD}${CYAN}Setup & Configuration${NC}"
  echo -e "  ${BOLD}1)${NC}  🚀  Full Setup          ${DIM}— Install runtime, apps, shell & repos${NC}"
  echo -e "  ${BOLD}2)${NC}  ⚙️  Install Runtime     ${DIM}— Node.js 24.14.0 + Yarn 4${NC}"
  echo -e "  ${BOLD}3)${NC}  🖥  Install Apps        ${DIM}— Apps setup (Rancher, Cursor...)${NC}"
  echo -e "  ${BOLD}4)${NC}  🐚  Shell Setup         ${DIM}— Oh My Zsh + plugins${NC}"
  echo -e "  ${BOLD}5)${NC}  📦  Init Repositories   ${DIM}— Clone repos, SSH remotes & deps${NC}"
  echo -e "  ${BOLD}6)${NC}  🔄  Sync Repositories   ${DIM}— Fetch & rebase all repos${NC}"
  echo -e "  ${BOLD}7)${NC}  🧱  NPM Packages Setup  ${DIM}— Install shared packages workspace${NC}"
  echo -e "  ${BOLD}8)${NC}  ➕  Create Package      ${DIM}— Scaffold a new shared package${NC}"
  echo -e "  ${BOLD}9)${NC}  🧹  Reinstall All Deps   ${DIM}— Clear node_modules & reinstall${NC}"

  echo -e "\n  ${BOLD}${CYAN}Development (Turbo)${NC}"
  echo -e "  ${BOLD}10)${NC} 🔥  Dev All            ${DIM}— Backend + Mobile + Outboxes${NC}"
  echo -e "  ${BOLD}11)${NC} ⚡  Dev All (No Outbox) ${DIM}— Backend + Mobile only${NC}"
  echo -e "  ${BOLD}12)${NC} 🌐  Dev Backend        ${DIM}— Gateway + MS + Outboxes${NC}"
  echo -e "  ${BOLD}13)${NC} 🏛️  Dev Backend Core   ${DIM}— Gateway + MS (No Outbox, No Front)${NC}"
  echo -e "  ${BOLD}14)${NC} 🔌  Dev Microservices  ${DIM}— All ms-* only${NC}"
  echo -e "  ${BOLD}15)${NC} 📱  Dev Mobile         ${DIM}— Expo dev server (nativapp)${NC}"
  echo -e "  ${BOLD}16)${NC} 📦  Add NPM Package    ${DIM}— Install shared packages in services${NC}"
  echo -e "  ${BOLD}17)${NC} 🧠  Nexus All            ${DIM}— Launch all GitNexus servers${NC}"

  echo -e "\n  ${BOLD}${CYAN}Database & Utilities${NC}"
  echo -e "  ${BOLD}18)${NC} 🛠️  Sync Migrations      ${DIM}— Sync MS migrations to Domain packages${NC}"
  echo -e "  ${BOLD}19)${NC} 🚀  Run Migrations       ${DIM}— Run migrations in selected MS${NC}"
  echo -e "  ${BOLD}20)${NC} 🛡️   Audit & Fix        ${DIM}— Check and fix vulnerabilities${NC}"
  echo -e "  ${BOLD}21)${NC} 🧬  Fix Peer Deps       ${DIM}— Resolve Yarn peer warnings${NC}"
  echo -e "  ${BOLD}22)${NC} 🔼  Bump Dependencies    ${DIM}— Update @volontariapp deps${NC}"

  echo -e "\n  ${BOLD}${CYAN}Outbox Runners${NC}"
  echo -e "  ${BOLD}23)${NC} 📬  Dev Outbox All     ${DIM}— Run all outbox runners${NC}"
  echo -e "  ${BOLD}24)${NC} 🎯  Run Specific Outbox ${DIM}— Pick one specific runner${NC}"

  echo -e "\n  ${BOLD}${YELLOW}Settings & Tools${NC}"
  echo -e "  ${BOLD}25)${NC} 🔄  Auto-Rebase All      ${DIM}— Safe merge main & restore stash${NC}"
  echo -e "  ${BOLD}26)${NC} 🌍  Change Environment ${DIM}— Currently: ${ENV_COLOR}${CURRENT_ENV}${NC}"
  echo -e "  ${BOLD}27)${NC} 🖥   Dev IDE            ${DIM}— Open custom workspace (Cursor/VSCode)${NC}"

  echo -e "\n  ${BOLD}0)${NC}  ❌  Exit\n"
}
