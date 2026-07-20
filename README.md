# datasheet-schema

> A machine-readable, **design-grade** schema for electronic-component datasheet specifications — where every value carries its **test conditions** and **provenance**. The two things that make a spec safe to design from, and the two things no existing standard captures.

[![JSON Schema](https://img.shields.io/badge/JSON%20Schema-2020--12-blue)](https://json-schema.org/draft/2020-12/schema)
[![conformance](https://img.shields.io/badge/conformance-passing-brightgreen)](./test/conformance)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)
[![npm](https://img.shields.io/badge/npm-datasheet--schema-cb3837)](https://www.npmjs.com/package/datasheet-schema)

---

## Why this exists

A datasheet is a PDF. To use it, you read a value out of a table — but the value is meaningless without the row and column headers around it.

Parametric databases (Octopart, LCSC, distributor APIs) flatten `V_OUT = 3.3 V` and **silently drop** *"at I_OUT = 1 mA, T_J = 25 °C, V_IN = 4.3 V."* Classification dictionaries (IEC 61360, eCl@ss) standardize property *names* but have no slot for a test condition. Simulation formats (IBIS, SPICE) carry conditions but describe *behavior*, not the guaranteed datasheet table. **No open standard represents a datasheet value together with the conditions it holds under and a pointer back to where it came from.**

That gap is the difference between *searchable* and *designable-from*. This schema closes it.

## The "holy sh*t" — before / after

**A parametric database says:**
```json
{ "vout": 3.3, "dropout": 0.28, "iq": 0.0000315 }
```
Which you cannot design from. At what load is dropout 0.28 V? Is 3.3 V the min, typ, or max? What's the abs-max input rating? Silence.

**datasheet-schema says:**
```json
{
  "key": "dropout_voltage",
  "measurements": [
    { "limitClass": "characterized",
      "value": { "typ": 0.135 }, "unit": "V",
      "conditions": [ { "param": "I_OUT", "value": 0.1, "unit": "A" },
                      { "param": "T_J",  "value": 25,  "unit": "degC" } ],
      "conditionsVerbatim": "IOUT = 100 mA, TJ = 25°C",
      "sourcePage": 5, "sourceTable": "Electrical Characteristics" },
    { "limitClass": "characterized",
      "value": { "typ": 0.28, "max": 0.45 }, "unit": "V",
      "conditions": [ { "param": "I_OUT", "value": 0.2, "unit": "A" } ],
      "conditionsVerbatim": "IOUT = 200 mA", "sourcePage": 5 }
  ]
}
```
Now a tool — or an AI generating a schematic — knows dropout is **135 mV at 100 mA but up to 450 mV at 200 mA**, that it's a *characterized* value (not an absolute maximum), and can open **page 5** to check.

## The three ideas

1. **The `Measurement` atom** — every value is `{ value {min,typ,nom,max}, unit, conditions[], provenance }`. `conditions` is a first-class, typed, open list of axes. This is the part no standard has.
2. **`limitClass`** — `absolute_max` | `recommended` | `characterized`. One field replaces three separate datasheet tables and encodes the distinction that *burns boards when confused*. Absolute maximum is a stress limit; recommended is where the part works; characterized is what's guaranteed.
3. **A universal envelope + pluggable family dictionaries** — the parameter *shape* is family-agnostic; a [dictionary](./dictionary/) supplies the canonical keys, units, and vendor **aliases** (so `psrr` = `ripple rejection` = `power supply ripple rejection`). LDO ships today; buck converters, MOSFETs, and MCUs slot in with only a new dictionary, no schema change.

Positioned as: **IEC 61360 property vocabulary + a conditioned-value extension + an Octopart-style identity/provenance envelope.** We reinvented no vocabulary — only the two things nobody had.

## Quickstart

**Copy the schema** (self-contained — one file, no external `$ref`s):
```
schema/datasheet-1.0.schema.json
```

**Validate a document** with any JSON Schema 2020-12 validator:
```bash
npx ajv-cli validate -s schema/datasheet-1.0.schema.json -d my-part.datasheet.json --spec=draft2020
```

**Use it from npm** (types + schema object in one import):
```bash
npm i datasheet-schema
```
```ts
import { datasheetSchema, ldoDictionary } from 'datasheet-schema';
import type { Datasheet } from 'datasheet-schema';
```

**Or `$ref` the hosted, versioned URL:**
```
https://nkorai.github.io/datasheet-schema/schema/datasheet-1.0.schema.json
```

A complete, validated example lives in [`examples/ldo-tlv70033.datasheet.json`](./examples/ldo-tlv70033.datasheet.json).

## What's in it

| Section | What it holds |
|---|---|
| `component` | identity + ordering variants (Octopart/GS1-style envelope) |
| `pinout` | pins with **normalized functions** (IN/OUT/GND/EN/…) so tools skip vendor pin-name matching |
| `parameters` | **everything** — abs-max, recommended, electrical, thermal, ESD — unified, distinguished by `limitClass` |
| `provenance` | SHA-256 of the source PDF, revision, page, extraction method, verified flag |

The LDO dictionary defines **50 canonical parameters** across regulation, dropout, current, protection, rejection/noise, enable, power-good, dynamic, stability, thermal, and ESD groups — see [`dictionary/ldo-1.0.json`](./dictionary/ldo-1.0.json).

## This isn't hand-waving — it was validated against real datasheets

The LDO dictionary was built and checked against a **corpus of 39 datasheets from 20 manufacturers (916 pages)** — TI, Analog Devices, onsemi, Torex, Microchip, Diodes, ST, Infineon, Richtek, Toshiba, and more — spanning simple 3-pin regulators to feature-rich low-noise parts with enable, power-good, and adjustable outputs. The parameter-frequency analysis that shaped the dictionary is in [`spec/v1.0/parameter-frequency-analysis.txt`](./spec/v1.0/parameter-frequency-analysis.txt). Every parameter in the dictionary earns its place by appearing across the corpus or in manufacturer parameter glossaries.

## Conformance & versioning

- **Conformance suite** — [`test/conformance/`](./test/conformance) has positive fixtures (must validate) and **negative fixtures** (must be rejected: empty values, non-base units, wrong `limitClass`, missing provenance). `npm test` runs them all. A schema you can't fail isn't a spec.
- **Two version axes.** The **schema** version is `MAJOR.MINOR` in the filename and `$id` (`datasheet-1.0`); the **npm package** uses full semver. Many `1.0.x` package releases can ship the same `datasheet-1.0` schema.
- **Compatibility.** MINOR = additive only (new optional params, new enum values). MAJOR = a new `$id`; old versions stay hosted forever. The invariant that every value carries `conditions` and traces to `provenance` never weakens — that's the spec's identity. See [`GOVERNANCE.md`](./GOVERNANCE.md).

## Prior art / related standards

| Standard | What it does | Why it isn't this |
|---|---|---|
| IEC 61360 / IEC CDD, eCl@ss | property-name + unit dictionaries | no test-condition slot; filter-grade |
| IBIS, SPICE | condition-aware behavioral models | model behavior, not the guaranteed datasheet table |
| Octopart / Nexar / distributor APIs | identity + flat display specs | no conditions, no min/typ/max, no provenance |
| JEDEC / IPC-2581 / IEC 61360 | registration, PCB manufacturing, classification | none carry per-value conditions + provenance |

datasheet-schema borrows their vocabulary (IEC 61360 `levelType`, Octopart identity, UN/CEFACT-style units) and adds the conditioned value + provenance they all omit.

## License

Apache-2.0. Datasheet PDFs are copyrighted by their manufacturers and are **not** redistributed by this project — the schema describes *extracted factual specifications*, which are not themselves copyrightable.
