#!/usr/bin/env python3
"""Skill evolution loop for the Volontariapp agent skills (OKF v0.2 bundles).

Each skill declares in its SKILL.md frontmatter the code it governs (`paths`
globs) and when it was last checked against that code (`verified`, OKF trust
family). This script compares both and tells the agent exactly what to update.

Multi-repo: `meta` ignores the repositories cloned under it (ms-*, api-gateway,
npm-packages...). Paths are relative to `meta` (`ms-user/src/...`) and every git
query runs in the repository that owns the file.

Commands (run from anywhere):
  status [--json]                 State of every skill (fresh / stale / invalid).
  plan                            Precise, actionable to-do list for the agent.
  validate                        OKF conformance of every bundle (exit 1 on error).
  sync SKILL... | --all           Mark skills as reviewed against the current code.
  learn --skill S --title T --insight I [--kind K] [--source PATH]
                                  Record a lesson in S/references/lessons.md.
  new NAME --title T --description D --paths GLOB...
                                  Scaffold a new skill bundle.
  index                           Regenerate every index.md.
  owners FILE...                  Skills governing these files.
  check-staged                    Pre-commit gate: staged code must have a fresh skill.
  hook                            Claude Code Stop hook (reads the hook JSON on stdin).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from functools import cached_property
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import okf  # noqa: E402

REPO = Path(__file__).resolve().parents[4]
SKILLS_DIR = REPO / ".agents" / "skills"
AGENTS_MD = REPO / "AGENTS.md"
AGENTS_START = "<!-- skills-index:start (généré par evolve.py index, ne pas éditer) -->"
AGENTS_END = "<!-- skills-index:end -->"
SELF = ".agents/skills/volontariapp-skill-evolution/scripts/evolve.py"
# mesh-mcp (causalmesh) recommends a skill at the top of a tool answer from [engines.policy.skills]:
# that table is generated from each SKILL.md `mesh_keys` between these markers.
MESH_TOML = REPO / ".agents" / "mesh-mcp.toml"
MESH_START = "# >>> skills-mesh:start (généré par evolve.py index depuis les `mesh_keys` des skills, ne pas éditer)"
MESH_END = "# <<< skills-mesh:end"
MESH_MIN_KEY = 4  # a shorter derived key would match unrelated subjects ("ms-" is everywhere)
STATE_FILE = "volontariapp-skill-evolution.json"
DEFAULT_ACTOR = os.environ.get("SKILL_EVOLUTION_ACTOR", "claude-code/agent")
MAX_VERIFIED = 5
MAX_FILES_SHOWN = 8
# Code areas where a change with no owning skill is worth a new or wider skill. Business code of
# ms-* and api-gateway is left out on purpose: no skill describes it file by file, it would block every stop.
WATCHED_ROOTS = (
    "npm-packages/", "proto-registry/", "outbox-runners/", "post-processors-runner/", "workers-runners/",
    "deploy/", "ci-tools/", "scripts/",
)
IGNORED_PARTS = ("__pycache__", ".venv/", "/venv/", "node_modules/", ".pytest_cache", ".DS_Store")
CORRECTION_MARKERS = re.compile(
    r"(^\s*non\b|\bnon\s*[,.!]|\b(?:pas ça|pas comme ça|c'est faux|faux\b|tu t'es tromp|corrige|attention|en fait|plutôt|"
    r"wrong|instead|don't|do not|actually))",
    re.IGNORECASE,
)


# --------------------------------------------------------------------------- #
# Git helpers (multi-repo)
# --------------------------------------------------------------------------- #

def git(*args: str, cwd: Path | None = None) -> str:
    result = subprocess.run(["git", "-C", str(cwd or REPO), *args], capture_output=True, text=True)
    return result.stdout if result.returncode == 0 else ""


def repos() -> list[tuple[str, Path]]:
    """(prefix, root) of `meta` ("") and of every repository cloned directly under it."""
    nested = [
        (child.name + "/", child)
        for child in sorted(REPO.iterdir())
        if child.is_dir() and not child.is_symlink() and not child.name.startswith(".") and (child / ".git").exists()
    ]
    return [("", REPO), *nested]


def repo_of(file: str, roots: list[tuple[str, Path]]) -> tuple[str, Path]:
    """Repository owning a meta-relative path (longest matching prefix)."""
    return max((r for r in roots if file.startswith(r[0])), key=lambda r: len(r[0]))


def _keep(path: str, prefix: str, nested: tuple[str, ...]) -> bool:
    # Seen from meta, a nested repo is an untracked directory ("ms-user/"): its own git lists its files.
    if path.endswith("/") or (not prefix and nested and path.startswith(nested)):
        return False
    return not any(p in path for p in IGNORED_PARTS)


def repo_files() -> list[str]:
    roots = repos()
    nested = tuple(p for p, _ in roots if p)
    files = []
    for prefix, root in roots:
        files += [prefix + f for f in git("ls-files", "-co", "--exclude-standard", cwd=root).splitlines() if _keep(f, prefix, nested)]
    return files


def working_tree_changes() -> dict[str, str]:
    """{path: status} for uncommitted changes, including untracked files, in every repository."""
    roots = repos()
    nested = tuple(p for p, _ in roots if p)
    changes = {}
    for prefix, root in roots:
        for line in git("status", "--porcelain=v1", "--untracked-files=all", cwd=root).splitlines():
            status, path = line[:2].strip() or "M", line[3:]
            if " -> " in path:
                path = path.split(" -> ", 1)[1]
            path = path.strip('"')
            # Submodules (deploy/submodules/*, api-gateway/ci-tools) show up as directories: not files to review.
            if _keep(path, prefix, nested) and not (root / path).is_dir():
                changes[prefix + path] = status
    return changes


@dataclass
class Commit:
    sha: str
    when: datetime
    subject: str
    files: list[str]


def commits_since(since: datetime) -> list[Commit]:
    """Commits of every repository since `since`; sha is `<repo>@<sha>`, files are meta-relative."""
    commits = []
    for prefix, root in repos():
        label = prefix.rstrip("/") or REPO.name
        out = git("log", f"--since={since.strftime('%Y-%m-%dT%H:%M:%SZ')}", "--name-only", "--format=@@%h|%ct|%s", cwd=root)
        current = None
        for line in out.splitlines():
            if line.startswith("@@"):
                sha, ts, subject = line[2:].split("|", 2)
                current = Commit(f"{label}@{sha}", datetime.fromtimestamp(int(ts), timezone.utc), subject, [])
                commits.append(current)
            elif line.strip() and current is not None:
                current.files.append(prefix + line.strip())
    return commits


def blob_hashes(files: list[str]) -> dict[str, str]:
    """Git blob hash of the working-tree content of each existing file (one git call, content only)."""
    existing = [f for f in files if (REPO / f).is_file()]
    if not existing:
        return {}
    result = subprocess.run(
        ["git", "-C", str(REPO), "hash-object", "--no-filters", "--stdin-paths"],
        input="\n".join(existing), capture_output=True, text=True,
    )
    hashes = result.stdout.split()
    return dict(zip(existing, hashes)) if len(hashes) == len(existing) else {}


def git_dir() -> Path:
    raw = git("rev-parse", "--git-dir").strip() or ".git"
    path = Path(raw)
    return path if path.is_absolute() else REPO / path


# --------------------------------------------------------------------------- #
# Skills
# --------------------------------------------------------------------------- #

def glob_to_regex(pattern: str) -> re.Pattern[str]:
    parts, i = [], 0
    while i < len(pattern):
        if pattern.startswith("**/", i):
            parts.append("(?:.*/)?")
            i += 3
        elif pattern.startswith("**", i):
            parts.append(".*")
            i += 2
        elif pattern[i] == "*":
            parts.append("[^/]*")
            i += 1
        elif pattern[i] == "?":
            parts.append("[^/]")
            i += 1
        else:
            parts.append(re.escape(pattern[i]))
            i += 1
    return re.compile("^" + "".join(parts) + "$")


@dataclass
class Skill:
    name: str
    path: Path
    meta: dict
    body: str
    problems: list[str] = field(default_factory=list)

    @property
    def rel(self) -> str:
        return str(self.path.relative_to(REPO))

    @cached_property
    def patterns(self) -> list[re.Pattern[str]]:
        return [glob_to_regex(p) for p in self.meta.get("paths") or []]

    def covers(self, file: str) -> bool:
        return any(p.match(file) for p in self.patterns)

    @property
    def verified_events(self) -> list[dict]:
        raw = self.meta.get("verified") or []
        return [raw] if isinstance(raw, dict) else [e for e in raw if isinstance(e, dict)]

    def code_digest(self, hashes: dict[str, str]) -> str:
        """Fingerprint of the content of every file the skill governs (outside its own bundle)."""
        own_dir = self.rel + "/"
        lines = sorted(f"{f}:{h}" for f, h in hashes.items() if self.covers(f) and not f.startswith(own_dir))
        return hashlib.sha1("\n".join(lines).encode()).hexdigest()[:16]

    @property
    def last_digest(self) -> str | None:
        events = self.verified_events
        return str(events[-1].get("digest")) if events and events[-1].get("digest") else None

    @property
    def last_check(self) -> datetime:
        stamps = [okf.parse_utc(e.get("at")) for e in self.verified_events]
        generated = self.meta.get("generated") or {}
        stamps.append(okf.parse_utc(generated.get("at")) if isinstance(generated, dict) else None)
        stamps = [s for s in stamps if s is not None]
        return max(stamps) if stamps else datetime(1970, 1, 1, tzinfo=timezone.utc)


def load_skill(directory: Path) -> Skill:
    skill_file = directory / "SKILL.md"
    try:
        meta, body = okf.split_document(skill_file.read_text(encoding="utf-8"))
    except (okf.FrontmatterError, ValueError) as exc:
        return Skill(directory.name, directory, {}, "", [f"SKILL.md : frontmatter illisible ({exc})"])
    return Skill(directory.name, directory, meta or {}, body)


def covered_hashes(skills: list[Skill], files: list[str]) -> dict[str, str]:
    """Blob hashes of the files at least one skill governs (the only ones a digest uses)."""
    return blob_hashes([f for f in files if any(s.covers(f) for s in skills)])


def load_skills() -> list[Skill]:
    """Project skills: real directories, governed as OKF bundles."""
    return [
        load_skill(d)
        for d in sorted(SKILLS_DIR.iterdir())
        if d.is_dir() and not d.is_symlink() and not d.name.startswith(".") and (d / "SKILL.md").exists()
    ]


@dataclass
class PluginSkill:
    name: str
    description: str
    target: str


def load_plugin_skills() -> list[PluginSkill]:
    """Third-party skills linked into .agents/skills (e.g. the matt-pocock plugin): listed, never rewritten."""
    plugins = []
    for d in sorted(SKILLS_DIR.iterdir()):
        if not (d.is_symlink() and (d / "SKILL.md").exists()):
            continue
        try:
            meta, _ = okf.split_document((d / "SKILL.md").read_text(encoding="utf-8"))
        except (okf.FrontmatterError, ValueError):
            meta = {}
        meta = meta or {}
        target = os.path.relpath(d.resolve(), REPO)
        plugins.append(PluginSkill(d.name, str(meta.get("description") or "").strip(), target))
    return plugins


def _first_sentence(text: str, limit: int = 170) -> str:
    sentence = re.split(r"(?<=[.!?])\s", text.strip(), maxsplit=1)[0]
    return sentence if len(sentence) <= limit else sentence[: limit - 1].rstrip() + "…"


def concept_files(skill: Skill) -> list[Path]:
    return sorted(
        p for p in skill.path.rglob("*.md")
        if p.name not in okf.RESERVED and p.name != "SKILL.md" and "scripts" not in p.parts
    )


def citations(skill: Skill) -> dict[str, list[str]]:
    """{repo file: [document (source-id)]} for every local `sources[].resource` of the bundle."""
    result: dict[str, list[str]] = {}
    documents = [(skill.path / "SKILL.md", skill.meta)]
    for doc in concept_files(skill):
        try:
            meta, _ = okf.split_document(doc.read_text(encoding="utf-8"))
        except (okf.FrontmatterError, ValueError):
            continue
        documents.append((doc, meta or {}))
    for doc, meta in documents:
        for source in meta.get("sources") or []:
            if isinstance(source, dict) and _is_local(source.get("resource")):
                label = f"{doc.relative_to(skill.path)} [^{source.get('id')}]"
                result.setdefault(str(source["resource"]).split("#")[0], []).append(label)
    return result


def _is_local(resource: object) -> bool:
    return isinstance(resource, str) and bool(resource) and "://" not in resource


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #

def validate_skill(skill: Skill, files: list[str]) -> list[str]:
    problems = list(skill.problems)
    if skill.problems:
        return problems
    meta = skill.meta
    problems += [f"SKILL.md : {p}" for p in okf.check_concept(meta, skill.body)]
    if meta.get("name") != skill.name:
        problems.append(f"SKILL.md : `name` ({meta.get('name')}) doit être égal au nom du dossier ({skill.name})")
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", skill.name):
        problems.append("nom de dossier invalide : minuscules, chiffres et tirets uniquement")
    if not str(meta.get("description") or "").strip():
        problems.append("SKILL.md : `description` manquante (sert au déclenchement de la skill)")
    for pattern, regex in zip(meta.get("paths") or [], skill.patterns):
        if not any(regex.match(f) for f in files):
            problems.append(f"SKILL.md : `paths` « {pattern} » ne correspond à aucun fichier")
    for doc in concept_files(skill):
        rel = doc.relative_to(skill.path)
        try:
            doc_meta, doc_body = okf.split_document(doc.read_text(encoding="utf-8"))
        except (okf.FrontmatterError, ValueError) as exc:
            problems.append(f"{rel} : frontmatter illisible ({exc})")
            continue
        problems += [f"{rel} : {p}" for p in okf.check_concept(doc_meta, doc_body)]
    for resource in citations(skill):
        if not (REPO / resource).exists():
            problems.append(f"source introuvable : {resource}")
    for reserved in ("index.md", "log.md"):
        target = skill.path / reserved
        if not target.exists():
            problems.append(f"{reserved} manquant (lancer `evolve.py index` / `sync`)")
        elif target.read_text(encoding="utf-8").startswith("---"):
            problems.append(f"{reserved} ne doit pas avoir de frontmatter (fichier réservé OKF)")
    if (skill.path / "index.md").exists() and (skill.path / "index.md").read_text(encoding="utf-8") != render_skill_index(skill):
        problems.append("index.md obsolète (lancer `evolve.py index`)")
    stale_after = okf.parse_utc(meta.get("stale_after"))
    if stale_after and datetime.now(timezone.utc) >= stale_after:
        problems.append(f"contenu périmé depuis {meta['stale_after']} (stale_after)")
    return problems


# --------------------------------------------------------------------------- #
# Change detection
# --------------------------------------------------------------------------- #

@dataclass
class Change:
    file: str
    how: str


@dataclass
class SkillStatus:
    skill: Skill
    changes: list[Change]
    problems: list[str]

    @property
    def stale(self) -> bool:
        return bool(self.changes)


def compute_status() -> tuple[list[SkillStatus], list[str]]:
    skills = load_skills()
    files = repo_files()
    worktree = working_tree_changes()
    oldest = min((s.last_check for s in skills), default=datetime.now(timezone.utc))
    commits = commits_since(oldest)
    hashes = covered_hashes(skills, files)
    statuses = []
    for skill in skills:
        changes: dict[str, Change] = {}
        if skill.last_digest and skill.last_digest == skill.code_digest(hashes):
            # Same content as when the skill was verified: dates (checkout, rebase, commit) are irrelevant.
            statuses.append(SkillStatus(skill, [], validate_skill(skill, files)))
            continue
        own_dir = skill.rel + "/"
        for commit in commits:
            if commit.when <= skill.last_check:
                continue
            for f in commit.files:
                if not skill.covers(f) or f.startswith(own_dir) or f in changes:
                    continue
                target = REPO / f
                # Committing does not touch the file: content last written before the check was already reviewed.
                if target.exists() and datetime.fromtimestamp(target.stat().st_mtime, timezone.utc) <= skill.last_check:
                    continue
                changes[f] = Change(f, f"commit {commit.sha} « {commit.subject[:60]} »")
        for f, status in worktree.items():
            if not skill.covers(f) or f.startswith(own_dir):
                continue
            target = REPO / f
            if target.exists():
                mtime = datetime.fromtimestamp(target.stat().st_mtime, timezone.utc)
                if mtime > skill.last_check:
                    changes[f] = Change(f, "nouveau fichier (non commité)" if status == "??" else "modifié (non commité)")
            else:
                changes[f] = Change(f, "supprimé (non commité)")
        statuses.append(SkillStatus(skill, sorted(changes.values(), key=lambda c: c.file), validate_skill(skill, files)))
    uncovered = sorted(
        f for f in worktree
        if f.startswith(WATCHED_ROOTS) and not f.startswith(".agents/") and (REPO / f).exists()
        and not any(s.covers(f) for s in skills)
    )
    return statuses, uncovered


# --------------------------------------------------------------------------- #
# Plan rendering
# --------------------------------------------------------------------------- #

def last_user_prompt(transcript_path: str | None) -> str:
    if not transcript_path or not Path(transcript_path).exists():
        return ""
    last = ""
    try:
        with open(transcript_path, encoding="utf-8") as handle:
            for line in handle:
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if entry.get("type") != "user":
                    continue
                content = (entry.get("message") or {}).get("content")
                if isinstance(content, str):
                    last = content
                elif isinstance(content, list):
                    texts = [c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"]
                    if texts and not any(isinstance(c, dict) and c.get("type") == "tool_result" for c in content):
                        last = "\n".join(texts)
    except OSError:
        return ""
    return last.strip()


def review_commands(files: list[str], since: str) -> str:
    """`git diff` / `git log -p` per owning repository, with repo-relative paths."""
    roots = repos()
    groups: dict[str, list[str]] = {}
    for f in files:
        prefix, _ = repo_of(f, roots)
        groups.setdefault(prefix, []).append(f[len(prefix):])
    commands = []
    for prefix, paths in groups.items():
        where = prefix.rstrip("/") or "."
        joined = " ".join(paths)
        commands.append(f"git -C {where} diff -- {joined} ; git -C {where} log -p --since={since} -- {joined}")
    return " ; ".join(commands)


def render_plan(statuses: list[SkillStatus], uncovered: list[str], correction: str = "") -> str:
    stale = [s for s in statuses if s.stale]
    invalid = [s for s in statuses if s.problems]
    if not stale and not invalid and not uncovered and not correction:
        return ""
    cmd = f"python3 {SELF}"
    out = ["Boucle d'auto-apprentissage des skills (volontariapp-skill-evolution). Avant de terminer :", ""]
    step = 1
    if stale:
        out.append(f"{step}. Skills dont le code a changé depuis leur dernière vérification :")
        for status in stale:
            skill = status.skill
            since = skill.last_check.strftime("%Y-%m-%dT%H:%M:%SZ")
            cited = citations(skill)
            out.append(f"   - {skill.name} (vérifiée le {since}, {len(status.changes)} fichier(s)) :")
            for change in status.changes[:MAX_FILES_SHOWN]:
                where = cited.get(change.file)
                hint = f" - cité par {', '.join(where)}" if where else ""
                out.append(f"       • {change.file} - {change.how}{hint}")
            if len(status.changes) > MAX_FILES_SHOWN:
                out.append(f"       • … et {len(status.changes) - MAX_FILES_SHOWN} autre(s) ({cmd} status)")
            out.append("     Relire : " + review_commands([c.file for c in status.changes[:MAX_FILES_SHOWN]], since))
            out.append(f"     Puis mettre à jour {skill.rel}/SKILL.md et les références qui citent ces fichiers")
            out.append("     (règles, commandes, chemins, pièges), et ajouter un script si une vérification revient souvent.")
            out.append(f"     Enfin : {cmd} sync {skill.name} --message \"<ce qui a changé>\"")
        step += 1
    if invalid:
        out.append(f"{step}. Non-conformités OKF à corriger :")
        for status in invalid:
            for problem in status.problems[:6]:
                out.append(f"   - {status.skill.name} : {problem}")
        step += 1
    if uncovered:
        shown = ", ".join(uncovered[:MAX_FILES_SHOWN])
        more = f" (+{len(uncovered) - MAX_FILES_SHOWN})" if len(uncovered) > MAX_FILES_SHOWN else ""
        out.append(f"{step}. Fichiers modifiés qu'aucune skill ne couvre : {shown}{more}")
        out.append("   Ajouter le motif au `paths` de la skill concernée, ou créer une skill si le sujet est nouveau :")
        out.append(f"   {cmd} new volontariapp-<sujet> --title \"…\" --description \"…\" --paths \"<glob>\"")
        step += 1
    if correction:
        excerpt = correction.replace("\n", " ")[:240]
        out.append(f"{step}. Le dernier message de l'utilisateur ressemble à une correction : « {excerpt} »")
        out.append("   Si c'est une règle durable, la consigner dans la skill concernée :")
        out.append(f"   {cmd} learn --skill <skill> --kind rule --title \"…\" --insight \"…\" [--source <fichier>]")
        step += 1
    out.append("")
    out.append("Si une skill reste juste après relecture, lancer quand même `sync` : cela enregistre la vérification.")
    out.append("Si une connaissance utile n'appartient à aucune skill, la créer avec `new` puis la remplir.")
    return "\n".join(out)


# --------------------------------------------------------------------------- #
# Writers: index, log, sync, learn, new
# --------------------------------------------------------------------------- #

def _describe_script(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return ""
    match = re.search(r'"""\s*\n?(.+?)\n', text) or re.search(r"^#\s+(?!!)(.+)$", text, re.MULTILINE)
    return match.group(1).strip() if match else ""


