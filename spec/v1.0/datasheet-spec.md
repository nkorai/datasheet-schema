# Datasheet Schema — Specification v1.0

Status: draft. The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**,
**MAY** are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

The normative machine artifact is [`schema/datasheet-1.0.schema.json`](../../schema/datasheet-1.0.schema.json)
(JSON Schema 2020-12). Where this prose and the machine schema disagree, the
machine schema governs.

## 1. Scope

This specification defines a JSON representation of the **design-grade
specifications** of an electronic component as published in its datasheet: the
guaranteed and limiting values, the **test conditions** under which each holds,
and the **provenance** of each value. It does **not** define a behavioral/
simulation model (see IBIS, SPICE) nor a PCB-manufacturing format (see IPC-2581).

## 2. Design principles

1. **Every value is conditioned.** A specified value without its test conditions
   is not safe to design from. `Measurement.conditions` is first-class.
2. **Every value is traceable.** A value SHOULD carry the page (and SHOULD name
   the table) it was read from; a `characterized` value **MUST** carry
   `sourcePage`.
3. **Tables are semantics, not layout.** Absolute-maximum, recommended-operating
   and electrical-characteristics rows are distinguished by `limitClass`, not by
   separate containers.
4. **One envelope, many families.** The parameter *shape* is family-agnostic; a
   family dictionary supplies canonical keys, units and aliases.

## 3. Document structure

A conforming document is a JSON object with:

| Field | Req | Description |
|---|---|---|
| `schemaVersion` | REQUIRED | MUST be `"1.0"`. |
| `component` | REQUIRED | Identity — see §4. |
| `pinout` | OPTIONAL | Array of pins — see §5. |
| `parameters` | REQUIRED | Array of parameters — see §6. |
| `provenance` | REQUIRED | Document-level audit trail — see §8. |
| `notes` | OPTIONAL | Reviewer-facing free text. |

## 4. Component identity

`component` REQUIRES `mpn`, `manufacturer`, `family`. `family` selects the
applicable dictionary (e.g. `ldo`). `orderingVariants` MAY enumerate orderable
codes with per-variant fixed voltage, package, temperature grade and packing.

## 5. Pinout

Each pin REQUIRES a 1-indexed `number`, the printed `name`, and a normalized
`function` from the controlled set `IN, OUT, GND, EN, NC, BYP, ADJ, FB, PG,
SENSE, BIAS, PAD`. A tool consuming the schema SHOULD wire a part by `function`,
never by `name`.

## 6. Parameters

A parameter has a canonical snake_case `key` (matching `^[a-z][a-z0-9_]*$`) and
one or more `measurements`. The set of legal keys for a family is defined by its
dictionary; a document SHOULD only use keys defined there, and a validator MAY
enforce this (the reference conformance runner does). A parameter MAY carry
`aliases` recording the vendor terms it was extracted from.

A parameter specified across several conditions (e.g. dropout per load current,
PSRR per frequency) **MUST** provide one `measurement` per condition point.

## 7. Measurement — the atom

| Field | Req | Description |
|---|---|---|
| `limitClass` | REQUIRED | `absolute_max` \| `recommended` \| `characterized`. |
| `value` | REQUIRED | `{ min?, typ?, nom?, max? }`, at least one present (IEC 61360 level roles). |
| `unit` | REQUIRED | A base-SI unit symbol (§9). |
| `conditions` | OPTIONAL* | Typed condition axes (§7.1). *SHOULD be present for `characterized`/`recommended` values; abs-max stress rows MAY omit them. |
| `stimulus` | OPTIONAL | Applied step for dynamic values (§7.2). |
| `conditionsVerbatim` | OPTIONAL | The conditions exactly as printed, kept so nothing is lost in normalization. |
| `sourcePage` | REQUIRED for `characterized` | 1-indexed page. |
| `sourceTable` | OPTIONAL | The originating table. |

`absolute_max` is a stress limit; operating a device beyond it may cause
permanent damage. `recommended` is the range over which parameters are specified.
`characterized` is a measured or guaranteed electrical characteristic. Consumers
**MUST NOT** treat an `absolute_max` value as an operating value.

### 7.1 Condition axes

A condition axis has a `param`, a `unit`, and a `value` or a `min`/`max` range
(or a `note`). `param` uses this RECOMMENDED vocabulary; family-specific axes MAY
extend it:

`T_J, T_A, V_IN, V_OUT, I_OUT, I_LOAD, F, C_OUT, C_IN, ESR, HEADROOM, RIPPLE,
BW_LOW, BW_HIGH, V_EN, C_OUT_TYPE`

Using an unlisted `param` is permitted but reduces cross-tool interoperability.

### 7.2 Stimulus

Dynamic parameters (load/line transient response, start-up) describe an applied
step with `{ param, from, to, unit, slewRate?, slewUnit? }` rather than flatten
the endpoints into shared conditions. The same shape serves load steps, line
steps, and (in other families) switching edges.

## 8. Provenance

Document-level `provenance` MAY record `datasheetSha256`, `sourceUrl`,
`datasheetRevision`, `publishedDate`, `fetchedAt`, `extractionMethod`,
`extractedAt`, `confidence` (0–1, advisory), and `verified` (true only after a
validation suite has passed). `confidence` alone **MUST NOT** be read as
verification.

## 9. Units

Values are normalized to base-SI units so numeric comparison across parts is
always sound. `unit` MUST be one of: `V, A, Hz, degC, ohm, F, s, W, C, dB, V/V,
%, ppm/degC, V/us, A/us, V/sqrtHz`. A current of 500 mA is `0.5` with unit `A`;
`mA` is not a legal unit.

## 10. Conformance

An implementation is conforming if every document it emits validates against
`schema/datasheet-1.0.schema.json`. A validator is conforming if it accepts every
fixture in `test/conformance/valid/` and rejects every fixture in
`test/conformance/invalid/`.

## Related work

IEC 61360 / IEC CDD and eCl@ss (property dictionaries, no conditions);
IBIS / SPICE (behavioral, condition-aware, not the datasheet table);
Octopart/Nexar and distributor APIs (identity + flat specs);
JEDEC, IPC-2581 (registration, manufacturing). None represent a datasheet value
together with its test conditions and provenance; that is this schema's
contribution.
