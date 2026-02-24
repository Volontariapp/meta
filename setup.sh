#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'
ORG_SSH="git@github.com:Volontariapp"

echo -e "${BLUE}=== Volontariapp Project Initialization ===${NC}\n"

git remote set-url origin "${ORG_SSH}/meta.git"

git submodule update --init --recursive

for dir in */; do
    if [ -d "$dir" ] && ([ -d "$dir/.git" ] || [ -f "$dir/.git" ]); then
        repo_name=$(basename "$dir")
        echo -e "🔧 Configuring SSH for ${BLUE}${repo_name}${NC}..."
        
        (cd "$dir" && git remote set-url origin "${ORG_SSH}/${repo_name}.git")
        
        if [ -d "${dir}ci-tools" ]; then
            echo -e "   ⚓ Fixing nested ${BLUE}ci-tools${NC}..."
            (cd "${dir}ci-tools" && git remote set-url origin "${ORG_SSH}/ci-tools.git")
        fi

        if [ -f "${dir}package.json" ]; then
            echo -e "   📦 Installing dependencies..."
            (cd "$dir" && npm install)
        fi
    fi
done

git config submodule.recurse true

echo -e "\n${BLUE}✅ Setup complete!${NC}"