def render_skill_index(skill: Skill) -> str:
    title = skill.meta.get("title") or skill.name
    lines = [f"# {title}", "", str(skill.meta.get("description") or "").strip(), "", "## Concepts", ""]
    lines.append(f"- [SKILL.md](/{skill.name}/SKILL.md) - point d'entrée de la skill")
    for doc in concept_files(skill):
        try:
            meta, _ = okf.split_document(doc.read_text(encoding="utf-8"))
        except (okf.FrontmatterError, ValueError):
            meta = {}
        meta = meta or {}
        rel = doc.relative_to(skill.path)
        lines.append(f"- [{meta.get('title') or doc.stem}](/{skill.name}/{rel}) - {meta.get('description') or meta.get('type') or ''}".rstrip(" -"))
    scripts = sorted(p for p in (skill.path / "scripts").glob("*") if p.is_file() and p.suffix in (".py", ".sh")) if (skill.path / "scripts").exists() else []
    if scripts:
        lines += ["", "## Scripts", ""]
        for script in scripts:
            desc = _describe_script(script)
            lines.append(f"- [`{script.name}`](/{skill.name}/scripts/{script.name})" + (f" - {desc}" if desc else ""))
    lines += ["", "Historique : [log.md](/" + skill.name + "/log.md)", ""]
    return "\n".join(lines)


