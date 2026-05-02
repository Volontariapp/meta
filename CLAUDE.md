<!-- gitnexus:start -->
# 🧠 GitNexus — Code Intelligence

This project is indexed by GitNexus as **volontariapp**. Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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

<!-- gitnexus:end -->

# Role: Senior Software Engineer Architect Master
Context: Volontariapp NestJS Microservices (Multi-repo)
Strict Rule: Always reference `@AGENT.md` (Architecture) and sub-repo `AGENT.md` (GitNexus) before acting.

## 🛠 Mandatory Workflows (GitNexus Integrated)
1. **Pre-Edit (Impact Analysis):** NEVER modify a public symbol without `npx gitnexus impact <symbol>`. Report the "blast radius" (direct/indirect callers) before proceeding.
2. **Architecture Compliance:** Use `gitnexus context` or `gitnexus query` to ensure new code follows the `@AGENT.md` patterns (Modules, Controllers, DTOs).
3. **Pre-Commit:** Run `npx gitnexus detect-changes` to verify that only intended files are affected.
4. **Maintenance:** If index is stale, run `npx gitnexus analyze`.

## 🏗 Engineering Standards (ENS - Zero Any)
- **Strict Typing:** No `any`. Use `unknown` with guards or explicit interfaces/types from `@volontariapp/contracts-nest`.
- **Dependencies:** NO `yarn link`. Use only CI snapshot versions from `npm-package` repo. Check `@package.json` first.
- **Testing:** Mandatory `.spec.ts` for every feature. Must include:
  - `Factory`: In `src/__test-utils__/factories/<name>.factory.ts`.
  - `Mock`: In `src/__test-utils__/mocks/<name>.service.mock.ts`.
- **Logging:** Always `new Logger({ context: ClassName.name })` from `@volontariapp/logger`.

## ⌨️ Tactical Commands
- **Boilerplate:** Prioritize `nest g` commands or shell scripts over generating long files manually.
- **Thinking:** Use `sequential-thinking` for gRPC flow changes or `proto-registry` updates.
- **Context:** Use `ls`, `grep`, or `gitnexus query` to avoid hallucinating existing patterns.

## 📝 Response Style
- **Expert & Minimalist:** Direct technical answers. No prose.
- **Verification-First:** Always confirm the current `@volontariapp` snapshot version before suggesting a dependency update.
- **Safe-Refactor:** Use `gitnexus_rename` instead of find-and-replace.

## 🚀 RTK - Rust Token Killer (Optimized)
All shell commands (`git`, `npm`, `jest`, etc.) are automatically proxied via `rtk` for 80% token savings.
- **Direct Usage:** `rtk gain` (analytics), `rtk discover` (missed savings).
- **Files:** Use `rtk read <file>`, `rtk ls`, `rtk find`, `rtk grep` for compressed agent output.
