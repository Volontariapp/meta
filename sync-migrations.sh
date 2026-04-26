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

# --- Services List ---
SERVICES=("user" "social" "post" "event")

# --- Selection System (Interactive) ---
printf "\n  ${BOLD}${MAGENTA}Select Microservices to sync migrations:${NC}\n"
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

  # Read key (handling escape sequences for arrows)
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

  # Move cursor back up for redraw
  for ((i=0; i<${#SERVICES[@]}; i++)); do printf "\033[A"; done
done

# Show cursor
tput cnorm

# Move past the menu
for ((i=0; i<${#SERVICES[@]}; i++)); do printf "\n"; done
printf "\n"

# --- Dependency Check ---
if ! command -v rsync &> /dev/null; then
  echo -e "${RED}✖ Error: rsync is required but not installed.${NC}"
  exit 1
fi

# --- Processing ---
CHANGES_DETECTED=false

for i in "${!SERVICES[@]}"; do
  if [ "${selected[$i]}" -eq 1 ]; then
    SERVICE_NAME="${SERVICES[$i]}"
    SRC_DIR="ms-${SERVICE_NAME}/src/migrations"
    DEST_DIR="npm-packages/packages/domain-${SERVICE_NAME}/src/test/migrations"
    WRONG_DIR="npm-packages/packages/domain-${SERVICE_NAME}/src/migrations"

    echo -e "${BOLD}${CYAN}━━━ Syncing ms-${SERVICE_NAME} ━━━${NC}"

    if [ ! -d "$SRC_DIR" ]; then
      echo -e "  ${YELLOW}⚠ Warning: Source directory $SRC_DIR not found. Skipping.${NC}\n"
      continue
    fi

    # Cleanup the wrong directory if it exists (from previous run)
    if [ -d "$WRONG_DIR" ]; then
      echo -e "  ${DIM}Cleaning up old path $WRONG_DIR...${NC}"
      rm -rf "$WRONG_DIR"
    fi

    # Ensure destination exists
    mkdir -p "$DEST_DIR"

    # Use rsync to sync files and check for changes
    # -a: archive mode, -v: verbose, -c: checksum (important!), --delete: remove files not in source
    SYNC_RESULT=$(rsync -avc --delete "$SRC_DIR/" "$DEST_DIR/" | grep ".ts$" || true)

    if [ -n "$SYNC_RESULT" ]; then
      echo -e "  ${GREEN}✓ Migrations updated in domain-${SERVICE_NAME}/src/test/migrations${NC}"
      echo -e "  ${DIM}Files synced:${NC}"
      echo "$SYNC_RESULT" | sed 's/^/    - /'
      CHANGES_DETECTED=true
    else
      echo -e "  ${NC}  No changes detected (already in sync).${NC}"
    fi
    printf "\n"
  fi
done

# --- Final Message ---
if [ "$CHANGES_DETECTED" = true ]; then
  echo -e "${BOLD}${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${RED}  ⚠️  MIGRATIONS CHANGES DETECTED!${NC}"
  echo -e "${BOLD}${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "  ${BOLD}The migrations folder has been modified in the domain packages.${NC}"
  echo -e "  ${BOLD}You MUST update the datasource.ts in the following services:${NC}"
  echo -e ""
  for i in "${!SERVICES[@]}"; do
    if [ "${selected[$i]}" -eq 1 ]; then
      echo -e "  ${CYAN}▸ ms-${SERVICES[$i]}${NC}"
    fi
  done
  echo -e ""
  echo -e "  Look for: ${CYAN}src/config/data-source.ts${NC}"
  echo -e "  To ensure it imports/points to the domain package migrations.${NC}"
  echo -e "${BOLD}${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
else
  echo -e "${BOLD}${GREEN}✅ No migrations were changed.${NC}\n"
fi
