#!/bin/bash

# Script to run fix_peer_deps.js and clean_peers.js across all microservices and the gateway
FIX_SCRIPT_PATH=$(realpath "$(dirname "$0")/fix_peer_deps.js")
CLEAN_SCRIPT_PATH=$(realpath "$(dirname "$0")/clean_peers.js")

WORKSPACES=("api-gateway" "ms-user" "ms-post" "ms-event" "ms-social" "nativapp")

for ws in "${WORKSPACES[@]}"; do
  if [ -d "$ws" ]; then
    echo "========================================"
    echo "🛠️  Processing peers in $ws..."
    cd "$ws"
    
    # 1. Clean existing redundant rules first
    echo "🧹 Cleaning redundant rules..."
    node "$CLEAN_SCRIPT_PATH"
    
    # 2. Fix missing ones
    echo "🔍 Fixing missing peers..."
    node "$FIX_SCRIPT_PATH"
    
    # 3. Final clean pass (just in case)
    echo "✨ Final clean pass..."
    node "$CLEAN_SCRIPT_PATH"
    
    cd ..
  fi
done

echo "========================================"
echo "✨ All selected workspaces processed."
echo "💡 Run 'yarn install' in each workspace to apply changes."
