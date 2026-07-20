"""The flat-parametric importer must produce schema-valid documents."""

import pytest

from datasheet_schema import Datasheet, validate_document
from datasheet_schema.importers import from_flat_parametric


def test_from_flat_parametric_produces_valid_document():
    flat = {"vout": 3.3, "dropout": 0.28, "iq": 3.15e-5}
    doc = from_flat_parametric(
        flat,
        mpn="TLV70033DDCR",
        manufacturer="Texas Instruments",
        family="ldo",
    )
    assert isinstance(doc, Datasheet)

    wire = doc.model_dump(by_alias=True, exclude_none=True, mode="json")
    # Validates through both pydantic and the normative JSON Schema.
    validate_document(wire)

    # The flat form is lossy: no conditions, no page, downgraded limit class.
    first = wire["parameters"][0]
    assert first["key"] == "output_voltage"
    assert first["aliases"] == ["vout"]
    measurement = first["measurements"][0]
    assert measurement["limitClass"] == "recommended"
    assert "conditions" not in measurement
    assert "sourcePage" not in measurement
    assert wire["provenance"]["verified"] is False


def test_from_flat_parametric_requires_unit_for_unknown_key():
    with pytest.raises(ValueError):
        from_flat_parametric(
            {"unknown_metric": 1.0},
            mpn="X",
            manufacturer="Y",
            family="ldo",
        )


def test_from_flat_parametric_accepts_unit_override():
    doc = from_flat_parametric(
        {"custom_metric": 12.0},
        mpn="X",
        manufacturer="Y",
        family="ldo",
        units={"custom_metric": "Hz"},
    )
    wire = doc.model_dump(by_alias=True, exclude_none=True, mode="json")
    validate_document(wire)
    assert wire["parameters"][0]["measurements"][0]["unit"] == "Hz"
