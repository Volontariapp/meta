get_ws_desc() {
  case "$1" in
    "01-Full-Galaxy.code-workspace") echo "The complete ecosystem (13 repositories)" ;;
    "02-Web-Flow.code-workspace") echo "Mobile + Gateway + Microservices (Standard flow)" ;;
    "03-Backend-Heavy.code-workspace") echo "Gateway + MS + Outboxes + Protos (Pure backend)" ;;
    "04-Lib-Architect.code-workspace") echo "NPM Packages + Outbox Runners + Protos (Library focus)" ;;
    "05-MS-Squad.code-workspace") echo "Only the 4 main NestJS microservices" ;;
    "06-DevOps-Control.code-workspace") echo "CI Tools + Deploy + Meta (Infrastructure)" ;;
    "07-Auth-Identity.code-workspace") echo "MS User + API Gateway + NPM Packages (Auth core)" ;;
    "08-Social-Network.code-workspace") echo "MS Social + Outbox Social + Proto (Social logic)" ;;
    "09-Content-Engine.code-workspace") echo "MS Post + Outbox Post + MS User (Feed & Media)" ;;
    "10-Event-Manager.code-workspace") echo "MS Event + Outbox Event + MS User (Volunteering)" ;;
    "11-Data-Bridges.code-workspace") echo "NPM Packages + Outbox Runners (DB interaction)" ;;
    "12-API-Contract.code-workspace") echo "Proto Registry + API Gateway (Interfaces)" ;;
    "13-Mobile-Design.code-workspace") echo "Nativapp + API Gateway (UI/UX Mobile)" ;;
    "14-Automation-Lab.code-workspace") echo "Meta Scripts + CI Tools (Internal tools)" ;;
    "15-Emergency-Deploy.code-workspace") echo "Deploy + CI Tools + Meta (Release management)" ;;
    "16-MS-Gateway-Libs.code-workspace") echo "MS + API Gateway + NPM Packages (Feature kit)" ;;
    "17-MS-Outbox-Libs.code-workspace") echo "MS + Outboxes + NPM Packages (Data flow focus)" ;;
    "18-Global-Backend-Dev.code-workspace") echo "The complete backend engine with libraries" ;;
    "19-User-Domain.code-workspace") echo "User MS + Gateway + NPM Packages (Domain focus)" ;;
    "20-Social-Domain.code-workspace") echo "Social MS + Gateway + NPM Packages + Proto" ;;
    "21-Post-Domain.code-workspace") echo "Post MS + Gateway + NPM Packages (Domain focus)" ;;
    "22-Event-Domain.code-workspace") echo "Event MS + Gateway + NPM Packages (Domain focus)" ;;
    *) echo "Custom workspace configuration" ;;
  esac
}

