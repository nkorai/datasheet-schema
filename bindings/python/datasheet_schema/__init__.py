"""Python bindings for the Datasheet Schema v1.0.

The normative artifact is ``schema/datasheet-1.0.schema.json`` in the repository
root. These bindings provide typed pydantic models over that schema and a
:func:`validate_document` helper that checks a document against both the models
and the normative JSON Schema.
"""

from .importers import from_flat_parametric
from .models import (
    ComponentIdentity,
    Component,
    ConditionAxis,
    Datasheet,
    Lifecycle,
    LimitClass,
    Measurement,
    OrderingVariant,
    Parameter,
    Pin,
    RECOMMENDED_PIN_FUNCTIONS,
    PinType,
    Provenance,
    Stimulus,
    Unit,
    Value,
)
from .validation import (
    SCHEMA_VERSION,
    bundled_schema_path,
    load_schema,
    validate_document,
)

__all__ = [
    "SCHEMA_VERSION",
    "Component",
    "ComponentIdentity",
    "ConditionAxis",
    "Datasheet",
    "Lifecycle",
    "LimitClass",
    "Measurement",
    "OrderingVariant",
    "Parameter",
    "Pin",
    "RECOMMENDED_PIN_FUNCTIONS",
    "PinType",
    "Provenance",
    "Stimulus",
    "Unit",
    "Value",
    "bundled_schema_path",
    "from_flat_parametric",
    "load_schema",
    "validate_document",
]
