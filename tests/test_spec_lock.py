import hashlib
import json
import os
from pathlib import Path


ROOT = Path(__file__).parents[1]


def test_spec_lock_matches_documents_and_binding():
    lock = json.loads((ROOT / "docs" / "SPEC-LOCK.json").read_text(encoding="utf-8"))
    assert lock["project_slug"] == "trialign"
    assert lock["track"] == "PROJECTS"
    assert lock["registry_record_hash"] == (
        "dab8d5af9bb3edc8aab2c89c7bdd8550e72869894268fae370e7cdad56c6d8a2"
    )
    for name, expected in lock["documents"].items():
        actual = hashlib.sha256((ROOT / "docs" / name).read_bytes()).hexdigest()
        assert actual == expected, name


def test_public_tree_excludes_parent_control_artifacts():
    forbidden = {
        "AGENTS.md",
        "CLAUDE.md",
        "PROCESS.md",
        "BUILD-RULES.md",
        "MASTER-PROMPT-FORGE-END-TO-END.md",
    }
    ignored_directories = {
        ".git",
        ".next",
        ".pytest_cache",
        ".venv",
        "__pycache__",
        "artifacts",
        "node_modules",
    }
    public_names = set()
    for current, directories, files in os.walk(ROOT):
        directories[:] = [
            name for name in directories if name not in ignored_directories
        ]
        public_names.update(files)
    assert not forbidden.intersection(public_names)