def render_root_index(skills: list[Skill]) -> str:
    lines = [
        "# Skills agentiques Volontariapp",
        "",
        "Bundle OKF v0.2. Chaque skill est un sous-bundle : `SKILL.md` (point d'entrée), `references/` (concepts),",
        "`scripts/` (outils exécutables), `index.md` et `log.md` (fichiers réservés OKF).",
        "Le cycle de vie des skills est géré par [volontariapp-skill-evolution](/volontariapp-skill-evolution/SKILL.md).",
        "",
        "| Skill | Domaine | Dernière vérification |",
        "| :--- | :--- | :--- |",
    ]
    for skill in skills:
        title = skill.meta.get("title") or skill.name
        checked = skill.last_check.strftime("%Y-%m-%d") if skill.last_check.year > 1970 else "jamais"
        lines.append(f"| [{skill.name}](/{skill.name}/SKILL.md) | {title} | {checked} |")
    plugins = load_plugin_skills()
    if plugins:
        lines += [
            "",
            "## Skills du plugin matt-pocock",
            "",
            "Liens symboliques vers `.agents/plugins/matt-pocock/skills/` : listés ici, jamais modifiés par `evolve.py`.",
            "",
            "| Skill | Usage |",
            "| :--- | :--- |",
        ]
        lines += [f"| [{p.name}](/{p.name}/SKILL.md) | {_first_sentence(p.description)} |" for p in plugins]
    lines += ["", "Historique global : [log.md](/log.md)", ""]
    return "\n".join(lines)


