#!/bin/bash

# Script to run fix_peer_deps.js across all microservices and the gateway
SCRIPT_PATH=$(realpath "$(dirname "$0")/fix_peer_deps.js")

WORKSPACES=("api-gateway" "ms-user" "ms-post" "ms-event" "ms-social" "nativapp")

for ws in "${WORKSPACES[@]}"; do
  if [ -d "$ws" ]; then
    echo "========================================"
    echo "🛠️  Fixing peers in $ws..."
    cd "$ws"
    node "$SCRIPT_PATH"
    cd ..
  fi
done

echo "========================================"
echo "✨ All selected workspaces processed."
echo "💡 Run 'yarn install' in each workspace to apply changes."
