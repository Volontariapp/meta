"""Tests for evolve.py and okf.py (stdlib only).

Run: python3 -m unittest discover -s .agents/skills/volontariapp-skill-evolution/tests
"""

from __future__ import annotations

import argparse
import io
import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from contextlib import redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import evolve  # noqa: E402
import okf  # noqa: E402


class FrontmatterTests(unittest.TestCase):
    def test_round_trip_keeps_nested_structures(self):
        meta = {
            "name": "volontariapp-x",
            "description": "Usage : quand X change, ou Y.",
            "type": "Agent Skill",
            "tags": ["a", "b"],
            "paths": ["backend/app/**", "Makefile"],
            "generated": {"by": "claude-code/model", "at": "2026-10-03T10:00:00Z"},
            "verified": [{"by": "human:victor", "at": "2026-10-03T11:00:00Z"}],
            "sources": [{"id": "s1", "resource": "backend/app/main.py", "title": "main"}],
        }
        text = okf.render_document(meta, "# Titre\n")
        parsed, body = okf.split_document(text)
        self.assertEqual(parsed, meta)
        self.assertEqual(body, "# Titre\n")

    def test_reserved_indicator_is_quoted(self):
        text = okf.emit_yaml({"keys": ["@volontariapp/", "-x", "plain"]})
        self.assertIn('- "@volontariapp/"', text)
        self.assertIn('- "-x"', text)
        self.assertIn("- plain", text)

    def test_block_list_at_same_indent_as_key(self):
        parsed = okf.parse_yaml("type: X\npaths:\n- a/**\n- b\n")
        self.assertEqual(parsed["paths"], ["a/**", "b"])

    def test_document_without_frontmatter(self):
        meta, body = okf.split_document("# Juste un titre\n")
        self.assertIsNone(meta)
        self.assertEqual(okf.check_concept(meta, body), ["frontmatter YAML manquant"])


class ConformanceTests(unittest.TestCase):
    def test_missing_type_and_bad_actor(self):
        problems = okf.check_concept({"generated": {"by": "robot", "at": "hier"}}, "")
        self.assertTrue(any("`type`" in p for p in problems))
        self.assertTrue(any("generated.by" in p for p in problems))
        self.assertTrue(any("generated.at" in p for p in problems))

    def test_footnote_without_source(self):
        problems = okf.check_concept({"type": "X", "sources": [{"id": "a"}]}, "Fait.[^a] Autre.[^b]\n\n[^a]: A\n")
        self.assertEqual(problems, ["note `[^b]` sans entrée `sources` correspondante"])

    def test_footnote_syntax_in_code_is_ignored(self):
        body = "Écrire `[^id]` pour citer.\n\n```\nTexte[^x]\n```\n"
        self.assertEqual(okf.check_concept({"type": "X"}, body), [])


class GlobTests(unittest.TestCase):
    def test_double_star_and_single_star(self):
        self.assertTrue(evolve.glob_to_regex("backend/app/**").match("backend/app/a/b.py"))
        self.assertTrue(evolve.glob_to_regex("backend/**/x.py").match("backend/x.py"))
        self.assertTrue(evolve.glob_to_regex("backend/Dockerfile.*").match("backend/Dockerfile.api"))
        self.assertFalse(evolve.glob_to_regex("backend/*.py").match("backend/app/main.py"))


