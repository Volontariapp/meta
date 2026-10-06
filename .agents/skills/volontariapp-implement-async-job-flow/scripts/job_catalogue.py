#!/usr/bin/env python3
"""Catalogue des jobs : producteurs (withFallback, createJob) et handlers (jobType) lus dans le code.

Usage : python3 .agents/skills/volontariapp-implement-async-job-flow/scripts/job_catalogue.py [--orphans]
  --orphans   n'affiche que les jobs sans producteur ou sans handler.

Les noms sont comparés par membre (`UserJobType.FALLBACK_X` et `JobMessagingType.FALLBACK_X` sont
le même job), comme le fait mesh-mcp. Stdlib uniquement.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
PRODUCER_ROOTS = ("ms-user", "ms-event", "ms-post", "ms-social", "ms-storage", "npm-packages/packages", "ws-service")
HANDLER_ROOTS = ("workers-runners",)
SKIP = ("node_modules", "/dist/", ".spec.ts", ".mock.ts", "/test/", "ci-tools")
PRODUCER = re.compile(
    r"(?:withFallback\(\s*|createJob<[^>]*>\(\{\s*type:\s*|\.type\s*=\s*)(\w*Job\w*Type\.([A-Z0-9_]+))"
)
HANDLER = re.compile(r"class\s+(\w+)\s+implements\s+IJobHandler<[\s\S]{0,600}?jobType\s*=\s*\w+\.([A-Z0-9_]+)")


def sources(roots: tuple[str, ...]):
    for root in roots:
        base = REPO / root
        if not base.exists():
            continue
        for path in base.rglob("*.ts"):
            rel = str(path.relative_to(REPO))
            if not any(s in rel for s in SKIP):
                yield rel, path.read_text(encoding="utf-8", errors="ignore")


def line_of(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def main() -> int:
    producers: dict[str, list[str]] = {}
    handlers: dict[str, list[str]] = {}
    for rel, text in sources(PRODUCER_ROOTS):
        for m in PRODUCER.finditer(text):
            tag = " (test)" if "/tests/" in rel else ""
            producers.setdefault(m.group(2), []).append(f"{rel}:{line_of(text, m.start())}{tag}")
    for rel, text in sources(HANDLER_ROOTS):
        for m in HANDLER.finditer(text):
            handlers.setdefault(m.group(2), []).append(f"{m.group(1)} ({rel}:{line_of(text, m.start())})")
    only_orphans = "--orphans" in sys.argv
    print("| Job | Producteurs | Handlers |")
    print("| :--- | :--- | :--- |")
    for job in sorted(set(producers) | set(handlers)):
        prod, hand = producers.get(job, []), handlers.get(job, [])
        if only_orphans and prod and hand:
            continue
        print(f"| `{job}` | {'<br>'.join(prod) or '**aucun**'} | {'<br>'.join(hand) or '**aucun**'} |")
    return 0


if __name__ == "__main__":
    sys.exit(main())
