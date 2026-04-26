get_env_color() {
  case "${CURRENT_ENV}" in
    local) echo -e "${GREEN}" ;;
    dev) echo -e "${CYAN}" ;;
    test) echo -e "${YELLOW}" ;;
    prod) echo -e "${RED}" ;;
    *) echo -e "${NC}" ;;
  esac
}

run_script() {
  local script="$1"
  local label="$2"
  echo -e "\n${BLUE}━━━ Running: ${BOLD}${label}${NC}${BLUE} ━━━${NC}\n"
  if [ -f "${script}" ]; then
    chmod +x "${script}"
    bash "${script}"
  else
    echo -e "\033[0;31m✖ Script not found: ${script}\033[0m"
    return 1
  fi
  echo -e "\n${GREEN}━━━ Done: ${label} ━━━${NC}\n"
}
