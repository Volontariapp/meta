#!/usr/bin/env python3
"""Symboles de code cités dans les skills qui n'existent nulle part dans le code (API inventées ou renommées).

Usage : python3 .agents/skills/volontariapp-skill-evolution/scripts/check_symbols.py [skill...]

Extrait de chaque concept OKF les identifiants entre backticks (`PascalCase`, `camelCase(`, `Type.`)
et les cherche mot entier avec ripgrep dans les sources des repos. Un symbole introuvable est soit une
cible pas encore implémentée (à présenter comme telle dans la skill), soit une erreur à corriger.
Lent (un appel rg par symbole) : à lancer après une modification de skill, pas dans un hook.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
SKILLS = REPO / ".agents" / "skills"
CODE_ROOTS = (
    "npm-packages/packages", "ms-user/src", "ms-event/src", "ms-post/src", "ms-social/src", "ms-storage/src",
    "api-gateway/src", "ws-service/src", "workers-runners", "post-processors-runner", "outbox-runners",
    "nativapp/src", "proto-registry/proto", "deploy/apps", "deploy/infrastructure",
)
SKIP_FILES = {"index.md", "log.md", "lessons.md"}
CANDIDATE = re.compile(r"`([A-Za-z_][A-Za-z0-9_]{3,})(?:\(|`|\.|<)")
# Vocabulary that is not code of this workspace (tools, hooks, OKF fields).
ALLOW = {"PreToolUse", "PostToolUse", "Edit", "Write", "Bash", "Grep", "alwaysApply", "focusManager"}


def candidates(skill_dir: Path) -> dict[str, set[str]]:
    found: dict[str, set[str]] = {}
    for doc in skill_dir.rglob("*.md"):
        if doc.name in SKIP_FILES:
            continue
        for match in CANDIDATE.finditer(doc.read_text(encoding="utf-8")):
            symbol = match.group(1)
            looks_like_code = symbol[0].isupper() or any(c.isupper() for c in symbol[1:])
            if looks_like_code and not symbol.isupper() and symbol not in ALLOW:
                found.setdefault(symbol, set()).add(str(doc.relative_to(SKILLS)))
    return found


def exists(symbol: str) -> bool:
    roots = [str(REPO / r) for r in CODE_ROOTS if (REPO / r).exists()]
    result = subprocess.run(
        ["rg", "-l", "-w", "--max-count", "1", "-g", "!node_modules", "-g", "!dist", symbol, *roots],
        capture_output=True, text=True,
    )
    return bool(result.stdout.strip())


def main(argv: list[str]) -> int:
    if shutil.which("rg") is None:
        print("ripgrep (rg) est requis")
        return 2
    dirs = [SKILLS / name for name in argv] if argv else sorted(
        d for d in SKILLS.iterdir() if d.is_dir() and not d.is_symlink() and (d / "SKILL.md").exists()
    )
    missing = 0
    for skill_dir in dirs:
        for symbol, docs in sorted(candidates(skill_dir).items()):
            if not exists(symbol):
                missing += 1
                print(f"{symbol:42} {', '.join(sorted(docs))}")
    print(f"\n{missing} symbole(s) introuvable(s) dans le code.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
