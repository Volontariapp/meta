#!/usr/bin/env python3
"""Stop : relecture des affirmations d'absence (AGENTS.md, section 2 quinquies, R1 et relecture de fin).

Bloque une fois l'arret quand la derniere reponse affirme qu'un appelant, producteur ou consommateur
n'existe pas sans citer, sur la meme ligne, l'outil ou « non trouve dans <perimetre> ». Le second passage (stop_hook_active) laisse toujours
terminer, donc aucune boucle. Toute erreur de lecture laisse terminer (fail open).
"""

from __future__ import annotations

import json
import re
import sys

ABSENCE = re.compile(
    r"(n['’]est (?:jamais|appel\w+ nulle part)|nulle part|jamais appel\w+|personne ne (?:consomme|produit|appelle|publie)"
    r"|aucun (?:appelant|producteur|consommateur|emetteur|émetteur|client|import)|n['’]existe pas)",
    re.IGNORECASE,
)
COVERAGE = re.compile(
    r"(non trouv\w+ dans|non d[ée]termin\w+|analyze_grpc|analyze_impact|find_dependents|smart_search)",
    re.IGNORECASE,
)


def uncovered_claims(text: str) -> list[str]:
    """Phrases d'absence dont la ligne ne porte pas sa propre couverture (outil ou « non trouve dans »)."""
    return [m.group(0) for line in text.splitlines() if (m := ABSENCE.search(line)) and not COVERAGE.search(line)]

REASON = """Relecture de fin de reponse (AGENTS.md, section 2 quinquies) : ta reponse contient une affirmation d'absence ({found}) sans couverture citee.
Pour chaque phrase d'absence, indique l'outil utilise, le perimetre (toutes les racines du workspace ou non) et ce qui n'a pas ete verifie.
Si une des trois verifications (analyze_grpc, analyze_impact, post-processors-runner / workers-runners / ws-service / nativapp) manque, remplace par "non trouve dans <perimetre>" ou "non determine", et lance la verification manquante si elle est faisable."""


def last_turn_text(transcript_path: str) -> str:
    """Texte des blocs `text` assistant apres le dernier message utilisateur reel."""
    texts: list[str] = []
    with open(transcript_path, encoding="utf-8") as handle:
        for line in handle:
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            kind = entry.get("type")
            content = (entry.get("message") or {}).get("content")
            if kind == "user":
                blocks = content if isinstance(content, list) else [{"type": "text", "text": content}]
                if any(isinstance(b, dict) and b.get("type") != "tool_result" for b in blocks):
                    texts = []
            elif kind == "assistant" and isinstance(content, list):
                texts += [b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text"]
    return "\n".join(texts)


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        if payload.get("stop_hook_active"):
            return 0
        text = last_turn_text(payload["transcript_path"])
    except (OSError, KeyError, ValueError):
        return 0
    found = uncovered_claims(text)
    if found:
        print(json.dumps({"decision": "block", "reason": REASON.format(found=", ".join(sorted(set(found))))}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
