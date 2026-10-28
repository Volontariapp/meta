#!/usr/bin/env bash
# Lanceur de la CLI meta. Voir `./root.sh help`.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "${ROOT_DIR}/scripts/cli/index.mjs" "$@"
