#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

FORCE=false
for arg in "$@"; do
  [[ "$arg" == "--force" ]] && FORCE=true
done

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

log()  { echo -e "${BLUE}[gen-certs]${NC} $*"; }
ok()   { echo -e "${GREEN}  ✔${NC} $*"; }
skip() { echo -e "${YELLOW}  ↷${NC} $* (already exists, use --force to regenerate)"; }
err()  { echo -e "${RED}  ✖${NC} $*"; exit 1; }

generate_keypair() {
  local name="$1"
  log "Generating RSA-2048 keypair: ${BOLD}${name}${NC}"
  openssl genrsa -out "${TMPDIR}/${name}.pem" 2048 2>/dev/null
  openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
    -in "${TMPDIR}/${name}.pem" -out "${TMPDIR}/${name}.key"
  openssl rsa -in "${TMPDIR}/${name}.pem" -pubout -out "${TMPDIR}/${name}.pub" 2>/dev/null
  rm "${TMPDIR}/${name}.pem"
}

place_file() {
  local src="$1"
  local dest_dir="$2"
  local dest_name="$3"
  local dest="${ROOT_DIR}/${dest_dir}/certs/${dest_name}"

  mkdir -p "${ROOT_DIR}/${dest_dir}/certs"

  if [[ -f "$dest" ]] && [[ "$FORCE" == false ]]; then
    skip "${dest_dir}/certs/${dest_name}"
  else
    cp "${src}" "${dest}"
    ok "${dest_dir}/certs/${dest_name}"
  fi
}

echo -e "\n${BOLD}${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║     Volontariapp — Certificate Generation    ║${NC}"
echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════╝${NC}\n"

command -v openssl >/dev/null 2>&1 || err "openssl not found"

# --- Generate keypairs ---
generate_keypair "access"
generate_keypair "refresh"
generate_keypair "internal"

# --- Distribute private keys ---
echo ""
log "Distributing private keys..."
place_file "${TMPDIR}/access.key"   "ms-user"     "access.key"
place_file "${TMPDIR}/refresh.key"  "ms-user"     "refresh.key"
place_file "${TMPDIR}/internal.key" "api-gateway" "internal.key"

# --- Distribute public keys ---
echo ""
log "Distributing public keys..."
place_file "${TMPDIR}/access.pub"   "api-gateway" "access.pub"
place_file "${TMPDIR}/refresh.pub"  "api-gateway" "refresh.pub"
place_file "${TMPDIR}/refresh.pub"  "ms-user"     "refresh.pub"

for svc in ms-user ms-event ms-post ms-social; do
  if [[ -d "${ROOT_DIR}/${svc}" ]]; then
    place_file "${TMPDIR}/internal.pub" "${svc}" "internal.pub"
  fi
done


echo ""
echo -e "${BOLD}${GREEN}✅ Certificates ready.${NC}"
echo -e "${YELLOW}   ⚠ certs/ dirs are gitignored — never commit private keys.${NC}\n"
