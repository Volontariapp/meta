change_env() {
  echo -e "\n  ${BOLD}${CYAN}Select New Environment:${NC}"
  echo -e "  ${BOLD}1)${NC} local"
  echo -e "  ${BOLD}2)${NC} development"
  echo -e "  ${BOLD}3)${NC} test"
  echo -e "  ${BOLD}4)${NC} production"
  read -rp "$(echo -e "  ${CYAN}▸${NC} Choice: ")" env_choice
  case "${env_choice}" in
    1) CURRENT_ENV="local" ;;
    2) CURRENT_ENV="dev" ;;
    3) CURRENT_ENV="test" ;;
    4) CURRENT_ENV="prod" ;;
    *) echo -e "${RED}Invalid choice.${NC}" ;;
  esac
}
