"""Every published example, across families, must validate through both the
pydantic models and the normative JSON Schema. This exercises the family-agnostic
design: an LDO and a MOSFET share one envelope."""

import json

import pytest

from datasheet_schema.validation import bundled_schema_path
from datasheet_schema import Datasheet, validate_document

REPO_ROOT = bundled_schema_path().parents[1]
EXAMPLE_PATHS = sorted((REPO_ROOT / "examples").glob("*.datasheet.json"))


@pytest.mark.parametrize("path", EXAMPLE_PATHS, ids=lambda p: p.name)
def test_example_validates(path):
    doc = json.loads(path.read_text(encoding="utf-8"))
    model = validate_document(doc)
    assert isinstance(model, Datasheet)


def test_mosfet_example_present_and_uses_fet_pins():
    mosfet = [p for p in EXAMPLE_PATHS if p.name.startswith("mosfet-")]
    assert mosfet, "expected at least one mosfet example"
    doc = json.loads(mosfet[0].read_text(encoding="utf-8"))
    model = validate_document(doc)
    functions = {pin.function for pin in model.pinout or []}
    assert {"G", "D", "S"} <= functions