class RepoTestCase(unittest.TestCase):
    """A throwaway git repository with one skill covering src/**."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name)
        self._saved = (evolve.REPO, evolve.SKILLS_DIR, evolve.AGENTS_MD, evolve.MESH_TOML)
        evolve.REPO = self.repo
        evolve.SKILLS_DIR = self.repo / ".agents" / "skills"
        evolve.AGENTS_MD = self.repo / "AGENTS.md"
        # Never the real meta file: a test repo has no mesh-mcp.toml unless a test writes one.
        evolve.MESH_TOML = self.repo / ".agents" / "mesh-mcp.toml"
        self.git("init", "-q")
        self.git("config", "user.email", "test@example.com")
        self.git("config", "user.name", "test")
        (self.repo / "src").mkdir()
        (self.repo / "src" / "app.py").write_text("x = 1\n")
        (self.repo / "AGENTS.md").write_text(f"# Agents\n\n{evolve.AGENTS_START}\n{evolve.AGENTS_END}\n")
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "code initial")
        # Timestamps have one-second resolution: verify the skill strictly after the initial commit.
        time.sleep(1.1)
        with redirect_stdout(io.StringIO()):
            evolve.new_skill("volontariapp-demo", "Démo", "Skill de démonstration.", ["src/**"], [], "process:test")
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "skill")

    def tearDown(self):
        evolve.REPO, evolve.SKILLS_DIR, evolve.AGENTS_MD, evolve.MESH_TOML = self._saved
        self.tmp.cleanup()

    def git(self, *args: str) -> None:
        subprocess.run(["git", "-C", str(self.repo), *args], check=True, capture_output=True)

    def status(self) -> evolve.SkillStatus:
        statuses, _ = evolve.compute_status()
        return next(s for s in statuses if s.skill.name == "volontariapp-demo")


class EvolutionTests(RepoTestCase):
    def test_new_skill_is_conformant(self):
        self.assertEqual(self.status().problems, [])
        self.assertIn("volontariapp-demo", (self.repo / "AGENTS.md").read_text())

    def test_local_change_makes_skill_stale_until_sync(self):
        time.sleep(1.1)
        (self.repo / "src" / "app.py").write_text("x = 2\n")
        status = self.status()
        self.assertTrue(status.stale)
        self.assertEqual(status.changes[0].file, "src/app.py")
        time.sleep(1.1)
        evolve.sync(["volontariapp-demo"], "process:test", "relu")
        self.assertFalse(self.status().stale)

    def test_committed_change_makes_skill_stale(self):
        time.sleep(1.1)
        (self.repo / "src" / "new.py").write_text("y = 1\n")
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "ajout")
        change = self.status().changes[0]
        self.assertEqual(change.file, "src/new.py")
        self.assertIn("ajout", change.how)

    def test_commit_after_sync_of_reviewed_change_is_not_stale(self):
        time.sleep(1.1)
        (self.repo / "src" / "app.py").write_text("x = 4\n")
        time.sleep(1.1)
        evolve.sync(["volontariapp-demo"], "process:test", "relu avant commit")
        time.sleep(1.1)
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "commit du changement déjà relu")
        self.assertFalse(self.status().stale)

    def test_rewritten_file_with_same_content_is_not_stale(self):
        time.sleep(1.1)
        evolve.sync(["volontariapp-demo"], "process:test", "relu")
        time.sleep(1.1)
        target = self.repo / "src" / "app.py"
        target.write_text(target.read_text())  # what a checkout or rebase does: same content, newer mtime
        self.git("commit", "-q", "--allow-empty", "-m", "rebase")
        self.assertFalse(self.status().stale)

    def test_correction_detection_ignores_tag_questions(self):
        self.assertIsNone(evolve.CORRECTION_MARKERS.search("ça alourdit le repo non ?"))
        self.assertIsNotNone(evolve.CORRECTION_MARKERS.search("Non, utilise plutôt X"))
        # "STOP" is a domain term here (règle du STOP), not a correction.
        self.assertIsNone(evolve.CORRECTION_MARKERS.search("Hook PreToolUse STOP : on l'ajoute ? Oui"))

    def test_hook_blocks_once_and_never_when_already_continuing(self):
        time.sleep(1.1)
        (self.repo / "src" / "app.py").write_text("x = 3\n")

        def run_hook(payload: dict) -> str:
            sys.stdin = io.StringIO(json.dumps(payload))
            out = io.StringIO()
            try:
                with redirect_stdout(out):
                    evolve.cmd_hook(None)
            finally:
                sys.stdin = sys.__stdin__
            return out.getvalue()

        self.assertEqual(run_hook({"stop_hook_active": True}), "")
        first = run_hook({})
        self.assertEqual(json.loads(first)["decision"], "block")
        self.assertIn("volontariapp-demo", json.loads(first)["reason"])
        self.assertEqual(run_hook({}), "")

    def test_learn_keeps_heading_and_newest_first(self):
        evolve.learn("volontariapp-demo", "Première", "A.", "rule", "src/app.py", "process:test")
        evolve.learn("volontariapp-demo", "Seconde", "B.", "pitfall", None, "process:test")
        text = (self.repo / ".agents/skills/volontariapp-demo/references/lessons.md").read_text()
        body = text.split("\n---\n", 1)[1]
        self.assertTrue(body.lstrip().startswith("# Leçons"))
        self.assertLess(body.index("Seconde"), body.index("Première"))
        self.assertEqual(self.status().problems, [])

    def test_missing_local_source_is_reported(self):
        skill_md = self.repo / ".agents/skills/volontariapp-demo/SKILL.md"
        meta, body = okf.split_document(skill_md.read_text())
        meta["sources"] = [{"id": "gone", "resource": "src/disparu.py", "title": "disparu"}]
        skill_md.write_text(okf.render_document(meta, body))
        self.assertIn("source introuvable : src/disparu.py", self.status().problems)


class MeshTomlTests(RepoTestCase):
    """`[engines.policy.skills]` of mesh-mcp.toml follows the skills' `mesh_keys`."""

    def setUp(self):
        super().setUp()
        evolve.MESH_TOML.write_text(
            "[workspace]\nname = \"t\"\n\n[engines.policy.skills]\n"
            f"{evolve.MESH_START}\n{evolve.MESH_END}\n"
        )

    def test_new_skill_with_mesh_keys_lands_in_toml(self):
        with redirect_stdout(io.StringIO()):
            evolve.new_skill("volontariapp-jobs", "Jobs", "Jobs.", ["src/**"], [], "process:test", ["fallback_", "baseworker"])
        text = evolve.MESH_TOML.read_text()
        self.assertIn('"fallback_" = "skills/volontariapp-jobs/SKILL.md"', text)
        self.assertIn('"baseworker" = "skills/volontariapp-jobs/SKILL.md"', text)

    def test_keys_are_derived_from_paths_when_missing(self):
        evolve.write_indexes()
        text = evolve.MESH_TOML.read_text()
        self.assertNotIn('"src" =', text)
        skill = next(s for s in evolve.load_skills() if s.name == "volontariapp-demo")
        skill.meta["paths"] = ["ms-*/src/migrations/**", "npm-packages/packages/messaging/src/jobs/**"]
        self.assertEqual(evolve.mesh_keys(skill), (["npm-packages/packages/messaging/src/jobs"], False))

    def test_duplicate_key_and_stale_block_fail_validation(self):
        with redirect_stdout(io.StringIO()):
            evolve.new_skill("volontariapp-a", "A", "A.", ["src/**"], [], "process:test", ["saga"])
            evolve.new_skill("volontariapp-b", "B", "B.", ["src/**"], [], "process:test", ["saga"])
        out = io.StringIO()
        with redirect_stdout(out):
            self.assertEqual(evolve.cmd_validate(None), 1)
        self.assertIn("« saga » est déclarée par plusieurs skills", out.getvalue())
        evolve.MESH_TOML.write_text(evolve.MESH_TOML.read_text().replace('"saga" = "skills/volontariapp-a/SKILL.md"\n', ""))
        out = io.StringIO()
        with redirect_stdout(out):
            evolve.cmd_validate(None)
        self.assertIn("table des skills obsolète", out.getvalue())


