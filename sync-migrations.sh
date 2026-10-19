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
SERVICES=("user" "social" "post" "event" "storage")

# --- Dependency Check ---
if ! command -v rsync &> /dev/null; then
  echo -e "${RED}✖ Error: rsync is required but not installed.${NC}"
  exit 1
fi

# --- Argument Parsing ---
MODE="interactive"
EXPLICIT_PACKAGES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all|-a)
      MODE="all"
      shift
      ;;
    --packages|-p)
      MODE="packages"
      shift
      while [[ $# -gt 0 && ! "$1" =~ ^- ]]; do
        IFS=',' read -ra ADDR <<< "$1"
        for p in "${ADDR[@]}"; do
          clean_p="${p#ms-}"
          clean_p="${clean_p#domain-}"
          if [[ -n "$clean_p" ]]; then
            EXPLICIT_PACKAGES+=("$clean_p")
          fi
        done
        shift
      done
      ;;
    --help|-h)
      echo -e "${BOLD}Usage:${NC} ./sync-migrations.sh [options]"
      echo ""
      echo -e "${BOLD}Options:${NC}"
      echo "  --all, -a                   Sync all microservices without interactive prompt"
      echo "  --packages, -p <p1,p2...>   Sync specified microservices (e.g. storage, user or ms-storage ms-user)"
      echo "  --help, -h                  Show this help message"
      echo ""
      echo -e "${BOLD}Available services:${NC} ${SERVICES[*]}"
      exit 0
      ;;
    *)
      echo -e "${RED}✖ Unknown option: $1${NC}"
      echo "Run ./sync-migrations.sh --help for usage."
      exit 1
      ;;
  esac
done

selected=()
for i in "${!SERVICES[@]}"; do selected+=(0); done

# --- Selection Logic ---
if [[ "$MODE" == "all" ]]; then
  echo -e "${BOLD}${CYAN}Syncing all services (--all)...${NC}\n"
  for i in "${!SERVICES[@]}"; do selected[$i]=1; done
elif [[ "$MODE" == "packages" ]]; then
  if [[ ${#EXPLICIT_PACKAGES[@]} -eq 0 ]]; then
    echo -e "${RED}✖ Error: --packages requires at least one package name.${NC}"
    echo -e "Available services: ${SERVICES[*]}"
    exit 1
  fi

  matched_count=0
  for req in "${EXPLICIT_PACKAGES[@]}"; do
    found=false
    for i in "${!SERVICES[@]}"; do
      if [[ "${SERVICES[$i]}" == "$req" ]]; then
        selected[$i]=1
        found=true
        matched_count=$((matched_count + 1))
        break
      fi
    done
    if [[ "$found" == false ]]; then
      echo -e "  ${YELLOW}⚠ Warning: Service '${req}' not recognized. Skipping.${NC}"
    fi
  done

  if [[ $matched_count -eq 0 ]]; then
    echo -e "${RED}✖ Error: None of the requested packages matched available services.${NC}"
    echo -e "Available services: ${SERVICES[*]}"
    exit 1
  fi
  printf "\n"
else
  # --- Selection System (Interactive) ---
  printf "\n  ${BOLD}${MAGENTA}Select Microservices to sync migrations:${NC}\n"
  printf "  ${DIM}(Arrows: Move, Space: Toggle, Enter: Done)${NC}\n\n"

  cursor=0

  # Ensure cursor is restored on exit
  trap 'tput cnorm 2>/dev/null || true' EXIT INT TERM

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
        read -rsn1 key2
        if [[ "$key2" == "[" || "$key2" == "O" ]]; then
          read -rsn1 key3
          case "$key3" in
            'A') ((cursor--)); [ $cursor -lt 0 ] && cursor=$((${#SERVICES[@]}-1)) ;;
            'B') ((cursor++)); [ $cursor -ge ${#SERVICES[@]} ] && cursor=0 ;;
          esac
        fi
        ;;
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
  trap - EXIT INT TERM

  # Move past the menu
  for ((i=0; i<${#SERVICES[@]}; i++)); do printf "\n"; done
  printf "\n"
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
