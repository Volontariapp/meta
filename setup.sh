#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Volontariapp Project Initialization ===${NC}\n"

git submodule update --init --recursive

git config submodule.recurse true

echo -e "\n${BLUE}✅ Setup complete!${NC}"