def render_agents_section(skills: list[Skill]) -> str:
    lines = [
        AGENTS_START,
        "",
        "### Skills du projet (`.agents/skills/volontariapp-*`)",
        "",
        "| Skill | Quand l'utiliser |",
        "| :--- | :--- |",
    ]
    lines += [
        f"| [`{s.name}`](.agents/skills/{s.name}/SKILL.md) | {_first_sentence(str(s.meta.get('description') or ''))} |"
        for s in skills
    ]
    plugins = load_plugin_skills()
    if plugins:
        lines += ["", "### Skills du plugin matt-pocock", "", "| Skill | Quand l'utiliser |", "| :--- | :--- |"]
        lines += [f"| [`{p.name}`](.agents/skills/{p.name}/SKILL.md) | {_first_sentence(p.description)} |" for p in plugins]
    lines += ["", AGENTS_END]
    return "\n".join(lines)


def agents_md_expected(skills: list[Skill]) -> str | None:
    if not AGENTS_MD.exists():
        return None
    text = AGENTS_MD.read_text(encoding="utf-8")
    if AGENTS_START not in text or AGENTS_END not in text:
        return None
    head, rest = text.split(AGENTS_START, 1)
    _, tail = rest.split(AGENTS_END, 1)
    return head + render_agents_section(skills) + tail


