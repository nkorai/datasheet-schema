"""Pydantic v2 models for the Datasheet Schema v1.0.

These models mirror ``schema/datasheet-1.0.schema.json`` field for field. The
JSON Schema in that file remains the normative artifact. Where a constraint can
be expressed in pydantic it is enforced here so that Python callers get early,
typed errors. Constraints that pydantic cannot express are enforced by the
JSON Schema pass in :mod:`datasheet_schema.validation`.

Field aliases carry the exact wire names, so a document round-trips through
``model_validate`` and ``model_dump(by_alias=True)`` without renaming.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

# The single base-SI unit vocabulary, expressed as a Literal because several
# symbols (V/V, %, ppm/degC) are not valid Python identifiers for an Enum.
Unit = Literal[
    "V",
    "A",
    "Hz",
    "degC",
    "ohm",
    "F",
    "s",
    "W",
    "C",
    "J",
    "dB",
    "V/V",
    "%",
    "ppm/degC",
    "degC/W",
    "K/W",
    "V/us",
    "A/us",
    "V/sqrtHz",
]


class LimitClass(str, Enum):
    """The kind of limit a value represents."""

    absolute_max = "absolute_max"
    recommended = "recommended"
    characterized = "characterized"


# Pin function is an open, uppercase controlled vocabulary that families extend,
# matching the schema. The values below are the recommended set; a family may add
# its own, so the model constrains the pattern rather than a fixed enumeration.
# G, D, S serve field-effect transistors, the regulator and reference set the rest.
RECOMMENDED_PIN_FUNCTIONS = frozenset(
    {"IN", "OUT", "GND", "EN", "NC", "BYP", "ADJ", "FB", "PG", "SENSE", "BIAS", "PAD", "G", "D", "S"}
)


class PinType(str, Enum):
    power = "power"
    analog = "analog"
    digital_in = "digital_in"
    digital_out = "digital_out"
    passive = "passive"
    thermal = "thermal"


class Lifecycle(str, Enum):
    active = "active"
    nrnd = "nrnd"
    obsolete = "obsolete"
    unknown = "unknown"


class _Base(BaseModel):
    """Shared config. ``extra='forbid'`` mirrors ``additionalProperties: false``
    and ``populate_by_name`` lets callers construct models by Python name while
    the wire form uses the aliases."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class Value(_Base):
    """IEC 61360 level roles. At least one role is present (minProperties >= 1)."""

    min: Optional[float] = None
    typ: Optional[float] = None
    nom: Optional[float] = None
    max: Optional[float] = None

    @model_validator(mode="after")
    def _at_least_one_role(self) -> "Value":
        if self.min is None and self.typ is None and self.nom is None and self.max is None:
            raise ValueError("value requires at least one of min, typ, nom, max")
        return self


class ConditionAxis(_Base):
    """One test-condition dimension. Provide a scalar value, a min and/or max
    range, or a note. A unit is required when a numeric value, min, or max is
    given, and is omitted for a note-only axis."""

    param: str = Field(min_length=1)
    value: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    unit: Optional[Unit] = None
    note: Optional[str] = None

    @model_validator(mode="after")
    def _check_axis(self) -> "ConditionAxis":
        has_number = self.value is not None or self.min is not None or self.max is not None
        if not has_number and self.note is None:
            raise ValueError("condition axis requires one of value, min, max, or note")
        if has_number and self.unit is None:
            raise ValueError("unit is required when a condition axis carries a numeric value, min, or max")
        return self


class Stimulus(_Base):
    """An applied step for a dynamic measurement, for example I_OUT from 0 to
    300 mA at 0.2 A/us."""

    param: str
    from_: float = Field(alias="from")
    to: float
    unit: Unit
    slew_rate: Optional[float] = Field(default=None, alias="slewRate")
    slew_unit: Optional[str] = Field(default=None, alias="slewUnit")


class Measurement(_Base):
    """A value with its unit, the conditions under which it holds, the table it
    came from, and provenance."""

    limit_class: LimitClass = Field(alias="limitClass")
    value: Value
    unit: Unit
    conditions: Optional[List[ConditionAxis]] = None
    stimulus: Optional[Stimulus] = None
    conditions_verbatim: Optional[str] = Field(default=None, alias="conditionsVerbatim")
    source_page: Optional[int] = Field(default=None, alias="sourcePage", ge=1)
    source_table: Optional[str] = Field(default=None, alias="sourceTable")

    @model_validator(mode="after")
    def _characterized_needs_page(self) -> "Measurement":
        if self.limit_class == LimitClass.characterized and self.source_page is None:
            raise ValueError("a characterized measurement requires sourcePage")
        return self


class Parameter(_Base):
    """One canonically-keyed characteristic."""

    key: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    name: Optional[str] = None
    group: Optional[str] = None
    aliases: Optional[List[str]] = None
    measurements: List[Measurement] = Field(min_length=1)


class OrderingVariant(_Base):
    """One orderable variant covered by a datasheet."""

    order_code: str = Field(alias="orderCode")
    output_voltage_v: Optional[float] = Field(default=None, alias="outputVoltageV")
    package: Optional[str] = None
    temperature_grade: Optional[str] = Field(default=None, alias="temperatureGrade")
    packing: Optional[str] = None


class Pin(_Base):
    """A physical pin with a normalized function."""

    number: int = Field(ge=1)
    name: str
    function: str = Field(pattern=r"^[A-Z][A-Z0-9_]*$")
    type: Optional[PinType] = None
    description: Optional[str] = None
    source_page: Optional[int] = Field(default=None, alias="sourcePage", ge=1)


class Component(_Base):
    """Identifying information for the part."""

    mpn: str = Field(min_length=1)
    manufacturer: str = Field(min_length=1)
    family: str
    description: Optional[str] = None
    package: Optional[str] = None
    pin_count: Optional[int] = Field(default=None, alias="pinCount", ge=1)
    lifecycle: Optional[Lifecycle] = None
    msl: Optional[str] = None
    temperature_grade: Optional[str] = Field(default=None, alias="temperatureGrade")
    ordering_variants: Optional[List[OrderingVariant]] = Field(default=None, alias="orderingVariants")


class Provenance(_Base):
    """The record of where every value in this document came from."""

    datasheet_sha256: Optional[str] = Field(default=None, alias="datasheetSha256", pattern=r"^[a-f0-9]{64}$")
    source_url: Optional[str] = Field(default=None, alias="sourceUrl")
    datasheet_revision: Optional[str] = Field(default=None, alias="datasheetRevision")
    published_date: Optional[str] = Field(default=None, alias="publishedDate")
    fetched_at: Optional[str] = Field(default=None, alias="fetchedAt")
    extraction_method: Optional[str] = Field(default=None, alias="extractionMethod")
    extracted_at: Optional[str] = Field(default=None, alias="extractedAt")
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    verified: Optional[bool] = None


class Datasheet(_Base):
    """A machine-readable datasheet specification. Root of the document."""

    schema_version: Literal["1.0"] = Field(default="1.0", alias="schemaVersion")
    component: Component
    pinout: Optional[List[Pin]] = None
    parameters: List[Parameter]
    provenance: Provenance
    notes: Optional[List[str]] = None


# The TypeScript bindings name the component model ``ComponentIdentity``. The
# alias keeps the two peer bindings recognizable to a reader of either.
ComponentIdentity = Component
