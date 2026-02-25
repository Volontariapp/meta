#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║     Volontariapp — Project Initialization    ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}[1/5]${NC} Runtime (Node.js + Yarn)..."
bash "${SCRIPT_DIR}/install_runtime.sh"

echo ""
echo -e "${BLUE}[2/5]${NC} Developer Tools..."
bash "${SCRIPT_DIR}/install_apps.sh"

echo ""
echo -e "${BLUE}[3/5]${NC} Shell Environment..."
bash "${SCRIPT_DIR}/install_shell.sh"

echo ""
echo -e "${BLUE}[4/5]${NC} Repositories..."
bash "${SCRIPT_DIR}/init_repos.sh"

echo ""
echo -e "${BLUE}[5/5]${NC} Installing dependencies..."
yarn install

echo ""
echo -e "${BOLD}${GREEN}✅ Volontariapp setup complete!${NC}"
