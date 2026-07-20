# datasheet-schema

A machine-readable JSON Schema for electronic-component datasheet specifications. Each value records the test conditions under which it holds and a reference to its source in the datasheet. Existing standards omit both.

[![JSON Schema](https://img.shields.io/badge/JSON%20Schema-2020--12-blue)](https://json-schema.org/draft/2020-12/schema)
[![conformance](https://img.shields.io/badge/conformance-passing-brightgreen)](./test/conformance)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)
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
3. Envelope and dictionaries. The parameter shape is family-agnostic. A family dictionary supplies the canonical keys, units, and vendor aliases, so that `psrr`, `ripple rejection`, and `power supply ripple rejection` map to one key. The LDO dictionary is included. Additional families require only a new dictionary, not a schema change.

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

Install from npm to get the types and the schema object from one import.

```bash
npm i datasheet-schema
```

```ts
import { datasheetSchema, ldoDictionary } from 'datasheet-schema';
import type { Datasheet } from 'datasheet-schema';
```

Reference the hosted, versioned URL from a `$ref`.

```
https://nkorai.github.io/datasheet-schema/schema/datasheet-1.0.schema.json
```

A complete, validated example is in [`examples/ldo-tlv70033.datasheet.json`](./examples/ldo-tlv70033.datasheet.json).

## Contents

| Section | Description |
|---|---|
| `component` | Identity and ordering variants. |
| `pinout` | Pins with normalized functions, so tools bind by function rather than vendor pin name. |
| `parameters` | All specified values (absolute maximum, recommended, electrical, thermal, ESD), distinguished by `limitClass`. |
| `provenance` | SHA-256 of the source PDF, revision, page, extraction method, and verified flag. |

The LDO dictionary defines 51 canonical parameters across the regulation, dropout, current, protection, rejection and noise, enable, power-good, dynamic, stability, thermal, and ESD groups. See [`dictionary/ldo-1.0.json`](./dictionary/ldo-1.0.json).

## Validation against real datasheets

The LDO dictionary was built and checked against a corpus of 39 datasheets from 20 manufacturers totaling 916 pages, including Texas Instruments, Analog Devices, onsemi, Torex, Microchip, Diodes, STMicroelectronics, Infineon, Richtek, and Toshiba. The corpus spans simple three-pin regulators through feature-rich parts with enable, power-good, and adjustable outputs. Each parameter in the dictionary appears across the corpus or in a manufacturer parameter glossary. The parameter-frequency analysis is in [`spec/v1.0/parameter-frequency-analysis.txt`](./spec/v1.0/parameter-frequency-analysis.txt).

## Conformance and versioning

The [`test/conformance/`](./test/conformance) directory holds positive fixtures that must validate and negative fixtures that must be rejected, including empty values, non-base units, an invalid `limitClass`, and missing provenance. `npm test` runs the full suite.

Two version axes are kept distinct. The schema version is `MAJOR.MINOR` in the filename and `$id`, for example `datasheet-1.0`. The npm package uses full semantic versioning. Several `1.0.x` package releases may ship the same `datasheet-1.0` schema.

A MINOR schema change is additive only. A MAJOR change publishes a new `$id`, and every previously published schema URL remains hosted so existing references do not break. The requirement that every value carries conditions and provenance does not change across versions. See [`GOVERNANCE.md`](./GOVERNANCE.md).

## Related work

| Standard | Function | Difference |
|---|---|---|
| IEC 61360, IEC CDD, eCl@ss | Property-name and unit dictionaries. | No test-condition field. |
| IBIS, SPICE | Condition-aware behavioral models. | Model behavior, not the guaranteed datasheet table. |
| Octopart, Nexar, distributor APIs | Identity and flat display specifications. | No conditions, min/typ/max, or provenance. |
| JEDEC, IPC-2581, IEC 61360 | Registration, PCB manufacturing, classification. | None carry per-value conditions and provenance. |

## License

Apache-2.0. Datasheet PDFs are copyrighted by their manufacturers and are not redistributed by this project. The schema describes extracted factual specifications, which are not themselves copyrightable.
