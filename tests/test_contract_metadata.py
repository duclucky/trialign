import ast
import hashlib
import json
from pathlib import Path
import subprocess


CONTRACT = Path(__file__).parents[1] / "contracts" / "trialign.py"
DEPLOYMENT = Path(__file__).parents[1] / "docs" / "evidence" / "studionet" / "deployment.json"


def test_contract_has_exact_runtime_header_and_one_named_contract():
    source = CONTRACT.read_text(encoding="ascii")
    assert source.splitlines()[0] == (
        '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }'
    )
    tree = ast.parse(source)
    contracts = [
        node
        for node in tree.body
        if isinstance(node, ast.ClassDef)
        and any(
            isinstance(base, ast.Attribute)
            and isinstance(base.value, ast.Name)
            and base.value.id == "gl"
            and base.attr == "Contract"
            for base in node.bases
        )
    ]
    assert [item.name for item in contracts] == ["TrialignContract"]


def test_public_write_surface_matches_locked_safety_cards_and_is_not_payable():
    tree = ast.parse(CONTRACT.read_text(encoding="ascii"))
    writes = {}
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        decorators = [ast.unparse(item) for item in node.decorator_list]
        if any(value.startswith("gl.public.write") for value in decorators):
            writes[node.name] = decorators
    assert set(writes) == {
        "create_case",
        "attach_publication",
        "adjudicate",
        "cancel_unattached",
    }
    assert all("payable" not in item for values in writes.values() for item in values)


def test_deployment_identity_binds_a_commit_with_the_exact_deployed_source():
    evidence = json.loads(DEPLOYMENT.read_text(encoding="utf-8"))
    source_at_commit = subprocess.check_output(
        ["git", "show", f"{evidence['sourceCommit']}:contracts/trialign.py"],
        cwd=CONTRACT.parents[1],
    )
    assert hashlib.sha256(source_at_commit).hexdigest() == evidence["sourceSha256"]
    assert evidence["runtimeDependency"] == (
        "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6"
    )
