# Datasheet Schema, Python binding

A **dumb data binding**: it makes the [Datasheet Schema](../../schema/datasheet-1.0.schema.json)
and its family dictionaries importable from Python. It has **no runtime logic** — no models,
no validator, no importer, and no dependencies. Executable behavior (validation, extraction,
typed models) will ship as a separate library; this package is only the data.

The JSON files in the repository root are the authority.

## Install

```bash
pip install ./bindings/python
```

Requires Python 3.9 or later. No dependencies.

## Use

```python
from datasheet_schema import DATASHEET_SCHEMA, DICTIONARIES, SCHEMA_VERSION, SCHEMA_PATH

DATASHEET_SCHEMA          # the JSON Schema 2020-12 document, as a dict
DICTIONARIES["ldo"]       # the ldo family dictionary, as a dict (also "mosfet", "voltage_reference")
SCHEMA_VERSION            # "1.0"
```

To validate a document, use any JSON Schema 2020-12 validator against `DATASHEET_SCHEMA`,
then apply the small family checks (key membership, unit scoping, condition-axis dimension)
described in the repository's [`CONFORMANCE.md`](../../CONFORMANCE.md) against
`DICTIONARIES[doc["component"]["family"]]`. For example:

```python
import jsonschema  # your choice of validator, not a dependency of this package
from datasheet_schema import DATASHEET_SCHEMA, DICTIONARIES

jsonschema.Draft202012Validator(DATASHEET_SCHEMA).validate(doc)   # Layer 1

dictionary = DICTIONARIES[doc["component"]["family"]]             # Layer 2 (see CONFORMANCE.md)
allowed = {p["key"]: {p["unit"], *p.get("altUnits", [])} for p in dictionary["parameters"]}
for p in doc["parameters"]:
    assert p["key"] in allowed
    for m in p["measurements"]:
        assert m["unit"] in allowed[p["key"]]
```
