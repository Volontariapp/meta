#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Starting all backend services...${NC}"

SERVICES=(
  # 1. Core Microservices (ms-user first as it usually handles auth/identity)
  "ms-user"
  "ms-social"
  "ms-post"
  "ms-event"
  
  # 2. Gateways & WebSockets
  "api-gateway"
  "ws-service"
  
  # 3. Outbox Runners
  "outbox-runners/outbox-user"
  "outbox-runners/outbox-social"
  "outbox-runners/outbox-post"
  "outbox-runners/outbox-event"
  
  # 4. Post Processors
  "post-processors-runner/post-processor-user"
  "post-processors-runner/post-processor-social"
  "post-processors-runner/post-processor-post"
  "post-processors-runner/post-processor-event"
  
  # 5. Worker Runners
  "workers-runners/worker-user"
  "workers-runners/worker-social"
  "workers-runners/worker-post"
  "workers-runners/worker-event"
)

LOG_DIR="${ROOT_DIR}/logs"
mkdir -p "${LOG_DIR}"
echo -e "Logs will be written to ${GREEN}${LOG_DIR}${NC}\n"

PIDS=()

cleanup() {
  echo -e "\n${RED}Stopping all services...${NC}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  echo -e "${GREEN}All services stopped.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

for service in "${SERVICES[@]}"; do
  dir="${ROOT_DIR}/${service}"
  if [ -d "$dir" ]; then
    service_name=$(basename "$service")
    echo -e "Starting ${GREEN}${service_name}${NC}..."
    cd "$dir"
    yarn start:local > "${LOG_DIR}/${service_name}.log" 2>&1 &
    PIDS+=($!)
    
    # Delay to avoid massive RAM spikes
    sleep 3
  else
    echo -e "${RED}Directory not found: ${dir}${NC}"
  fi
done

echo -e "\n${BLUE}======================================================${NC}"
echo -e "${GREEN}All backend services are running in the background!${NC}"
echo -e "To view logs, run e.g. ${BLUE}tail -f logs/api-gateway.log${NC}"
echo -e "To stop them, press ${RED}Ctrl+C${NC} in this terminal window."
echo -e "${BLUE}======================================================${NC}\n"

# Wait for all background jobs
wait
