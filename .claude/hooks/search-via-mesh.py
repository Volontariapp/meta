#!/usr/bin/env python3
"""PreToolUse (Grep|Bash) : une recherche de contenu sur toute la racine de meta passe par mesh-mcp.

Un grep/rg lancé à la racine traverse 18 repos, node_modules exclus ou non, et rate les liens que
causalmesh résout (imports de packages, gRPC, outbox, streams). La recherche ciblée sur un repo
(`path: "ms-user"`, `rg X ms-user/src`) reste permise : c'est le bon outil pour un identifiant exact.
"""

from __future__ import annotations

import json
import os
import shlex
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SEARCHERS = {"rg", "grep", "egrep", "fgrep", "ag", "ack"}
WRAPPERS = {"rtk", "command", "env", "time", "nice"}
CONTROL = {"|", "||", "&&", ";", "&", "(", ")"}
# Flags taking a value: the next token is neither the pattern nor a path.
VALUE_FLAGS = {"-e", "-f", "-g", "--glob", "-t", "--type", "-T", "--type-not", "-A", "-B", "-C", "-m",
               "--max-count", "--include", "--exclude", "--exclude-dir", "-j", "--threads", "--max-depth", "-d"}

MESSAGE = """Recherche transverse refusée : elle vise toute la racine de meta ({target}).
Utilise mesh-mcp (charger les schémas : ToolSearch select:mcp__mesh-mcp__find_dependents,mcp__mesh-mcp__analyze_impact,mcp__mesh-mcp__analyze_grpc,mcp__mesh-mcp__smart_search,mcp__mesh-mcp__search_docs) :
- qui importe / utilise un package ou un symbole : find_dependents({{ target }})
- événement, job, outbox, stream, saga, consommateurs : analyze_impact({{ target }})
- méthode RPC, .proto, contrôleur @GrpcMethod, appels clients : analyze_grpc({{ target }})
- déclaration d'un symbole ou bloc de code : smart_search({{ query, scope }}) (scope obligatoire)
- concept d'architecture : search_docs({{ query }})
Pour un identifiant exact dans un repo connu, relance la recherche ciblée sur ce repo (ex. path "ms-user" ou `rg X ms-user/src`).
Si mesh-mcp ne répond pas, cible les repos un par un et signale la panne à l'utilisateur."""


def resolve(raw: str, cwd: Path) -> Path:
    path = Path(os.path.expanduser(raw))
    return (path if path.is_absolute() else cwd / path).resolve()


def grep_targets(tool_input: dict, cwd: Path) -> list[Path]:
    raw = [tool_input.get("path")] + list(tool_input.get("paths") or [])
    targets = [resolve(r, cwd) for r in raw if isinstance(r, str) and r]
    return targets or [cwd]


def bash_targets(command: str, cwd: Path) -> list[Path]:
    """Search roots of every rg/grep -r invocation in the command (cd segments update the cwd)."""
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars=True)
        lexer.whitespace_split = True
        tokens = list(lexer)
    except ValueError:
        return []
    # (tokens, piped): a search fed by `|` with no path reads stdin, not the file tree.
    segments, current, piped = [], [], False
    for token in tokens:
        if token in CONTROL:
            segments.append((current, piped))
            current, piped = [], token == "|"
        else:
            current.append(token)
    segments.append((current, piped))

    targets: list[Path] = []
    for seg, piped in segments:
        while seg and ("=" in seg[0] and not seg[0].startswith("-") or seg[0] in WRAPPERS):
            seg = seg[1:]
        if not seg:
            continue
        head = os.path.basename(seg[0])
        if head == "cd" and len(seg) > 1:
            cwd = resolve(seg[1], cwd)
            continue
        if head not in SEARCHERS:
            continue
        args = seg[1:]
        flags = [a for a in args if a.startswith("-")]
        recursive = head in {"rg", "ag", "ack"} or any(
            f in ("--recursive", "--dereference-recursive") or (not f.startswith("--") and ("r" in f or "R" in f))
            for f in flags
        )
        if not recursive:
            continue
        positional, skip, has_pattern_flag = [], False, False
        for arg in args:
            if skip:
                skip = False
                continue
            if arg in VALUE_FLAGS:
                skip = True
                has_pattern_flag |= arg in ("-e", "-f")
                continue
            if arg.startswith("-"):
                continue
            positional.append(arg)
        paths = positional if has_pattern_flag else positional[1:]
        if not paths and piped:
            continue
        targets += [resolve(p, cwd) for p in paths] or [cwd]
    return targets


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        return 0
    tool, tool_input = payload.get("tool_name"), payload.get("tool_input") or {}
    cwd = Path(payload.get("cwd") or os.getcwd()).resolve()
    if tool == "Grep":
        targets = grep_targets(tool_input, cwd)
    elif tool == "Bash":
        targets = bash_targets(str(tool_input.get("command") or ""), cwd)
    else:
        return 0
    root = REPO.resolve()
    if any(t == root for t in targets):
        reason = MESSAGE.format(target=root)
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": reason,
        }}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
