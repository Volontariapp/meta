#!/usr/bin/env bash
# Bootstrap Volontariapp (macOS, Linux, WSL2) : garantit Node et Yarn, puis delegue a la CLI.
# Usage : ./setup.sh [options de `meta setup`]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIRED_NODE="$(tr -d '[:space:]' < "${ROOT_DIR}/.node-version")"
YARN_VERSION="$(sed -n 's/.*"packageManager": "yarn@\([^"]*\)".*/\1/p' "${ROOT_DIR}/package.json")"

version_ge() {
  [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -n1)" = "$2" ]
}

node_is_ok() {
  command -v node >/dev/null 2>&1 && version_ge "$(node -v | sed 's/^v//')" "${REQUIRED_NODE}"
}

install_node() {
  echo "[setup] Installation de Node ${REQUIRED_NODE} via fnm"
  if ! command -v fnm >/dev/null 2>&1; then
    if command -v brew >/dev/null 2>&1; then
      brew install fnm
    elif command -v curl >/dev/null 2>&1; then
      curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell
      export PATH="${HOME}/.local/share/fnm:${HOME}/.fnm:${PATH}"
    else
      echo "[setup] curl est requis pour installer fnm. Installez curl puis relancez." >&2
      exit 1
    fi
  fi
  eval "$(fnm env)"
  fnm install "${REQUIRED_NODE}"
  fnm use "${REQUIRED_NODE}"
  fnm default "${REQUIRED_NODE}"
}

if ! node_is_ok; then
  install_node
fi
node_is_ok || { echo "[setup] Node >= ${REQUIRED_NODE} introuvable apres installation." >&2; exit 1; }

corepack enable
corepack prepare "yarn@${YARN_VERSION}" --activate

exec node "${ROOT_DIR}/scripts/cli/index.mjs" setup "$@"
