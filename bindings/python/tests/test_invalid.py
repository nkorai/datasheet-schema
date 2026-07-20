"""Documents that violate schema constraints must be rejected."""

import copy

import pytest
from jsonschema import ValidationError as JsonSchemaValidationError
from pydantic import ValidationError as PydanticValidationError

from datasheet_schema import validate_document


def test_uppercase_key_fails(example_document):
    doc = copy.deepcopy(example_document)
    # key must match ^[a-z][a-z0-9_]*$
    doc["parameters"][0]["key"] = "Output_Voltage"
    with pytest.raises((PydanticValidationError, JsonSchemaValidationError)):
        validate_document(doc)


def test_empty_value_object_fails(example_document):
    doc = copy.deepcopy(example_document)
    # value requires at least one of min, typ, nom, max (minProperties >= 1)
    doc["parameters"][0]["measurements"][0]["value"] = {}
    with pytest.raises((PydanticValidationError, JsonSchemaValidationError)):
        validate_document(doc)


def test_numeric_condition_axis_missing_unit_fails(example_document):
    doc = copy.deepcopy(example_document)
    # find a measurement with a numeric condition axis and drop its unit
    axis = doc["parameters"][1]["measurements"][0]["conditions"][0]
    assert "value" in axis
    del axis["unit"]
    with pytest.raises((PydanticValidationError, JsonSchemaValidationError)):
        validate_document(doc)


def test_characterized_missing_source_page_fails(example_document):
    doc = copy.deepcopy(example_document)
    measurement = doc["parameters"][1]["measurements"][0]
    assert measurement["limitClass"] == "characterized"
    del measurement["sourcePage"]
    with pytest.raises((PydanticValidationError, JsonSchemaValidationError)):
        validate_document(doc)
