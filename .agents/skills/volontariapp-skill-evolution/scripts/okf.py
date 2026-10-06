"""Minimal OKF v0.2 helpers: frontmatter parsing/emission, timestamps, actors.

Stdlib only, so every hook (Claude Code, git pre-commit, Antigravity) can run it
with the system interpreter. The YAML support is a deliberate subset, matching
what the skill bundles use: scalars, inline lists/maps, block lists (of scalars
or mappings) and nested mappings, indented by two spaces.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone

ISO_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
ACTOR = re.compile(r"^(human:[\w.\-]+|process:[\w.\-]+|team:[\w.\-]+|[\w.\-]+/[\w.\-]+)$")
FOOTNOTE_REF = re.compile(r"\[\^([\w\-]+)\](?!:)")
RESERVED = {"index.md", "log.md"}


class FrontmatterError(ValueError):
    pass


def now_utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_utc(value: object) -> datetime | None:
    if not isinstance(value, str) or not ISO_UTC.match(value):
        return None
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


# --------------------------------------------------------------------------- #
# Parsing
# --------------------------------------------------------------------------- #

def split_document(text: str) -> tuple[dict | None, str]:
    """Return (frontmatter, body). frontmatter is None when the file has none."""
    if not text.startswith("---\n"):
        return None, text
    end = text.find("\n---", 4)
    if end == -1:
        raise FrontmatterError("frontmatter opened with '---' but never closed")
    raw = text[4:end]
    body = text[end + 4:].lstrip("\n")
    return parse_yaml(raw), body


def _split_top_level(text: str, sep: str) -> list[str]:
    parts, depth, quote, current = [], 0, "", []
    for ch in text:
        if quote:
            current.append(ch)
            if ch == quote:
                quote = ""
            continue
        if ch in "\"'":
            quote = ch
        elif ch in "[{":
            depth += 1
        elif ch in "]}":
            depth -= 1
        elif ch == sep and depth == 0:
            parts.append("".join(current).strip())
            current = []
            continue
        current.append(ch)
    tail = "".join(current).strip()
    if tail:
        parts.append(tail)
    return parts


def parse_scalar(raw: str) -> object:
    value = raw.strip()
    if value == "":
        return ""
    if value.startswith('"'):
        return json.loads(value)
    if value.startswith("'"):
        return value[1:-1].replace("''", "'")
    if value.startswith("[") and value.endswith("]"):
        return [parse_scalar(p) for p in _split_top_level(value[1:-1], ",")]
    if value.startswith("{") and value.endswith("}"):
        result = {}
        for part in _split_top_level(value[1:-1], ","):
            key, _, val = part.partition(":")
            result[key.strip()] = parse_scalar(val)
        return result
    lowered = value.lower()
    if lowered in ("true", "false"):
        return lowered == "true"
    if lowered in ("null", "~"):
        return None
    if re.fullmatch(r"-?\d+", value):
        return int(value)
    return value


def parse_yaml(raw: str) -> dict:
    lines = [ln.rstrip() for ln in raw.splitlines() if ln.strip() and not ln.lstrip().startswith("#")]
    value, index = _parse_block(lines, 0, 0)
    if index != len(lines):
        raise FrontmatterError(f"unexpected indentation near: {lines[index].strip()!r}")
    if not isinstance(value, dict):
        raise FrontmatterError("frontmatter must be a mapping")
    return value


def _indent(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def _parse_block(lines: list[str], i: int, indent: int) -> tuple[object, int]:
    if i < len(lines) and lines[i].strip().startswith("- ") or (i < len(lines) and lines[i].strip() == "-"):
        return _parse_list(lines, i, indent)
    return _parse_mapping(lines, i, indent)


def _parse_mapping(lines: list[str], i: int, indent: int) -> tuple[dict, int]:
    result: dict = {}
    while i < len(lines) and _indent(lines[i]) == indent and not lines[i].strip().startswith("- "):
        key, _, rest = lines[i].strip().partition(":")
        if not _:
            raise FrontmatterError(f"expected 'key: value', got {lines[i].strip()!r}")
        i += 1
        if rest.strip():
            result[key.strip()] = parse_scalar(rest)
            continue
        if i < len(lines) and (_indent(lines[i]) > indent or (
            _indent(lines[i]) == indent and lines[i].strip().startswith("- ")
        )):
            value, i = _parse_block(lines, i, _indent(lines[i]))
            result[key.strip()] = value
        else:
            result[key.strip()] = None
    return result, i


def _parse_list(lines: list[str], i: int, indent: int) -> tuple[list, int]:
    result: list = []
    while i < len(lines) and _indent(lines[i]) == indent and lines[i].strip().startswith("-"):
        content = lines[i].strip()[1:].strip()
        if re.match(r"^[\w\-]+:(\s|$)", content):
            # Mapping item: "- key: value" followed by keys indented by two more spaces.
            item_lines = [" " * (indent + 2) + content]
            i += 1
            while i < len(lines) and _indent(lines[i]) > indent:
                item_lines.append(lines[i])
                i += 1
            value, _ = _parse_mapping(item_lines, 0, indent + 2)
            result.append(value)
        else:
            result.append(parse_scalar(content))
            i += 1
    return result, i


# --------------------------------------------------------------------------- #
# Emission
# --------------------------------------------------------------------------- #

# First character: never a YAML indicator ("@" and "`" are reserved, "-" may start a list item):
# `@volontariapp/x` must be quoted or a strict parser (Claude Code skill loader) rejects the file.
_PLAIN = re.compile(r"^[\w./+()][\w ./@+()\-]*$")


def emit_scalar(value: object) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    text = str(value)
    if _PLAIN.match(text) and text.lower() not in ("true", "false", "null") and not re.fullmatch(r"-?\d+", text):
        return text
    return json.dumps(text, ensure_ascii=False)


def emit_yaml(data: dict, indent: int = 0) -> str:
    pad = " " * indent
    out: list[str] = []
    for key, value in data.items():
        if isinstance(value, dict):
            out.append(f"{pad}{key}:")
            out.append(emit_yaml(value, indent + 2))
        elif isinstance(value, list):
            if not value:
                out.append(f"{pad}{key}: []")
            elif all(not isinstance(v, (dict, list)) for v in value) and key == "tags":
                out.append(f"{pad}{key}: [{', '.join(emit_scalar(v) for v in value)}]")
            else:
                out.append(f"{pad}{key}:")
                for item in value:
                    if isinstance(item, dict):
                        first = True
                        for k, v in item.items():
                            prefix = f"{pad}  - " if first else f"{pad}    "
                            out.append(f"{prefix}{k}: {emit_scalar(v)}")
                            first = False
                    else:
                        out.append(f"{pad}  - {emit_scalar(item)}")
        else:
            out.append(f"{pad}{key}: {emit_scalar(value)}")
    return "\n".join(out)


def render_document(frontmatter: dict, body: str) -> str:
    return f"---\n{emit_yaml(frontmatter)}\n---\n\n{body.lstrip(chr(10))}"


# --------------------------------------------------------------------------- #
# Conformance
# --------------------------------------------------------------------------- #

def check_concept(frontmatter: dict | None, body: str) -> list[str]:
    """OKF v0.2 conformance problems for one concept document."""
    if frontmatter is None:
        return ["frontmatter YAML manquant"]
    problems = []
    if not str(frontmatter.get("type") or "").strip():
        problems.append("champ `type` manquant (seul champ obligatoire OKF)")
    for field in ("stale_after",):
        if field in frontmatter and parse_utc(frontmatter[field]) is None:
            problems.append(f"`{field}` doit être un instant ISO 8601 UTC (YYYY-MM-DDTHH:MM:SSZ)")
    generated = frontmatter.get("generated")
    if generated is not None:
        problems += _check_event(generated, "generated")
    verified = frontmatter.get("verified")
    if verified is not None:
        for event in verified if isinstance(verified, list) else [verified]:
            problems += _check_event(event, "verified")
    source_ids = {s.get("id") for s in frontmatter.get("sources") or [] if isinstance(s, dict)}
    prose = re.sub(r"```.*?```", "", body, flags=re.DOTALL)
    prose = re.sub(r"`[^`\n]*`", "", prose)
    for ref in sorted(set(FOOTNOTE_REF.findall(prose))):
        if ref not in source_ids:
            problems.append(f"note `[^{ref}]` sans entrée `sources` correspondante")
    if frontmatter.get("status", "stable") not in ("draft", "stable", "deprecated"):
        problems.append("`status` doit valoir draft, stable ou deprecated")
    return problems


def _check_event(event: object, field: str) -> list[str]:
    if not isinstance(event, dict):
        return [f"`{field}` doit être un mapping {{by, at}}"]
    problems = []
    if not ACTOR.match(str(event.get("by", ""))):
        problems.append(f"`{field}.by` invalide (attendu <producer>/<version>, human:<id> ou process:<id>)")
    if parse_utc(event.get("at")) is None:
        problems.append(f"`{field}.at` doit être un instant ISO 8601 UTC")
    return problems
