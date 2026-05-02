#!/usr/bin/env bash
set -euo pipefail

# RTK Instruction content for .agents/rules/antigravity-rtk-rules.md
RTK_RULES_CONTENT='# RTK - Rust Token Killer

**Usage**: Token-optimized CLI proxy (60-90% savings on dev operations).

## Commands Reference

| Operation | Command |
|-----------|---------|
| **Files** | `rtk ls`, `rtk read`, `rtk find`, `rtk grep`, `rtk diff` |
| **Git** | `rtk git status`, `rtk git log`, `rtk git diff`, `rtk git add`, `rtk git commit`, `rtk git push`, `rtk git pull` |
| **Tests** | `rtk npm test`, `rtk jest`, `rtk test <cmd>` |
| **Lint** | `rtk lint`, `rtk tsc` |
| **Misc** | `rtk gain` (analytics), `rtk discover` (opportunities), `rtk proxy <cmd>` (raw) |

## Hook-Based Usage

All other commands are automatically rewritten by the Claude Code hook.
Example: `git status` → `rtk git status` (transparent, 0 tokens overhead).

**Important:** the hook only runs on Bash tool calls. For `Read`, `Grep`, and `Glob` built-in tools, use shell commands (`cat`, `rg`, `find`) or call `rtk read`, `rtk grep`, or `rtk find` directly to get compressed output.'

# RTK section for CLAUDE.md
CLAUDE_RTK_SECTION='
## 🚀 RTK - Rust Token Killer (Optimized)
All shell commands (`git`, `npm`, `jest`, etc.) are automatically proxied via `rtk` for 80% token savings.
- **Direct Usage:** `rtk gain` (analytics), `rtk discover` (missed savings).
- **Files:** Use `rtk read <file>`, `rtk ls`, `rtk find`, `rtk grep` for compressed agent output.'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Find all git repos
REPOS=$(find "${ROOT_DIR}" -maxdepth 2 -name ".git" -type d -exec dirname {} \;)

for repo in ${REPOS}; do
    echo "Processing ${repo}..."
    
    # 1. Create .agents/rules/
    mkdir -p "${repo}/.agents/rules"
    echo "${RTK_RULES_CONTENT}" > "${repo}/.agents/rules/antigravity-rtk-rules.md"
    
    # 2. Update CLAUDE.md
    if [ -f "${repo}/CLAUDE.md" ]; then
        if ! grep -q "RTK - Rust Token Killer" "${repo}/CLAUDE.md"; then
            echo "${CLAUDE_RTK_SECTION}" >> "${repo}/CLAUDE.md"
            echo "  Updated CLAUDE.md"
        else
            echo "  CLAUDE.md already has RTK info"
        fi
    else
        echo "${CLAUDE_RTK_SECTION}" > "${repo}/CLAUDE.md"
        echo "  Created CLAUDE.md"
    fi
done

echo "Done! RTK integrated in all repos."
