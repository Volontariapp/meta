#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTBOX_DIR="${ROOT_DIR}/outbox-runners"

# Check if outbox-runners directory exists
if [ ! -d "${OUTBOX_DIR}" ]; then
  echo "Error: outbox-runners directory not found at ${OUTBOX_DIR}"
  exit 1
fi

OUTBOXES=(
  "user"
  "social"
  "post"
  "event"
)

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

if [ $# -eq 0 ]; then
  echo -e "${BLUE}Usage: ./scripts/run-outbox.sh <outbox-name> [command]${NC}"
  echo -e "Available outboxes: ${OUTBOXES[*]}"
  exit 1
fi

TARGET=$1
COMMAND=${2:-"start:local"}

FOUND=false
for outbox in "${OUTBOXES[@]}"; do
  if [ "$outbox" == "$TARGET" ]; then
    FOUND=true
    break
  fi
done

if [ "$FOUND" = false ]; then
  echo -e "Error: Outbox '${TARGET}' not found. Available: ${OUTBOXES[*]}"
  exit 1
fi

DIR="${OUTBOX_DIR}/outbox-${TARGET}"

if [ ! -d "${DIR}" ]; then
  echo -e "Error: Directory ${DIR} does not exist."
  exit 1
fi

echo -e "${GREEN}Running ${COMMAND} in ${TARGET} outbox...${NC}"
cd "${DIR}"
yarn "${COMMAND}"
