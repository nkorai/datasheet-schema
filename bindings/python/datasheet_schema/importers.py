"""Converters from lossy source formats into the Datasheet Schema.

This module exists to make the schema's value concrete by contrast. A bare
parametric record is what a distributor API or a classification database
stores, for example::

    {"vout": 3.3, "dropout": 0.28, "iq": 3.15e-5}

That record is not sufficient to design from. It has no test conditions, so the
load current at which dropout equals 0.28 V is unknown. It has no limit class,
so whether 3.3 V is a minimum, typical, or maximum is unknown. It has no unit,
so the reader must guess that dropout is volts and quiescent current is amperes.
It has no page reference, so no value can be verified against a source. The
conversion below fills these gaps with the weakest defensible assumptions and
records nothing it cannot support, which is the point. The flat form has
already discarded the information the schema is built to preserve.

Mapping an edatasheets-style record
-----------------------------------
Intel's edatasheets project emits a structured JSON record per part with an
identity block and a list of parameter or attribute entries, each carrying a
name, one or more numeric limits, and often a unit string and a conditions
note. That form maps onto this schema more richly than a flat dict does:

- The part identity block (part number, manufacturer, and category or family)
  maps onto ``component.mpn``, ``component.manufacturer``, and
  ``component.family``.
- Each parameter entry maps onto one ``Parameter``. Its canonical name maps onto
  ``key`` after normalization to ``snake_case`` matching ``^[a-z][a-z0-9_]*$``,
  and the original vendor term is retained in ``aliases``.
- The entry's min, typ, and max limits map onto ``measurement.value``. A single
  entry with several condition rows becomes one ``Measurement`` per row, since
  the schema requires one measurement per distinct condition set.
- The entry's unit string maps onto ``measurement.unit`` after normalization to
  the base-SI vocabulary, for example mA becomes A with the value scaled.
- Any condition text such as "at I_OUT = 100 mA, T_J = 25 C" maps onto typed
  ``ConditionAxis`` entries, with the original string retained in
  ``conditionsVerbatim``.
- Table and page references, where the source carries them, map onto
  ``sourcePage`` and ``sourceTable``, which is what allows an edatasheets
  record to be recorded as ``characterized`` rather than downgraded.

A flat dict carries none of the last three, which is why the converter below
must downgrade every value. The gap between the two is the schema's
contribution stated as code.
"""

from __future__ import annotations

import re
from typing import Any, Dict, Mapping, Optional

from .models import (
    Component,
    Datasheet,
    LimitClass,
    Measurement,
    Parameter,
    Provenance,
    Value,
)

# Canonical keys for the common bare-parametric field names. The original flat
# name is retained on the parameter's aliases so the mapping stays auditable.
_CANONICAL_KEYS: Dict[str, str] = {
    "vout": "output_voltage",
    "vin": "input_voltage_range",
    "dropout": "dropout_voltage",
    "iq": "quiescent_current",
    "iout": "output_current",
    "psrr": "psrr",
    "noise": "output_noise_rms",
}

# Base-SI unit hints keyed by canonical parameter key. A flat record drops the
# unit, so it has to be reintroduced here or supplied by the caller.
_UNIT_HINTS: Dict[str, str] = {
    "output_voltage": "V",
    "input_voltage_range": "V",
    "dropout_voltage": "V",
    "quiescent_current": "A",
    "output_current": "A",
    "psrr": "dB",
    "output_noise_rms": "V",
}


def _slugify(raw_key: str) -> str:
    """Normalize an arbitrary key to match ``^[a-z][a-z0-9_]*$``."""

    slug = re.sub(r"[^a-z0-9]+", "_", raw_key.strip().lower()).strip("_")
    if not slug:
        raise ValueError(f"cannot derive a canonical key from {raw_key!r}")
    if not slug[0].isalpha():
        slug = "p_" + slug
    return slug


def from_flat_parametric(
    flat: Mapping[str, Any],
    *,
    mpn: str,
    manufacturer: str,
    family: str,
    units: Optional[Mapping[str, str]] = None,
) -> Datasheet:
    """Build a minimal valid :class:`Datasheet` from a bare parametric dict.

    ``flat`` is a mapping of parameter name to a single numeric value, the shape
    a distributor API or classification database stores. ``units`` may supply a
    base-SI unit per key, by either the raw or the canonical name, when the
    built-in hints do not cover it. A key with no resolvable unit raises, since a
    measurement without a unit cannot be represented, which is itself a symptom
    of the flat form's lossiness.

    Every value is recorded with ``limitClass`` ``recommended`` and no
    conditions, page, or provenance detail, because the flat form supplies none.
    A ``characterized`` classification is deliberately not used, since the schema
    requires a ``sourcePage`` that a flat record cannot provide.
    """

    units = units or {}
    parameters = []

    for raw_key, raw_value in flat.items():
        canonical = _CANONICAL_KEYS.get(raw_key.lower(), _slugify(raw_key))
        unit = units.get(raw_key) or units.get(canonical) or _UNIT_HINTS.get(canonical)
        if unit is None:
            raise ValueError(
                f"no unit is known for {raw_key!r}. The flat parametric form "
                "omits units, so supply one via units={...}."
            )
        aliases = [raw_key] if raw_key != canonical else None
        parameters.append(
            Parameter(
                key=canonical,
                aliases=aliases,
                measurements=[
                    Measurement(
                        limit_class=LimitClass.recommended,
                        value=Value(typ=float(raw_value)),
                        unit=unit,
                    )
                ],
            )
        )

    return Datasheet(
        component=Component(mpn=mpn, manufacturer=manufacturer, family=family),
        parameters=parameters,
        provenance=Provenance(extraction_method="flat-import", verified=False),
    )
