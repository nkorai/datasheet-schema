# Datasheet Schema, Specification v1.0

Status: draft. The key words MUST, MUST NOT, REQUIRED, SHOULD, and MAY are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

The normative machine artifact is [`schema/datasheet-1.0.schema.json`](../../schema/datasheet-1.0.schema.json), a JSON Schema 2020-12 document. Where this prose and the machine schema disagree, the machine schema governs.

## 1. Scope

This specification defines a JSON representation of the design-grade specifications of an electronic component as published in its datasheet. It covers the guaranteed and limiting values, the test conditions under which each holds, and the provenance of each value. It does not define a behavioral or simulation model, for which see IBIS and SPICE, nor a PCB-manufacturing format, for which see IPC-2581.

## 2. Design principles

1. Every value is conditioned. A specified value without its test conditions is not safe to design from. The `conditions` field is first-class.
2. Every value is traceable. A value SHOULD carry the page it was read from and SHOULD name the table. A `characterized` value MUST carry `sourcePage`.
3. Tables are semantics, not layout. Absolute-maximum, recommended-operating, and electrical-characteristics rows are distinguished by `limitClass`, not by separate containers.
4. One envelope, many families. The parameter shape is family-agnostic. A family dictionary supplies the canonical keys, units, and aliases.

## 3. Document structure

A conforming document is a JSON object with the following members.

| Field | Requirement | Description |
|---|---|---|
| `schemaVersion` | REQUIRED | MUST be "1.0". |
| `component` | REQUIRED | Identity. See section 4. |
| `pinout` | OPTIONAL | Array of pins. See section 5. |
| `parameters` | REQUIRED | Array of parameters. See section 6. |
| `provenance` | REQUIRED | Document-level audit trail. See section 8. |
| `notes` | OPTIONAL | Reviewer-facing free text. |

## 4. Component identity

`component` REQUIRES `mpn`, `manufacturer`, and `family`. `family` selects the applicable dictionary, for example `ldo`. `orderingVariants` MAY enumerate orderable codes with per-variant fixed voltage, package, temperature grade, and packing.

## 5. Pinout

Each pin REQUIRES a 1-indexed `number`, the printed `name`, and a normalized `function` from the controlled set IN, OUT, GND, EN, NC, BYP, ADJ, FB, PG, SENSE, BIAS, PAD. A consuming tool SHOULD bind a part by `function` rather than by `name`.

## 6. Parameters

A parameter has a canonical snake_case `key` matching `^[a-z][a-z0-9_]*$` and one or more `measurements`. The set of legal keys for a family is defined by its dictionary. A document SHOULD use only keys defined there, and a validator MAY enforce this. The reference conformance runner does. A parameter MAY carry `aliases` recording the vendor terms it was extracted from.

A parameter specified across several conditions, such as dropout per load current or PSRR per frequency, MUST provide one measurement per condition point.

## 7. Measurement

| Field | Requirement | Description |
|---|---|---|
| `limitClass` | REQUIRED | One of `absolute_max`, `recommended`, `characterized`. |
| `value` | REQUIRED | An object of `min`, `typ`, `nom`, `max`, at least one present. |
| `unit` | REQUIRED | A base-SI unit symbol. See section 9. |
| `conditions` | OPTIONAL | Typed condition axes. See section 7.1. SHOULD be present for characterized and recommended values. Absolute-maximum stress rows MAY omit them. |
| `stimulus` | OPTIONAL | Applied step for dynamic values. See section 7.2. |
| `conditionsVerbatim` | OPTIONAL | The conditions exactly as printed, so nothing is lost in normalization. |
| `sourcePage` | REQUIRED for `characterized` | 1-indexed page. |
| `sourceTable` | OPTIONAL | The originating table. |

`absolute_max` is a stress limit. Operating a device beyond it may cause permanent damage. `recommended` is the range over which parameters are specified. `characterized` is a measured or guaranteed electrical characteristic. Consumers MUST NOT treat an `absolute_max` value as an operating value.

### 7.1 Condition axes

A condition axis has a `param` and either a `value`, a `min` and `max` range, or a `note`. A `unit` is REQUIRED when a numeric `value`, `min`, or `max` is present, and is omitted for a note-only axis such as a package name or capacitor type. `param` uses this recommended vocabulary. Family-specific axes MAY extend it.

`T_J, T_A, V_IN, V_OUT, I_OUT, I_LOAD, F, C_OUT, C_IN, ESR, HEADROOM, RIPPLE, BW_LOW, BW_HIGH, V_EN, C_OUT_TYPE`

Using an unlisted `param` is permitted but reduces cross-tool interoperability.

### 7.2 Stimulus

Dynamic parameters, such as load and line transient response and start-up, describe an applied step with `param`, `from`, `to`, `unit`, and optional `slewRate` and `slewUnit`, rather than flatten the endpoints into shared conditions. The same shape serves load steps, line steps, and switching edges in other families.

## 8. Provenance

Document-level `provenance` MAY record `datasheetSha256`, `sourceUrl`, `datasheetRevision`, `publishedDate`, `fetchedAt`, `extractionMethod`, `extractedAt`, `confidence` (0 to 1, advisory), and `verified`, which is true only after a validation suite has passed. `confidence` alone MUST NOT be read as verification.

## 9. Units

Values are normalized to base-SI units so numeric comparison across parts is sound. `unit` MUST be one of V, A, Hz, degC, ohm, F, s, W, C, dB, V/V, %, ppm/degC, V/us, A/us, V/sqrtHz. A current of 500 mA is 0.5 with unit A. The unit mA is not permitted.

## 10. Conformance

An implementation is conforming if every document it emits validates against `schema/datasheet-1.0.schema.json`. A validator is conforming if it accepts every fixture in `test/conformance/valid/` and rejects every fixture in `test/conformance/invalid/`.

## Related work

IEC 61360, IEC CDD, and eCl@ss are property dictionaries without a condition field. IBIS and SPICE are condition-aware behavioral models rather than the datasheet table. Octopart, Nexar, and distributor APIs provide identity and flat specifications. JEDEC and IPC-2581 address registration and manufacturing. None represent a datasheet value together with its test conditions and provenance, which is this schema's contribution.
