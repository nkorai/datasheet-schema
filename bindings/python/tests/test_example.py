"""The bundled example must validate through both the pydantic models and the
normative JSON Schema."""

from jsonschema import Draft202012Validator, FormatChecker

from datasheet_schema import Datasheet, load_schema, validate_document


def test_example_validates_through_pydantic(example_document):
    model = Datasheet.model_validate(example_document)
    assert model.schema_version == "1.0"
    assert model.component.mpn == "TLV70033DDCR"
    assert model.parameters


def test_example_validates_through_jsonschema(example_document):
    Draft202012Validator(load_schema(), format_checker=FormatChecker()).validate(example_document)


def test_validate_document_returns_model(example_document):
    model = validate_document(example_document)
    assert isinstance(model, Datasheet)
    # Round-trips back to the wire form without renaming fields.
    dumped = model.model_dump(by_alias=True, exclude_none=True, mode="json")
    assert dumped["schemaVersion"] == "1.0"
    assert dumped["component"]["mpn"] == "TLV70033DDCR"
    # Re-validating the dumped form still passes the JSON Schema.
    validate_document(dumped)
