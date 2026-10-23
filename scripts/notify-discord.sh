#!/usr/bin/env bash
set -euo pipefail

# Load webhook URL from environment or .env.local / .env
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [[ -f "$ROOT_DIR/.env.local" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT_DIR/.env.local"
  set +a
elif [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT_DIR/.env"
  set +a
fi

WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

if [[ -z "$WEBHOOK_URL" ]]; then
  echo "Error: DISCORD_WEBHOOK_URL is not set in environment or .env.local" >&2
  exit 1
fi

TITLE="${1:-Notification}"
DESCRIPTION="${2:-}"
URL="${3:-}"
STATUS="${4:-success}"

case "$STATUS" in
  success) COLOR=3066993 ;;
  info)    COLOR=3447003 ;;
  warning) COLOR=15105570 ;;
  error)   COLOR=15158332 ;;
  *)       COLOR=5793266 ;;
esac

PAYLOAD=$(python3 -c '
import json, sys

title = sys.argv[1]
desc = sys.argv[2]
pr_url = sys.argv[3]
color = sys.argv[4]

embed = {
    "title": title,
    "description": desc,
    "color": int(color),
    "footer": {"text": "PLIC • Volontariapp"}
}
if pr_url:
    embed["url"] = pr_url

payload = {
    "username": "PLIC Bot",
    "avatar_url": "https://avatars.githubusercontent.com/u/263673138?v=4",
    "embeds": [embed]
}

print(json.dumps(payload))
' "$TITLE" "$DESCRIPTION" "$URL" "$COLOR")

curl -s -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$WEBHOOK_URL" > /dev/null
echo "✓ Notification envoyée sur Discord !"

