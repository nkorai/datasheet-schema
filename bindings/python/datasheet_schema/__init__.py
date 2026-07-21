"""Python binding for the Datasheet Schema.

Intentionally dumb: it imports the schema and family dictionaries as data and
exposes their file paths. There is no validation, no models, and no extraction
logic here — that executable behavior will ship as a separate library. The
normative artifacts are the JSON files in the repository root; this package just
makes them importable from Python.

    from datasheet_schema import DATASHEET_SCHEMA, DICTIONARIES, SCHEMA_VERSION

Validate a document with any JSON Schema 2020-12 validator against
DATASHEET_SCHEMA, then apply the family checks in the repo's CONFORMANCE.md
against DICTIONARIES[doc["component"]["family"]].
"""

import json
from pathlib import Path

SCHEMA_VERSION = "1.0"

# Repository root, resolved relative to this file (schema/ and dictionary/ live there).
_ROOT = Path(__file__).resolve().parents[3]

SCHEMA_PATH = _ROOT / "schema" / "datasheet-1.0.schema.json"


def _load(path: Path) -> dict:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


DATASHEET_SCHEMA = _load(SCHEMA_PATH)

# {family: dictionary object} for every dictionary/<family>-*.json (excluding the meta-schema).
DICTIONARIES = {}
DICTIONARY_PATHS = {}
for _p in sorted((_ROOT / "dictionary").glob("*.json")):
    if _p.name.startswith("family-dictionary"):
        continue
    _d = _load(_p)
    DICTIONARIES[_d["family"]] = _d
    DICTIONARY_PATHS[_d["family"]] = _p

__all__ = [
    "SCHEMA_VERSION",
    "SCHEMA_PATH",
    "DATASHEET_SCHEMA",
    "DICTIONARIES",
    "DICTIONARY_PATHS",
]