def mesh_keys(skill: Skill) -> tuple[list[str], bool]:
    """(keys, explicit): `mesh_keys` from the frontmatter, else derived from the literal prefix of `paths`."""
    raw = skill.meta.get("mesh_keys")
    if isinstance(raw, list) and raw:
        return [str(k) for k in raw if str(k).strip()], True
    derived = []
    for pattern in (str(p) for p in skill.meta.get("paths") or []):
        cut = re.search(r"[*?\[]", pattern)
        literal = pattern if cut is None else pattern[: cut.start()]
        if cut is not None and not literal.endswith("/"):
            # A glob inside a segment ("ms-*"): keep only the complete segments before it.
            literal = literal.rsplit("/", 1)[0] if "/" in literal else ""
        key = literal.rstrip("/")
        if len(key) >= MESH_MIN_KEY and not key.startswith(".agents/") and key not in derived:
            derived.append(key)
    return derived, False


def mesh_conflicts(skills: list[Skill]) -> dict[str, list[str]]:
    owners: dict[str, list[str]] = {}
    for skill in skills:
        for key in mesh_keys(skill)[0]:
            owners.setdefault(key.lower(), []).append(skill.name)
    return {k: v for k, v in owners.items() if len(v) > 1}


def render_mesh_block(skills: list[Skill]) -> str:
    lines = [MESH_START]
    for skill in skills:
        keys, explicit = mesh_keys(skill)
        if not keys:
            continue
        origin = "" if explicit else " (clés dérivées de `paths` : déclarer `mesh_keys`)"
        lines.append(f"# {skill.name}{origin}")
        lines += [f'{json.dumps(k, ensure_ascii=False)} = "skills/{skill.name}/SKILL.md"' for k in keys]
    lines.append(MESH_END)
    return "\n".join(lines)


