#!/usr/bin/env bash
set -euo pipefail

# --- Configuration & Colors ---
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'
DIM='\033[2m'

# --- Arguments ---
ENV="${1:-local}"

# --- Services List ---
SERVICES=("user" "social" "post" "event")

# --- Selection System (Interactive) ---
printf "\n  ${BOLD}${MAGENTA}Select Microservices to run migrations (${ENV}):${NC}\n"
printf "  ${DIM}(Arrows: Move, Space: Toggle, Enter: Done)${NC}\n\n"

selected=()
for i in "${!SERVICES[@]}"; do selected+=(0); done
cursor=0

# Hide cursor
tput civis

while true; do
  for i in "${!SERVICES[@]}"; do
    if [ "$i" -eq "$cursor" ]; then prefix="${CYAN}▸${NC} "; else prefix="  "; fi
    if [ "${selected[$i]}" -eq 1 ]; then check="${GREEN}[x]${NC}"; else check="[ ]"; fi
    printf "${prefix}${check} ms-${SERVICES[$i]}\033[K\n"
  done

  IFS= read -rsn1 key
  case "$key" in
    $'\x1b') 
      read -rsn2 key
      case "$key" in
        '[A') ((cursor--)); [ $cursor -lt 0 ] && cursor=$((${#SERVICES[@]}-1)) ;;
        '[B') ((cursor++)); [ $cursor -ge ${#SERVICES[@]} ] && cursor=0 ;;
      esac ;;
    " ") 
      if [ "${selected[$cursor]}" -eq 1 ]; then selected[$cursor]=0; else selected[$cursor]=1; fi ;;
    "") 
      break ;;
  esac

  for ((i=0; i<${#SERVICES[@]}; i++)); do printf "\033[A"; done
done

# Show cursor
tput cnorm

for ((i=0; i<${#SERVICES[@]}; i++)); do printf "\n"; done
printf "\n"

# --- Processing ---
for i in "${!SERVICES[@]}"; do
  if [ "${selected[$i]}" -eq 1 ]; then
    SERVICE_NAME="ms-${SERVICES[$i]}"
    echo -e "${BOLD}${CYAN}━━━ Running Migrations: ${SERVICE_NAME} (${ENV}) ━━━${NC}"
    
    if [ -d "$SERVICE_NAME" ]; then
      (cd "$SERVICE_NAME" && yarn migration:run:${ENV}) || echo -e "${RED}✖ Failed to run migrations for ${SERVICE_NAME}${NC}"
    else
      echo -e "${RED}✖ Directory ${SERVICE_NAME} not found!${NC}"
    fi
    printf "\n"
  fi
done

echo -e "${BOLD}${GREEN}Done!${NC}\n"
