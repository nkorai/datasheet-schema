"""Shared test fixtures."""

import json
from pathlib import Path

import pytest

from datasheet_schema.validation import bundled_schema_path

# The repository root is the parent of the schema/ directory.
REPO_ROOT = bundled_schema_path().parents[1]
EXAMPLE_PATH = REPO_ROOT / "examples" / "ldo-tlv70033.datasheet.json"


@pytest.fixture
def example_document() -> dict:
    return json.loads(Path(EXAMPLE_PATH).read_text(encoding="utf-8"))
