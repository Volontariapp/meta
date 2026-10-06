#!/usr/bin/env python3
"""Consommateurs des packages @volontariapp/* : qui dépend de quoi, et dans quelle version déclarée.

Usage : python3 .agents/skills/volontariapp-shared-npm-package-change/scripts/consumers.py [package...]
  sans argument : matrice complète ; avec `messaging domain-user` : seulement ces packages.

Lit les package.json de chaque repo cloné sous meta (runners compris, un par sous-projet).
Complète `find_dependents({ target: "@volontariapp/x", granularity: "package" })` de mesh-mcp,
qui part des imports réels plutôt que des déclarations. Stdlib uniquement.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
SKIP = ("node_modules", "ci-tools", "submodules", "/dist/", "causalmesh", "npm-packages")
SCOPE = "@volontariapp/"


def manifests():
    for path in sorted(REPO.glob("*/**/package.json")):
        rel = str(path.relative_to(REPO))
        if any(s in rel for s in SKIP) or rel.count("/") > 2:
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        deps = {**data.get("dependencies", {}), **data.get("devDependencies", {}), **data.get("peerDependencies", {})}
        yield str(path.parent.relative_to(REPO)), {k[len(SCOPE):]: v for k, v in deps.items() if k.startswith(SCOPE)}


def main(argv: list[str]) -> int:
    wanted = {a.removeprefix(SCOPE) for a in argv}
    by_package: dict[str, list[tuple[str, str]]] = {}
    for consumer, deps in manifests():
        for name, version in deps.items():
            if not wanted or name in wanted:
                by_package.setdefault(name, []).append((consumer, version))
    for name in sorted(by_package):
        rows = by_package[name]
        print(f"\n### {SCOPE}{name} ({len(rows)} consommateur(s))")
        for consumer, version in sorted(rows):
            print(f"- {consumer} : {version}")
    if wanted - set(by_package):
        print(f"\nAucun consommateur déclaré pour : {', '.join(sorted(wanted - set(by_package)))}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
