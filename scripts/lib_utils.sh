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
  local script_with_args="$1"
  local label="$2"
  local script_path="${script_with_args%% *}"
  echo -e "\n${BLUE}━━━ Running: ${BOLD}${label}${NC}${BLUE} ━━━${NC}\n"
  if [ -f "${script_path}" ]; then
    chmod +x "${script_path}"
    bash ${script_with_args}
  else
    echo -e "\033[0;31m✖ Script not found: ${script_path}\033[0m"
    return 1
  fi
  echo -e "\n${GREEN}━━━ Done: ${label} ━━━${NC}\n"
}
