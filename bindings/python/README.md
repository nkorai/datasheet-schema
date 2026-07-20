# Datasheet Schema, Python bindings

Pydantic v2 models for the [Datasheet Schema](../../schema/datasheet-1.0.schema.json) v1.0, with a validator that checks a document against both the models and the normative JSON Schema.

The JSON Schema file is the authority. These models are a typed convenience layer over it. Some constraints are enforced only by the JSON Schema pass, so `validate_document` runs both.

## Install

From the repository root:

```bash
pip install ./bindings/python
```

For development, including the test dependency:

```bash
pip install -e "./bindings/python[dev]"
```

Requires Python 3.9 or later. Depends on `pydantic>=2` and `jsonschema>=4`.

## Quickstart

Parse and validate a datasheet document. `validate_document` parses with the pydantic models and then validates against the bundled JSON Schema, returning the parsed model and raising on invalid input.

```python
from datasheet_schema import validate_document

doc = {
    "schemaVersion": "1.0",
    "component": {
        "mpn": "TLV70033DDCR",
        "manufacturer": "Texas Instruments",
        "family": "ldo",
    },
    "parameters": [
        {
            "key": "dropout_voltage",
            "measurements": [
                {
                    "limitClass": "characterized",
                    "value": {"typ": 0.28, "max": 0.45},
                    "unit": "V",
                    "conditions": [
                        {"param": "I_OUT", "value": 0.2, "unit": "A"}
                    ],
                    "sourcePage": 5,
                }
            ],
        }
    ],
    "provenance": {"extractionMethod": "manual", "verified": True},
}

model = validate_document(doc)
print(model.component.mpn)                       # TLV70033DDCR
print(model.parameters[0].measurements[0].unit)  # V
```

Field aliases carry the exact wire names, so a model round-trips back to the wire form without renaming:

```python
model.model_dump(by_alias=True, exclude_none=True, mode="json")
```

## Importing flat parametric data

A distributor API or classification database stores a bare value with no test conditions, limit class, unit, or page reference. `from_flat_parametric` lifts such a record into a minimal valid document, and in doing so shows what the flat form has already discarded.

```python
from datasheet_schema import validate_document
from datasheet_schema.importers import from_flat_parametric

flat = {"vout": 3.3, "dropout": 0.28, "iq": 3.15e-5}
doc = from_flat_parametric(
    flat,
    mpn="TLV70033DDCR",
    manufacturer="Texas Instruments",
    family="ldo",
)

validate_document(doc.model_dump(by_alias=True, exclude_none=True, mode="json"))
```

Each value is recorded with `limitClass` `recommended` and no conditions or provenance, because the flat form supplies none. A `characterized` classification is deliberately not used, since the schema requires a `sourcePage` that a flat record cannot provide. See the module docstring in `datasheet_schema/importers.py` for how a richer edatasheets-style record maps onto the schema.

## Tests

```bash
cd bindings/python
pip install -e ".[dev]"
pytest
```
