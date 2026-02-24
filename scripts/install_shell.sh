#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
DIM='\033[2m'
NC='\033[0m'

echo -e "${BLUE}--- Shell Environment ---${NC}"

read -rp "  Set up Oh My Zsh with autocompletions and syntax highlighting? [y/N] " answer

if [[ ! "${answer}" =~ ^[Yy]$ ]]; then
  echo -e "  ${DIM}⏭  Shell setup skipped${NC}"
  echo -e "${GREEN}--- Shell done ---${NC}"
  exit 0
fi

if [ -d "${HOME}/.oh-my-zsh" ]; then
  echo -e "  ${GREEN}✔${NC} Oh My Zsh ${DIM}(already installed)${NC}"
else
  echo -e "  ${BLUE}Installing Oh My Zsh...${NC}"
  RUNZSH=no KEEP_ZSHRC=yes sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
  echo -e "  ${GREEN}✔${NC} Oh My Zsh installed"
fi

ZSH_CUSTOM="${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}"

install_plugin() {
  local name="$1"
  local repo="$2"
  local dest="${ZSH_CUSTOM}/plugins/${name}"

  if [ -d "${dest}" ]; then
    echo -e "  ${GREEN}✔${NC} ${name} ${DIM}(already installed)${NC}"
  else
    echo -e "  ${BLUE}Installing ${name}...${NC}"
    git clone --depth=1 "${repo}" "${dest}"
    echo -e "  ${GREEN}✔${NC} ${name} installed"
  fi
}

install_plugin "zsh-autosuggestions" "https://github.com/zsh-users/zsh-autosuggestions.git"
install_plugin "zsh-syntax-highlighting" "https://github.com/zsh-users/zsh-syntax-highlighting.git"
install_plugin "zsh-completions" "https://github.com/zsh-users/zsh-completions.git"

THEME_DIR="${ZSH_CUSTOM}/themes/powerlevel10k"
if [ -d "${THEME_DIR}" ]; then
  echo -e "  ${GREEN}✔${NC} Powerlevel10k ${DIM}(already installed)${NC}"
else
  echo -e "  ${BLUE}Installing Powerlevel10k theme...${NC}"
  git clone --depth=1 https://github.com/romkatv/powerlevel10k.git "${THEME_DIR}"
  echo -e "  ${GREEN}✔${NC} Powerlevel10k installed"
fi

ZSHRC="${HOME}/.zshrc"

if [ -f "${ZSHRC}" ]; then
  if ! grep -q "zsh-autosuggestions" "${ZSHRC}"; then
    echo -e "  ${BLUE}Updating .zshrc plugins...${NC}"
    sed -i '' 's/^plugins=(.*/plugins=(git zsh-autosuggestions zsh-syntax-highlighting zsh-completions)/' "${ZSHRC}"
  fi

  if ! grep -q "powerlevel10k" "${ZSHRC}"; then
    echo -e "  ${BLUE}Setting Powerlevel10k theme...${NC}"
    sed -i '' 's/^ZSH_THEME=.*/ZSH_THEME="powerlevel10k\/powerlevel10k"/' "${ZSHRC}"
  fi
fi

echo -e ""
echo -e "  ${YELLOW}Restart your terminal or run: source ~/.zshrc${NC}"
echo -e "${GREEN}--- Shell done ---${NC}"
