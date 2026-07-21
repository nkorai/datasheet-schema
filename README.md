# datasheet-schema

A machine-readable JSON Schema for electronic-component datasheet specifications. Each value records the test conditions under which it holds and a reference to its source in the datasheet. Existing standards omit both.

[![JSON Schema](https://img.shields.io/badge/JSON%20Schema-2020--12-blue)](https://json-schema.org/draft/2020-12/schema)
[![conformance](https://img.shields.io/badge/conformance-passing-brightgreen)](./test/conformance)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![npm](https://img.shields.io/badge/npm-datasheet--schema-cb3837)](https://www.npmjs.com/package/datasheet-schema)

## Purpose

A datasheet is a PDF. A specified value has meaning only in the context of the table row and column that qualify it. Parametric databases and distributor APIs store a bare value such as "V_OUT = 3.3 V" and discard the conditions that qualify it, for example "at I_OUT = 1 mA, T_J = 25 C, V_IN = 4.3 V". Classification dictionaries such as IEC 61360 and eCl@ss standardize property names and units but provide no field for a test condition. Simulation formats such as IBIS and SPICE carry conditions but describe device behavior rather than the guaranteed datasheet table.

No open standard represents a datasheet value together with its test conditions and a reference to its source. This schema does.

## Comparison

A parametric database stores:

```json
{ "vout": 3.3, "dropout": 0.28, "iq": 0.0000315 }
```

This is not sufficient to design from. The load current at which dropout equals 0.28 V is unspecified, as is whether 3.3 V is a minimum, typical, or maximum, and no absolute-maximum input rating is present.

datasheet-schema stores:

```json
{
  "key": "dropout_voltage",
  "measurements": [
    { "limitClass": "characterized",
      "value": { "typ": 0.135 }, "unit": "V",
      "conditions": [ { "param": "I_OUT", "value": 0.1, "unit": "A" },
                      { "param": "T_J",  "value": 25,  "unit": "degC" } ],
      "conditionsVerbatim": "IOUT = 100 mA, TJ = 25C",
      "sourcePage": 5, "sourceTable": "Electrical Characteristics" },
    { "limitClass": "characterized",
      "value": { "typ": 0.28, "max": 0.45 }, "unit": "V",
      "conditions": [ { "param": "I_OUT", "value": 0.2, "unit": "A" } ],
      "conditionsVerbatim": "IOUT = 200 mA", "sourcePage": 5 }
  ]
}
```

A consumer can now determine that dropout is 135 mV at 100 mA and up to 450 mV at 200 mA, that the value is a characterized specification rather than an absolute maximum, and can locate it on page 5 of the source document.

## Model

The schema has three elements.

1. Measurement. Every value is an object of `value` (with `min`, `typ`, `nom`, `max`), `unit`, `conditions`, and provenance fields. The `conditions` field is a first-class, typed list of axes.
2. limitClass. One of `absolute_max`, `recommended`, or `characterized`. A single field replaces the separate datasheet tables and records whether a value is a stress limit, an operating range, or a guaranteed characteristic. A consumer must not treat an absolute-maximum value as an operating value.
3. Envelope and dictionaries. The parameter shape is family-agnostic. A family dictionary supplies the canonical keys, units, and vendor aliases, so that `psrr`, `ripple rejection`, and `power supply ripple rejection` map to one key. Three families are included, an LDO regulator, a discrete power MOSFET, and a precision voltage reference, which share one measurement envelope, condition model, and provenance record. A pin function is likewise an open uppercase vocabulary, so the same `pinout` structure carries a regulator's IN, OUT, GND, a transistor's G, D, S, and a shunt reference's CATHODE, ANODE. Adding a family requires only a new dictionary, not a schema change.

The schema reuses established vocabulary, including IEC 61360 level roles, an Octopart-style identity envelope, and base-SI units. It adds the conditioned value and provenance that those sources omit.

## Quickstart

Copy the schema. It is self-contained, with no external references.

```
schema/datasheet-1.0.schema.json
```

Validate a document with any JSON Schema 2020-12 validator.

```bash
npx ajv-cli validate -s schema/datasheet-1.0.schema.json -d my-part.datasheet.json --spec=draft2020
```

Install from npm to get the TypeScript types and the schema object from one import.

```bash
npm i datasheet-schema
```

```ts
import { datasheetSchema, ldoDictionary } from 'datasheet-schema';
import type { Datasheet } from 'datasheet-schema';
```

Python bindings ship pydantic models and a validator in [`bindings/python`](./bindings/python).

```python
from datasheet_schema import validate_document
doc = validate_document(loaded_json)  # parses via pydantic, then the JSON Schema
```

Reference the hosted, versioned URL from a `$ref`.

```
https://nkorai.github.io/datasheet-schema/schema/datasheet-1.0.schema.json
```

The [`examples/`](./examples) directory holds validated documents across all three families, including four real LDO regulators, an illustrative MOSFET, and three real voltage references (a shunt and two series parts across three manufacturers).

## Contents

| Section | Description |
|---|---|
| `component` | Identity and ordering variants. |
| `pinout` | Pins with normalized functions, so tools bind by function rather than vendor pin name. |
| `parameters` | All specified values (absolute maximum, recommended, electrical, thermal, ESD), distinguished by `limitClass`. |
| `provenance` | SHA-256 of the source PDF, revision, page, extraction method, and verified flag. |

### Families

A dictionary defines the canonical parameter keys, units, and vendor aliases for one component family. The schema stays family-agnostic. A validator checks each document's keys against the dictionary named by its `component.family`.

| Family | Dictionary | Parameters |
|---|---|---|
| `ldo` | [`dictionary/ldo-1.0.json`](./dictionary/ldo-1.0.json) | 53, across the regulation, dropout, current, protection, rejection and noise, enable, power-good, dynamic, stability, thermal, ESD, and general groups. |
| `mosfet` | [`dictionary/mosfet-1.0.json`](./dictionary/mosfet-1.0.json) | 28, across the ratings, static, capacitance, gate-charge, switching, body-diode, thermal, and general groups. |
| `voltage_reference` | [`dictionary/voltage_reference-1.0.json`](./dictionary/voltage_reference-1.0.json) | 24, unifying series and shunt topologies across the reference, temperature, current, regulation, noise, dynamic, rejection, thermal, and general groups. |

To add a family, write a dictionary that conforms to [`dictionary/family-dictionary-1.0.schema.json`](./dictionary/family-dictionary-1.0.schema.json) and a validated example. No schema change is required.

## Validation against real datasheets

The LDO dictionary was built and checked against a corpus of 39 datasheets from 20 manufacturers totaling 916 pages, including Texas Instruments, Analog Devices, onsemi, Torex, Microchip, Diodes, STMicroelectronics, Infineon, Richtek, and Toshiba. The corpus spans simple three-pin regulators through feature-rich parts with enable, power-good, and adjustable outputs. Each parameter in the dictionary appears across the corpus or in a manufacturer parameter glossary. The parameter-frequency analysis is in [`spec/v1.0/parameter-frequency-analysis.txt`](./spec/v1.0/parameter-frequency-analysis.txt).

## Conformance and versioning

The [`test/conformance/`](./test/conformance) directory holds positive fixtures that must validate and negative fixtures that must be rejected, including empty values, non-base units, an invalid `limitClass`, and missing provenance. `npm test` runs the full suite.

Two version axes are kept distinct. The schema version is `MAJOR.MINOR` in the filename and `$id`, for example `datasheet-1.0`. The npm package uses full semantic versioning. Several `1.0.x` package releases may ship the same `datasheet-1.0` schema.

A MINOR schema change is additive only. A MAJOR change publishes a new `$id`, and every previously published schema URL remains hosted so existing references do not break. The requirement that every value carries conditions and provenance does not change across versions. See [`GOVERNANCE.md`](./GOVERNANCE.md).

## Prior art

The idea of a machine-readable datasheet has been attempted before. None of the prior efforts combines a per-value test condition with provenance back to the source page, which is the requirement for machine-extracted specifications to be trustworthy.

### edatasheets (the closest neighbor)

The digital-datasheets working group, originated at Intel, defines a JSON Schema format for component datasheets with per-component-class specifications and value and condition structures. It is the nearest existing work to this project. Two facts shape the decision to publish a new schema rather than adopt it.

First, it is effectively unmaintained. Intel's companion tooling states that it will no longer provide support, accept patches, or guarantee development, and it suggests forking. Second, its design center is a manufacturer-authored format on JSON Schema draft-07. This project's design center is different. It treats provenance to the source page and the absolute-maximum versus recommended versus characterized distinction as first-class, precisely so that a value produced by an extraction pipeline can be audited against the page it came from. It targets JSON Schema 2020-12, ships a conformance suite, and is actively maintained.

Convergence would be welcome. If the digital-datasheets effort resumes, the two vocabularies can be cross-mapped. Until then, this schema is maintained and adoptable today.

### Other machine-readable datasheet efforts

| Effort | What it is | Difference |
|---|---|---|
| JEDEC JEP30 (PartModel) | Official XML standard for machine-readable part attributes. | Heavyweight and vendor-oriented, with limited grassroots adoption. No per-value provenance. |
| Google Cyanobyte | Machine-readable register maps for I2C peripherals, used for code generation. | Describes device interfaces, not electrical specifications. Dormant. |
| CCSDS SOIS Electronic Data Sheets | XML device-interface specifications used in spaceflight software. | Niche aerospace scope, interface-oriented. |

### Adjacent standards and datasets

| Standard or dataset | Function | Difference |
|---|---|---|
| IEC 61360, IEC CDD, eCl@ss | Property-name and unit dictionaries. | No test-condition field. |
| IBIS, SPICE | Condition-aware behavioral models. | Model behavior, not the guaranteed datasheet table. |
| Octopart, Nexar, SiliconExpert, Datasheets.com | Commercial parametric datasets and APIs. | Closed, ad-hoc schemas. Generally no test-condition capture or per-value provenance to the source PDF. |
| IPC-2581 | PCB manufacturing data exchange. | Board manufacturing, not device specifications. |

## License

MIT. Datasheet PDFs are copyrighted by their manufacturers and are not redistributed by this project. The schema describes extracted factual specifications, which are not themselves copyrightable.