def mesh_toml_expected(skills: list[Skill]) -> str | None:
    if not MESH_TOML.exists():
        return None
    text = MESH_TOML.read_text(encoding="utf-8")
    if MESH_START not in text or MESH_END not in text:
        return None
    head, rest = text.split(MESH_START, 1)
    _, tail = rest.split(MESH_END, 1)
    return head + render_mesh_block(skills) + tail


def write_indexes() -> list[str]:
    written = []
    skills = load_skills()
    for skill in skills:
        target = skill.path / "index.md"
        content = render_skill_index(skill)
        if not target.exists() or target.read_text(encoding="utf-8") != content:
            target.write_text(content, encoding="utf-8")
            written.append(str(target.relative_to(REPO)))
    root = SKILLS_DIR / "index.md"
    content = render_root_index(skills)
    if not root.exists() or root.read_text(encoding="utf-8") != content:
        root.write_text(content, encoding="utf-8")
        written.append(str(root.relative_to(REPO)))
    expected = agents_md_expected(skills)
    if expected is not None and AGENTS_MD.read_text(encoding="utf-8") != expected:
        AGENTS_MD.write_text(expected, encoding="utf-8")
        written.append("AGENTS.md")
    mesh = mesh_toml_expected(skills)
    if mesh is not None and MESH_TOML.read_text(encoding="utf-8") != mesh:
        MESH_TOML.write_text(mesh, encoding="utf-8")
        written.append(str(MESH_TOML.relative_to(REPO)))
    return written


def append_log(directory: Path, action: str, message: str, actor: str) -> None:
    """Add an entry under today's `## YYYY-MM-DD` heading, newest first."""
    target = directory / "log.md"
    today = okf.now_utc()[:10]
    title = "# Historique" if directory != SKILLS_DIR else "# Historique des skills"
    text = target.read_text(encoding="utf-8") if target.exists() else f"{title}\n"
    entry = f"- **{action}** - {message} ({actor})"
    heading = f"## {today}"
    if heading in text:
        text = text.replace(heading + "\n\n", f"{heading}\n\n{entry}\n", 1)
    else:
        lines = text.split("\n", 1)
        head, rest = lines[0], (lines[1] if len(lines) > 1 else "")
        text = f"{head}\n\n{heading}\n\n{entry}\n" + ("\n" + rest.lstrip("\n") if rest.strip() else "")
    target.write_text(text.rstrip("\n") + "\n", encoding="utf-8")


def save_skill(skill: Skill) -> None:
    (skill.path / "SKILL.md").write_text(okf.render_document(skill.meta, skill.body), encoding="utf-8")


def sync(names: list[str], actor: str, message: str) -> list[str]:
    skills = {s.name: s for s in load_skills()}
    unknown = [n for n in names if n not in skills]
    if unknown:
        raise SystemExit(f"Skill(s) inconnue(s) : {', '.join(unknown)}")
    stamp = okf.now_utc()
    hashes = covered_hashes(list(skills.values()), repo_files())
    for name in names:
        skill = skills[name]
        events = skill.verified_events + [{"by": actor, "at": stamp, "digest": skill.code_digest(hashes)}]
        skill.meta["verified"] = events[-MAX_VERIFIED:]
        save_skill(skill)
        append_log(skill.path, "Vérification", message or "skill relue et alignée sur le code", actor)
    write_indexes()
    return names


def learn(skill_name: str, title: str, insight: str, kind: str, source: str | None, actor: str) -> Path:
    skills = {s.name: s for s in load_skills()}
    if skill_name not in skills:
        raise SystemExit(f"Skill inconnue : {skill_name} (créer d'abord avec `new`)")
    skill = skills[skill_name]
    target = skill.path / "references" / "lessons.md"
    target.parent.mkdir(exist_ok=True)
    stamp = okf.now_utc()
    if target.exists():
        meta, body = okf.split_document(target.read_text(encoding="utf-8"))
        meta = meta or {}
    else:
        meta = {
            "type": "Lessons Learned",
            "title": "Leçons apprises",
            "description": f"Règles et pièges découverts en travaillant sur {skill_name}, du plus récent au plus ancien.",
            "tags": ["lessons", skill_name],
            "status": "stable",
            "generated": {"by": actor, "at": stamp},
            "sources": [],
        }
        body = "# Leçons\n"
    footnote = ""
    if source:
        source_id = "src-" + hashlib.sha1(source.encode()).hexdigest()[:8]
        sources = meta.setdefault("sources", []) or []
        if not any(s.get("id") == source_id for s in sources if isinstance(s, dict)):
            sources.append({"id": source_id, "resource": source, "title": source})
        meta["sources"] = sources
        footnote = f"[^{source_id}]"
    entry = f"\n## {stamp[:10]} - {title}\n\n- **Type :** {kind}\n- **Leçon :** {insight}{footnote}\n- **Consigné par :** {actor}\n"
    head, _, rest = body.lstrip("\n").partition("\n")
    body = head + "\n" + entry + ("\n" + rest.lstrip("\n") if rest.strip() else "")
    footnotes = [f"[^{s['id']}]: {s.get('title') or s['resource']}" for s in meta.get("sources") or [] if isinstance(s, dict)]
    body = re.sub(r"\n\[\^[\w\-]+\]:.*", "", body).rstrip() + ("\n\n" + "\n".join(footnotes) if footnotes else "") + "\n"
    target.write_text(okf.render_document(meta, body), encoding="utf-8")
    append_log(skill.path, "Leçon", f"{title} ({kind})", actor)
    write_indexes()
    return target


SKILL_TEMPLATE = """# {title}

## Quand utiliser cette skill

{description}

## Règles

- (à compléter : règles durables, chacune justifiée par une source ou une leçon)

## Références

- [Leçons apprises](/{name}/references/lessons.md)

## Scripts

- (à compléter : vérifications exécutables propres à ce domaine)
"""