open_ide() {
  echo -e "\n  ${BOLD}${CYAN}Select IDE:${NC}"
  echo -e "  ${BOLD}1)${NC} Cursor"
  echo -e "  ${BOLD}2)${NC} VS Code"
  echo -e "  ${BOLD}3)${NC} IntelliJ (idea)"
  echo -e "  ${BOLD}4)${NC} Antigravity"
  read -rp "$(echo -e "  ${CYAN}▸${NC} Choice: ")" ide_choice
  case "${ide_choice}" in
    1) BIN="cursor"; CASK="cursor" ;;
    2) BIN="code"; CASK="visual-studio-code" ;;
    3) BIN="idea"; CASK="intellij-idea" ;;
    4) BIN="antigravity"; CASK="antigravity" ;;
    *) BIN="cursor"; CASK="cursor" ;;
  esac

  if ! command -v "$BIN" &> /dev/null; then
    if [ "$IS_MAC" = true ]; then
      read -rp "$(echo -e "${YELLOW}⚠ Command '${BIN}' missing. Install via Brew? (y/N): ${NC}")" install_choice
      if [[ $install_choice == [yY] ]]; then brew install --cask "$CASK"; else return 1; fi
    else
      echo -e "${RED}IDE not found.${NC}"; return 1
    fi
  fi

  echo -e "\n  ${BOLD}${CYAN}Select Workspace:${NC}"
  WORKSPACES=( $(ls .workspaces/*.code-workspace | sed 's|.workspaces/||' | sort) )
  for i in "${!WORKSPACES[@]}"; do
    WS_FILE="${WORKSPACES[$i]}"
    DESC=$(get_ws_desc "$WS_FILE")
    echo -e "  ${BOLD}$((i+1)))${NC} ${CYAN}${WS_FILE%.code-workspace}${NC} ${DIM}— ${DESC}${NC}"
  done
  echo -e "  ${BOLD}0)${NC} ${MAGENTA}✨ BUILD DYNAMIC WORKSPACE (Interactive)${NC}"
  read -rp "$(echo -e "  ${CYAN}▸${NC} Choice: ")" ws_choice
  if [ "$ws_choice" = "0" ]; then build_dynamic_workspace "$BIN"; return; fi
  SELECTED_WS="${WORKSPACES[$((ws_choice-1))]}"
  if [ -n "$SELECTED_WS" ]; then
    echo -e "\n${GREEN}🚀 Opening ${SELECTED_WS} in ${BIN}...${NC}"
    $BIN ".workspaces/${SELECTED_WS}"
  fi
}

build_dynamic_workspace() {
  local bin="$1"
  PROJECT_REPOS=("api-gateway" "ms-user" "ms-social" "ms-post" "ms-event" "nativapp" "npm-packages" "outbox-runners" "proto-registry" "ci-tools" "deploy" "changelog-checker")
  REPOS=()
  for repo in "${PROJECT_REPOS[@]}"; do
    if [ -d "${SCRIPT_DIR}/$repo" ]; then REPOS+=("$repo"); fi
  done

  local selected=()
  for i in "${!REPOS[@]}"; do selected+=(0); done
  local cursor=0
  
  printf "\n  ${BOLD}${MAGENTA}Select repositories (Arrows: Move, Space: Toggle, Enter: Done):${NC}\n"
  tput civis
  while true; do
    for i in "${!REPOS[@]}"; do
      if [ "$i" -eq "$cursor" ]; then prefix="${CYAN}▸${NC} "; else prefix="  "; fi
      if [ "${selected[$i]}" -eq 1 ]; then check="${GREEN}[x]${NC}"; else check="[ ]"; fi
      printf "${prefix}${check} ${REPOS[$i]}\033[K\n"
    done
    IFS= read -rsn1 key
    case "$key" in
      $'\x1b') read -rsn2 key
        case "$key" in
          '[A') ((cursor--)); [ $cursor -lt 0 ] && cursor=$((${#REPOS[@]}-1)) ;;
          '[B') ((cursor++)); [ $cursor -ge ${#REPOS[@]} ] && cursor=0 ;;
        esac ;;
      " ") if [ "${selected[$cursor]}" -eq 1 ]; then selected[$cursor]=0; else selected[$cursor]=1; fi ;;
      "") break ;;
    esac
    for ((i=0; i<${#REPOS[@]}; i++)); do printf "\033[A"; done
  done
  tput cnorm
  for ((i=0; i<${#REPOS[@]}; i++)); do printf "\n"; done

  # Generate workspace
  WS_FILE=".workspaces/dynamic-ws.code-workspace"
  echo "{\"folders\": [" > "$WS_FILE"
  FIRST=true
  for i in "${!REPOS[@]}"; do
    if [ "${selected[$i]}" -eq 1 ]; then
      REPO_NAME="${REPOS[$i]}"
      if [ "$FIRST" = true ]; then
        echo "{\"path\": \"../$REPO_NAME\"}" >> "$WS_FILE"
        FIRST=false
      else
        sed -i '' '$s/$/ ,/' "$WS_FILE" 2>/dev/null || sed -i '$s/$/ ,/' "$WS_FILE"
        echo "{\"path\": \"../$REPO_NAME\"}" >> "$WS_FILE"
      fi
    fi
  done
  
  # Inject Settings and Extensions
  echo "]," >> "$WS_FILE"
  echo "  \"settings\": {" >> "$WS_FILE"
  echo "    \"editor.defaultFormatter\": \"esbenp.prettier-vscode\"," >> "$WS_FILE"
  echo "    \"editor.formatOnSave\": true," >> "$WS_FILE"
  echo "    \"editor.formatOnPaste\": false," >> "$WS_FILE"
  echo "    \"editor.tabSize\": 2," >> "$WS_FILE"
  echo "    \"editor.insertSpaces\": true," >> "$WS_FILE"
  echo "    \"editor.detectIndentation\": false," >> "$WS_FILE"
  echo "    \"files.eol\": \"\\n\"," >> "$WS_FILE"
  echo "    \"files.trimTrailingWhitespace\": true," >> "$WS_FILE"
  echo "    \"files.insertFinalNewline\": true," >> "$WS_FILE"
  echo "    \"eslint.enable\": true," >> "$WS_FILE"
  echo "    \"eslint.useFlatConfig\": true," >> "$WS_FILE"
  echo "    \"search.exclude\": { \"**/node_modules\": true, \"**/dist\": true, \"**/.yarn\": true }," >> "$WS_FILE"
  echo "    \"protoc.options\": [\"--proto_path=proto-registry/proto\"]," >> "$WS_FILE"
  echo "    \"proto3.lint.enable\": false" >> "$WS_FILE"
  echo "  }," >> "$WS_FILE"
  echo "  \"extensions\": {" >> "$WS_FILE"
  echo "    \"recommendations\": [" >> "$WS_FILE"
  echo "      \"esbenp.prettier-vscode\"," >> "$WS_FILE"
  echo "      \"dbaeumer.vscode-eslint\"," >> "$WS_FILE"
  echo "      \"ms-vscode.vscode-typescript-next\"," >> "$WS_FILE"
  echo "      \"firsttris.vscode-jest-runner\"," >> "$WS_FILE"
  echo "      \"EditorConfig.EditorConfig\"," >> "$WS_FILE"
  echo "      \"bufbuild.vscode-buf\"" >> "$WS_FILE"
  echo "    ]" >> "$WS_FILE"
  echo "  }" >> "$WS_FILE"
  echo "}" >> "$WS_FILE"
  
  $bin "$WS_FILE"
}
