from pathlib import Path
import re
import xml.etree.ElementTree as ET


ROOT = Path(__file__).parents[1]
PORTAL = ROOT / "docs" / "PORTAL-FIELDS.md"
README = ROOT / "README.md"
LOGO = ROOT / "frontend" / "public" / "trialign-logo.svg"
LAYOUT = ROOT / "frontend" / "src" / "app" / "layout.tsx"


def section(document: str, heading: str) -> str:
    match = re.search(
        rf"^## {re.escape(heading)}\s*$\n+(.*?)(?=^## |\Z)",
        document,
        flags=re.MULTILINE | re.DOTALL,
    )
    assert match, f"missing listing section: {heading}"
    return match.group(1).strip()


def test_listing_has_name_category_logo_and_plain_one_liner():
    portal = PORTAL.read_text(encoding="utf-8")
    assert section(portal, "Title") == "Trialign"
    assert section(portal, "Category") == "Projects"
    assert section(portal, "Logo") == "`frontend/public/trialign-logo.svg`"
    one_liner = section(portal, "One-liner")
    assert len(one_liner) <= 120
    assert "clinical trial" in one_liner.lower()
    assert "publication" in one_liner.lower()


def test_listing_description_names_audience_purpose_and_reason_to_use_it():
    description = section(PORTAL.read_text(encoding="utf-8"), "Short description")
    assert "research" in description.lower()
    assert "review" in description.lower()
    assert "canonical" in description.lower()


def test_how_to_try_is_fresh_user_complete_and_uses_verified_demo_inputs():
    instructions = section(PORTAL.read_text(encoding="utf-8"), "How to try")
    required = (
        "Connect wallet",
        "NCT05340465",
        "41430711",
        "Accepted",
        "Finalized",
        "canonical",
        "Disconnect",
    )
    for value in required:
        assert value.lower() in instructions.lower()
    assert len(re.findall(r"^\d+\.", instructions, flags=re.MULTILINE)) >= 10


def test_listing_uses_verified_studio_preview_and_canonical_tx_route():
    portal = PORTAL.read_text(encoding="utf-8")
    assert section(portal, "Availability") == "Preview — deployed on GenLayer Studio."
    assert "https://explorer-studio.genlayer.com/address/" in portal
    assert "https://explorer-studio.genlayer.com/tx/" in portal
    assert "explorer-studio.genlayer.com/transactions/" not in portal


def test_logo_is_a_square_svg_with_accessible_listing_metadata():
    root = ET.parse(LOGO).getroot()
    assert root.attrib["viewBox"] == "0 0 512 512"
    assert root.find("{http://www.w3.org/2000/svg}title").text == "Trialign logo"
    assert root.find("{http://www.w3.org/2000/svg}desc") is not None


def test_app_metadata_uses_the_same_listing_logo():
    layout = LAYOUT.read_text(encoding="utf-8")
    assert 'icon: "/trialign-logo.svg"' in layout
    assert 'apple: "/trialign-logo.svg"' in layout


def test_readme_points_new_users_to_the_exact_listing_walkthrough():
    readme = README.read_text(encoding="utf-8")
    assert "docs/PORTAL-FIELDS.md#how-to-try" in readme