def new_skill(name: str, title: str, description: str, paths: list[str], tags: list[str], actor: str,
              keys: list[str] | None = None) -> Path:
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name):
        raise SystemExit("Nom invalide : minuscules, chiffres et tirets uniquement (ex. volontariapp-saga-rollback)")
    directory = SKILLS_DIR / name
    if directory.exists():
        raise SystemExit(f"La skill {name} existe déjà : la compléter plutôt que la recréer")
    (directory / "references").mkdir(parents=True)
    (directory / "scripts").mkdir()
    stamp = okf.now_utc()
    meta = {
        "name": name,
        "description": description,
        "type": "Agent Skill",
        "title": title,
        "tags": tags or [name.removeprefix("volontariapp-")],
        "status": "draft",
        "paths": paths,
        **({"mesh_keys": keys} if keys else {}),
        "generated": {"by": actor, "at": stamp},
        "verified": [{"by": actor, "at": stamp}],
        "sources": [],
    }
    body = SKILL_TEMPLATE.format(title=title, description=description, name=name)
    (directory / "SKILL.md").write_text(okf.render_document(meta, body), encoding="utf-8")
    learn(name, "Création de la skill", f"Skill créée pour couvrir : {', '.join(paths) or 'à préciser'}.", "decision", None, actor)
    append_log(directory, "Création", "squelette OKF généré par evolve.py new", actor)
    append_log(SKILLS_DIR, "Nouvelle skill", f"[{name}](/{name}/SKILL.md) - {title}", actor)
    write_indexes()
    return directory


# --------------------------------------------------------------------------- #
# Hook state (per clone, never committed)
# --------------------------------------------------------------------------- #

def _state_path() -> Path:
    return git_dir() / STATE_FILE


