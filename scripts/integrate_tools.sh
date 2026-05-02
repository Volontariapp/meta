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

# GitNexus section template
GITNEXUS_TEMPLATE='<!-- gitnexus:start -->
# 🧠 GitNexus — Code Intelligence

This project is indexed by GitNexus as **PROJECT_NAME**. Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> [!IMPORTANT]
> If any tool warns that the index is stale, run `npx gitnexus analyze` immediately.

## 🚀 Quick Actions

| Task | Command / Resource |
| :--- | :--- |
| **Visualize Graph** | [https://gitnexus.vercel.app/](https://gitnexus.vercel.app/) (Requires `npx gitnexus serve`) |
| **Impact Analysis** | `npx gitnexus impact <symbol>` |
| **Code Search** | `npx gitnexus query "<concept>"` |
| **Symbol Context** | `npx gitnexus context <symbol>` |

## 🛠️ Mandatory Workflows

### 1. Pre-Edit: Impact Analysis
**NEVER** modify a public function, class, or method without running impact analysis first.
*   **Action**: Run `gitnexus_impact({target: "SymbolName", direction: "upstream"})`.
*   **Rule**: Report the blast radius (direct callers, affected processes) to the user before proceeding.

### 2. Pre-Commit: Verification
**MUST** verify that your changes only affect the intended symbols.
*   **Action**: Run `gitnexus_detect_changes()`.
*   **Rule**: If unexpected files are impacted, investigate before committing.

### 3. Exploring & Refactoring
*   **Search**: Use `gitnexus_query` to find execution flows instead of grepping.
*   **Rename**: Use `gitnexus_rename` instead of find-and-replace to maintain graph integrity.

## 📊 Impact Risk Levels

| Level | Depth | Meaning | Required Action |
| :--- | :---: | :--- | :--- |
| **CRITICAL** | d=1 | Direct callers/importers will break | Update all dependents |
| **HIGH** | d=2 | Indirect dependencies likely affected | Extensive testing required |
| **LOW** | d=3+ | Transitive impacts possible | Verify critical paths |

## 🔄 Keeping the Index Fresh

After major changes or commits, refresh the knowledge graph:
```bash
npx gitnexus analyze
```
*Add `--embeddings` if you need semantic search capabilities.*

## 📖 Skill Reference

For detailed workflows, refer to the following local instruction files:
*   [Architecture Exploring](.claude/skills/gitnexus/gitnexus-exploring/SKILL.md)
*   [Impact Analysis](.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md)
*   [Debugging Flows](.claude/skills/gitnexus/gitnexus-debugging/SKILL.md)
*   [Safe Refactoring](.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md)
*   [CLI Guide & Wiki](.claude/skills/gitnexus/gitnexus-cli/SKILL.md)

<!-- gitnexus:end -->'

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
    repo_name=$(basename "${repo}")
    if [ "${repo_name}" == "." ] || [ "${repo_name}" == "meta" ]; then
        repo_name="volontariapp"
    fi
    
    echo "Processing ${repo} (Project: ${repo_name})..."
    
    # 1. Create .agents/rules/
    mkdir -p "${repo}/.agents/rules"
    echo "${RTK_RULES_CONTENT}" > "${repo}/.agents/rules/antigravity-rtk-rules.md"
    
    # 2. Update CLAUDE.md
    if [ ! -f "${repo}/CLAUDE.md" ]; then
        echo "Creating CLAUDE.md..."
        echo -e "${GITNEXUS_TEMPLATE/PROJECT_NAME/${repo_name}}\n\n${CLAUDE_RTK_SECTION}" > "${repo}/CLAUDE.md"
    else
        # Add GitNexus if missing
        if ! grep -q "gitnexus:start" "${repo}/CLAUDE.md"; then
            echo "  Adding GitNexus to CLAUDE.md"
            TEMP_FILE=$(mktemp)
            echo -e "${GITNEXUS_TEMPLATE/PROJECT_NAME/${repo_name}}\n\n$(cat "${repo}/CLAUDE.md")" > "${TEMP_FILE}"
            mv "${TEMP_FILE}" "${repo}/CLAUDE.md"
        fi
        
        # Add RTK if missing
        if ! grep -q "RTK - Rust Token Killer" "${repo}/CLAUDE.md"; then
            echo "  Adding RTK to CLAUDE.md"
            echo "${CLAUDE_RTK_SECTION}" >> "${repo}/CLAUDE.md"
        fi
    fi
done

echo "Done! RTK and GitNexus integrated in all repos."
