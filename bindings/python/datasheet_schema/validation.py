"""Validation entry point for the Datasheet Schema Python bindings.

A document is validated twice. First it is parsed with the pydantic models in
:mod:`datasheet_schema.models`, which enforce the constraints pydantic can
express. Then it is validated against the normative JSON Schema file at
``schema/datasheet-1.0.schema.json``.

The JSON Schema file is the authority. The pydantic models are a convenience
layer over it. Some constraints are enforced only by the JSON Schema pass, so
that pass is load-bearing and is not optional.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

from jsonschema import Draft202012Validator, FormatChecker

from .models import Datasheet

SCHEMA_VERSION = "1.0"

# Path of the normative schema relative to the repository root.
_SCHEMA_RELPATH = ("schema", "datasheet-1.0.schema.json")


def bundled_schema_path() -> Path:
    """Locate ``schema/datasheet-1.0.schema.json`` by walking up from this file.

    The schema is referenced relative to the repository rather than copied into
    the package, so the single normative file stays the authority.
    """

    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent.joinpath(*_SCHEMA_RELPATH)
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(
        "could not locate schema/datasheet-1.0.schema.json relative to "
        f"{here}. The Python bindings expect to run from within the "
        "datasheet-schema repository."
    )


@lru_cache(maxsize=1)
def load_schema() -> Dict[str, Any]:
    """Return the parsed normative JSON Schema."""

    return json.loads(bundled_schema_path().read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _schema_validator() -> Draft202012Validator:
    return Draft202012Validator(load_schema(), format_checker=FormatChecker())


def validate_document(data: Dict[str, Any]) -> Datasheet:
    """Validate a datasheet document and return the parsed model.

    The document is parsed with the pydantic models and then validated against
    the bundled JSON Schema, which is the authority. Raises
    ``pydantic.ValidationError`` or ``jsonschema.ValidationError`` when the
    document is invalid.
    """

    model = Datasheet.model_validate(data)
    _schema_validator().validate(data)
    return model