def load_state() -> dict:
    try:
        return json.loads(_state_path().read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def save_state(state: dict) -> None:
    try:
        _state_path().write_text(json.dumps(state, indent=1), encoding="utf-8")
    except OSError:
        pass


# --------------------------------------------------------------------------- #
# Commands
# --------------------------------------------------------------------------- #

def cmd_status(args: argparse.Namespace) -> int:
    statuses, uncovered = compute_status()
    if args.json:
        print(json.dumps({
            "skills": [{
                "name": s.skill.name,
                "last_check": s.skill.last_check.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "stale": s.stale,
                "changes": [{"file": c.file, "how": c.how} for c in s.changes],
                "problems": s.problems,
            } for s in statuses],
            "uncovered": uncovered,
        }, ensure_ascii=False, indent=1))
        return 0
    for s in statuses:
        state = "À METTRE À JOUR" if s.stale else ("NON CONFORME" if s.problems else "à jour")
        print(f"{s.skill.name:32} {state:16} vérifiée {s.skill.last_check:%Y-%m-%d %H:%M}Z  "
              f"{len(s.changes)} changement(s), {len(s.problems)} problème(s)")
    if uncovered:
        print(f"\nNon couverts : {', '.join(uncovered)}")
    return 0


def cmd_plan(args: argparse.Namespace) -> int:
    statuses, uncovered = compute_status()
    plan = render_plan(statuses, uncovered)
    print(plan or "Toutes les skills sont à jour et conformes.")
    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    files = repo_files()
    failed = False
    for skill in load_skills():
        for problem in validate_skill(skill, files):
            failed = True
            print(f"{skill.name}: {problem}")
    root = SKILLS_DIR / "index.md"
    if not root.exists() or root.read_text(encoding="utf-8") != render_root_index(load_skills()):
        failed = True
        print("index.md racine obsolète (lancer `evolve.py index`)")
    expected = agents_md_expected(load_skills())
    if expected is None:
        failed = True
        print("AGENTS.md : section d'index des skills absente (marqueurs skills-index)")
    elif AGENTS_MD.read_text(encoding="utf-8") != expected:
        failed = True
        print("AGENTS.md : index des skills obsolète (lancer `evolve.py index`)")
    if MESH_TOML.exists():
        mesh = mesh_toml_expected(load_skills())
        if mesh is None:
            failed = True
            print(f"{MESH_TOML.relative_to(REPO)} : marqueurs skills-mesh absents dans [engines.policy.skills]")
        elif MESH_TOML.read_text(encoding="utf-8") != mesh:
            failed = True
            print(f"{MESH_TOML.relative_to(REPO)} : table des skills obsolète (lancer `evolve.py index`)")
    for key, names in sorted(mesh_conflicts(load_skills()).items()):
        failed = True
        print(f"mesh_keys : « {key} » est déclarée par plusieurs skills ({', '.join(names)})")
    for skill in load_skills():
        keys, explicit = mesh_keys(skill)
        if not explicit:
            print(f"avertissement : {skill.name} n'a pas de `mesh_keys` ({'clés dérivées : ' + ', '.join(keys) if keys else 'aucune clé'})")
    for plugin in load_plugin_skills():
        if not plugin.description:
            print(f"avertissement : la skill du plugin {plugin.name} n'a pas de description")
    if not failed:
        print("Bundle OKF conforme.")
    return 1 if failed else 0


def cmd_sync(args: argparse.Namespace) -> int:
    names = [s.name for s in load_skills()] if args.all else args.skills
    if not names:
        raise SystemExit("Préciser une ou plusieurs skills, ou --all")
    for name in sync(names, args.by, args.message):
        print(f"Vérification enregistrée : {name}")
    return 0


def cmd_learn(args: argparse.Namespace) -> int:
    target = learn(args.skill, args.title, args.insight, args.kind, args.source, args.by)
    print(f"Leçon ajoutée : {target.relative_to(REPO)}")
    return 0


def cmd_new(args: argparse.Namespace) -> int:
    directory = new_skill(args.name, args.title, args.description, args.paths, args.tags, args.by, args.mesh_keys)
    print(f"Skill créée : {directory.relative_to(REPO)} (statut draft, à compléter)")
    return 0


def cmd_index(args: argparse.Namespace) -> int:
    written = write_indexes()
    print("\n".join(f"Régénéré : {w}" for w in written) or "Index déjà à jour.")
    return 0


def cmd_owners(args: argparse.Namespace) -> int:
    skills = load_skills()
    for file in args.files:
        rel = str(Path(file).resolve().relative_to(REPO)) if Path(file).is_absolute() else file
        owners = [s.name for s in skills if s.covers(rel)]
        print(f"{rel}: {', '.join(owners) or 'aucune skill'}")
    return 0


def cmd_check_staged(args: argparse.Namespace) -> int:
    """Gate for the repository the commit runs in (meta or a nested repo), paths made meta-relative."""
    top = Path(git("rev-parse", "--show-toplevel", cwd=Path.cwd()).strip() or REPO).resolve()
    prefix = "" if top == REPO.resolve() else os.path.relpath(top, REPO.resolve()) + "/"
    if prefix.startswith(".."):
        return 0
    staged = [prefix + f for f in git("diff", "--cached", "--name-only", cwd=top).splitlines() if f]
    skills = load_skills()
    hashes = covered_hashes(skills, repo_files())
    skills = [s for s in skills if not (s.last_digest and s.last_digest == s.code_digest(hashes))]
    stale: dict[str, list[str]] = {}
    for f in staged:
        if f.startswith(".agents/") or not (REPO / f).exists():
            continue
        mtime = datetime.fromtimestamp((REPO / f).stat().st_mtime, timezone.utc)
        for skill in skills:
            if skill.covers(f) and mtime > skill.last_check:
                stale.setdefault(skill.name, []).append(f)
    if not stale:
        return 0
    here = Path.cwd()
    evolve = os.path.relpath(REPO.resolve() / SELF, here)
    repo_label = prefix.rstrip("/") or REPO.name
    print(f"Skills de meta à vérifier avant ce commit dans {repo_label} (le code qu'elles décrivent a changé) :")
    for name, files in stale.items():
        skill_md = os.path.relpath(SKILLS_DIR.resolve() / name / "SKILL.md", here)
        print(f"  - {name} ({skill_md}) : {', '.join(f[len(prefix):] for f in files[:MAX_FILES_SHOWN])}")
    print("\nRelire la skill, la corriger si une règle, un chemin ou une commande change, puis enregistrer la vérification :")
    print(f"  python3 {evolve} sync <skill> --by human:<vous> --message \"<ce qui a changé>\"")
    if prefix:
        print("La skill vit dans meta : commiter aussi meta (source de vérité des skills).")
    print("Contournement volontaire : SKIP_SKILL_CHECK=1 git commit ...  Avertir sans bloquer : SKILL_CHECK_MODE=warn")
    return 0 if getattr(args, "warn", False) else 1


def cmd_hook(args: argparse.Namespace) -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        payload = {}
    if payload.get("stop_hook_active"):
        return 0
    statuses, uncovered = compute_status()
    prompt = last_user_prompt(payload.get("transcript_path"))
    correction = prompt if prompt and CORRECTION_MARKERS.search(prompt) else ""
    plan = render_plan(statuses, uncovered, correction)
    if not plan:
        return 0
    fingerprint = hashlib.sha1(plan.encode()).hexdigest()
    state = load_state()
    if state.get("last_plan") == fingerprint:
        return 0
    state["last_plan"] = fingerprint
    save_state(state)
    print(json.dumps({"decision": "block", "reason": plan}, ensure_ascii=False))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("status")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=cmd_status)
    sub.add_parser("plan").set_defaults(func=cmd_plan)
    sub.add_parser("validate").set_defaults(func=cmd_validate)
    sub.add_parser("index").set_defaults(func=cmd_index)
    p = sub.add_parser("check-staged")
    p.add_argument("--warn", action="store_true", help="affiche les skills à vérifier sans bloquer le commit")
    p.set_defaults(func=cmd_check_staged)
    sub.add_parser("hook").set_defaults(func=cmd_hook)

    p = sub.add_parser("sync")
    p.add_argument("skills", nargs="*")
    p.add_argument("--all", action="store_true")
    p.add_argument("--by", default=DEFAULT_ACTOR)
    p.add_argument("--message", default="")
    p.set_defaults(func=cmd_sync)

    p = sub.add_parser("learn")
    p.add_argument("--skill", required=True)
    p.add_argument("--title", required=True)
    p.add_argument("--insight", required=True)
    p.add_argument("--kind", default="rule", choices=["rule", "pitfall", "command", "decision"])
    p.add_argument("--source")
    p.add_argument("--by", default=DEFAULT_ACTOR)
    p.set_defaults(func=cmd_learn)

    p = sub.add_parser("new")
    p.add_argument("name")
    p.add_argument("--title", required=True)
    p.add_argument("--description", required=True)
    p.add_argument("--paths", nargs="+", default=[])
    p.add_argument("--tags", nargs="*", default=[])
    p.add_argument("--mesh-keys", nargs="*", default=[],
                   help="sujets mesh-mcp qui recommandent la skill (nom d'outil ou fragment de scope/target)")
    p.add_argument("--by", default=DEFAULT_ACTOR)
    p.set_defaults(func=cmd_new)

    p = sub.add_parser("owners")
    p.add_argument("files", nargs="+")
    p.set_defaults(func=cmd_owners)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