class MultiRepoTests(RepoTestCase):
    """`meta` ignores a repository cloned under it; its files are still governed by skills."""

    def setUp(self):
        super().setUp()
        (self.repo / ".gitignore").write_text("svc/\n")
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "ignore nested repo")
        self.svc = self.repo / "svc"
        (self.svc / "src").mkdir(parents=True)
        (self.svc / "src" / "main.ts").write_text("export const a = 1;\n")
        self.git_svc("init", "-q")
        self.git_svc("config", "user.email", "test@example.com")
        self.git_svc("config", "user.name", "test")
        self.git_svc("add", "-A")
        self.git_svc("commit", "-q", "-m", "svc initial")
        time.sleep(1.1)
        with redirect_stdout(io.StringIO()):
            evolve.new_skill("volontariapp-svc", "Svc", "Skill du repo imbriqué.", ["svc/src/**"], [], "process:test")

    def git_svc(self, *args: str) -> None:
        subprocess.run(["git", "-C", str(self.svc), *args], check=True, capture_output=True)

    def svc_status(self) -> evolve.SkillStatus:
        statuses, _ = evolve.compute_status()
        return next(s for s in statuses if s.skill.name == "volontariapp-svc")

    def test_nested_files_are_listed_once_with_meta_prefix(self):
        files = evolve.repo_files()
        self.assertIn("svc/src/main.ts", files)
        self.assertNotIn("svc/", files)
        self.assertEqual(self.svc_status().problems, [])

    def test_uncommitted_change_in_nested_repo_makes_skill_stale(self):
        time.sleep(1.1)
        (self.svc / "src" / "main.ts").write_text("export const a = 2;\n")
        status = self.svc_status()
        self.assertTrue(status.stale)
        self.assertEqual(status.changes[0].file, "svc/src/main.ts")
        self.assertIn("git -C svc diff -- src/main.ts", evolve.render_plan([status], []))

    def test_commit_in_nested_repo_is_labelled_with_repo(self):
        time.sleep(1.1)
        (self.svc / "src" / "other.ts").write_text("export const b = 1;\n")
        self.git_svc("add", "-A")
        self.git_svc("commit", "-q", "-m", "ajout svc")
        change = self.svc_status().changes[0]
        self.assertEqual(change.file, "svc/src/other.ts")
        self.assertIn("svc@", change.how)

    def test_check_staged_from_nested_repo_blocks_or_warns(self):
        time.sleep(1.1)
        (self.svc / "src" / "main.ts").write_text("export const a = 4;\n")
        self.git_svc("add", "-A")
        previous = Path.cwd()
        os.chdir(self.svc)
        try:
            out = io.StringIO()
            with redirect_stdout(out):
                self.assertEqual(evolve.cmd_check_staged(argparse.Namespace(warn=False)), 1)
            self.assertIn("../.agents/skills/volontariapp-svc/SKILL.md", out.getvalue())
            self.assertIn("src/main.ts", out.getvalue())
            self.assertIn("commiter aussi meta", out.getvalue())
            with redirect_stdout(io.StringIO()):
                self.assertEqual(evolve.cmd_check_staged(argparse.Namespace(warn=True)), 0)
        finally:
            os.chdir(previous)

    def test_sync_clears_nested_change(self):
        time.sleep(1.1)
        (self.svc / "src" / "main.ts").write_text("export const a = 3;\n")
        time.sleep(1.1)
        evolve.sync(["volontariapp-svc"], "process:test", "relu")
        self.assertFalse(self.svc_status().stale)


if __name__ == "__main__":
    os.environ.setdefault("PYTHONDONTWRITEBYTECODE", "1")
    unittest.main()
