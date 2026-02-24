#!/bin/bash

SERVICES=("api-gateway" "ms-event" "ms-post" "ms-user" "nativapp" "npm-packages")
ORG_SSH="git@github.com:Volontariapp"
CI_SSH="$ORG_SSH/ci-tools.git"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

for repo in "${SERVICES[@]}"; do
    if [ -d "$repo" ]; then
        echo -e "${BLUE}>>> Processing $repo${NC}"
        cd "$repo"
        
        # Force the remote to use SSH instead of HTTPS
        git remote set-url origin "$ORG_SSH/$repo.git"
        
        if [ ! -f ".gitmodules" ] || ! grep -q "ci-tools" ".gitmodules"; then
            git checkout main
            git pull origin main
            
            git submodule add "$CI_SSH" ci-tools
            git add .
            git commit -m "chore: add ci-tools as submodule via ssh"
            git push origin main
            
            echo -e "${GREEN}Updated $repo successfully${NC}"
        else
            # Even if it exists, ensure the remote is SSH for future pushes
            echo -e "${RED}ci-tools already exists in $repo (Remote fixed to SSH)${NC}"
        fi
        
        cd ..
    fi
done

echo -e "\n${BLUE}Updating meta repository pointers...${NC}"
# Also fix the meta repo remote just in case
git remote set-url origin "$ORG_SSH/meta.git"
git add .
git commit -m "chore: update service pointers with ci-tools submodules"
git push origin main

echo -e "${GREEN}Infrastructure sync complete!${NC}"
