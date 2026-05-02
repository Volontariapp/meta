#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPOS=$(find "${ROOT_DIR}" -maxdepth 2 -name ".git" -type d -exec dirname {} \;)

for repo in ${REPOS}; do
    echo "--- Processing repo: $(basename "${repo}") ---"
    (
        cd "${repo}"
        # Check if there are changes (including untracked ones)
        if [[ -n $(git status --porcelain) ]]; then
            echo "  Found changes. Committing and pushing..."
            git add .
            git commit -m "feat: integrate rtk and gitnexus rules for optimized agent context"
            # Try to push, but don't fail the whole script if push fails (e.g. no remote, or need pull)
            git push || echo "  Warning: git push failed for ${repo}. Check manually."
        else
            echo "  No changes found."
        fi
    )
done

echo "--- All repos processed ---"
