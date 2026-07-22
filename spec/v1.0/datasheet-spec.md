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

`polarity` (`positive` | `negative` | `bipolar`) declares the rail polarity of a regulator or reference so a consumer never infers it from the sign of extracted values. It defaults to `positive` and MAY be omitted. When `negative`, the output, input, and their conditions are negative numbers, and a range keeps numeric ordering — `min` is the more-negative bound, so an input range of −20 V to −2.3 V has `min` −20 and `max` −2.3. Differential magnitudes (dropout, headroom, offset) are stored as positive magnitudes regardless of rail.

A document describes **one orderable grade** of a part. When a single datasheet covers several grades whose specifications differ — for example initial accuracy or temperature coefficient that change with an A/B/C/D suffix — a producer SHOULD emit **one document per grade**, each with its `component.mpn` set to that grade's part number and its `measurements` carrying that grade's numbers, rather than merging grades into one document. This keeps every value unambiguous: a consumer never has to guess which grade a measurement applies to. `orderingVariants` MAY still list sibling order codes of the same grade (packing, tape-and-reel versus tube). A future MINOR MAY add an explicit per-measurement grade selector if multi-grade documents become necessary; until then the one-grade-per-document convention holds.

## 5. Pinout

Each pin REQUIRES a 1-indexed `number`, the printed `name`, and a normalized `function`. `function` is an uppercase string from a controlled vocabulary that families extend, matching `^[A-Z][A-Z0-9_]*$`. The recommended vocabulary is IN, OUT, GND, EN, NC, BYP, ADJ, FB, PG, SENSE, BIAS, PAD for regulators and references, and G, D, S for field-effect transistors. References and regulators extend it with CATHODE, ANODE (shunt), REF (adjustable reference input), TRIM, NR (noise reduction), SS (soft-start), SHDN, TEMP (temperature-sensor output), HEATER, VSET (output-programming strap), BIAS, ILIM (current-limit program), PGFB (power-good feedback), GND_SENSE, OUT_FORCE, OUT_SENSE (Kelvin), NIC, DNC. Transistors extend it with KS (Kelvin/driver source). Operational amplifiers extend it with IN_P, IN_N (the two inputs), VS_POS, VS_NEG (dual supply rails), NULL (offset trim), COMP (external compensation), PD (power-down), and GUARD (electrometer guard buffer). Using an unlisted function is permitted but reduces interoperability, and a validator MAY constrain the set for a given family. A consuming tool SHOULD bind a part by `function` rather than by `name`.

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
| `statistic` | OPTIONAL | The statistical form when a quantity is specified more than one way: `rms`, `peak_to_peak`, `peak`, or `mean` (for example a peak-to-peak versus an RMS noise figure). |
| `guarantee` | OPTIONAL | The datasheet's basis for the value: `production_tested`, `by_design`, `by_characterization`, or `typical`. |
| `review` | OPTIONAL | Extraction review state: `unchecked`, `confirmed`, or `edited`. |
| `confidence` | OPTIONAL | Advisory per-value extraction confidence, 0 to 1. |

`absolute_max` is a stress limit. Operating a device beyond it may cause permanent damage. `recommended` is the range over which parameters are specified. `characterized` is a measured or guaranteed electrical characteristic. Consumers MUST NOT treat an `absolute_max` value as an operating value.

`guarantee` records the specification basis from the datasheet's footnotes and is independent of `limitClass`: `limitClass` says which kind of limit a value is, `guarantee` says whether it is production-tested or ensured by design or characterization. `review` and `confidence` describe the extraction, not the datasheet, and are advisory in the sense of section 8: neither is the `verified` flag, and `confidence` alone MUST NOT be read as verification.

### 7.1 Condition axes

A condition axis has a `param` and either a `value`, a `min` and `max` range, or a `note`. A `unit` is REQUIRED when a numeric `value`, `min`, or `max` is present, and is omitted for a note-only axis such as a package name or capacitor type. `param` uses this recommended vocabulary. Family-specific axes MAY extend it.

`T_J, T_A, T_C, T_SP, V_IN, V_OUT, V_EN, V_S, V_CM, V_GS, V_DS, I_OUT, I_LOAD, I_R, I_C, I_D, I_S, I_G, F, DI_DT, C_OUT, C_IN, C_NR, C_FF, C_SET, C_L, ESR, R_L, R_S, R_F, R_G, R_ILIM, A_V, ACCURACY, HEADROOM, RIPPLE, BW_LOW, BW_HIGH, C_OUT_TYPE, PACKAGE, BOARD, DIRECTION`

Transistor axes include `V_GS`, `V_DS`, `I_D`, `I_S` (source/reverse current), `I_G` (gate current), `DI_DT` (di/dt, unit A/us), `T_C` (case) and `T_SP` (solder-point) temperatures. `I_R` is a shunt reverse/cathode current, `V_S` a heater/stabilizer supply rail, `C_NR`/`C_FF`/`C_SET` are noise-reduction/feed-forward/set-pin capacitors, `R_ILIM` a current-limit program resistance, `I_C` a transistor collector current, and `DIRECTION` a note-only axis (`source`, `sink`, `shunt`) for a spec given per current direction. Using an unlisted `param` is permitted but reduces cross-tool interoperability.

### 7.2 Stimulus

Dynamic parameters, such as load and line transient response and start-up, describe an applied step with `param`, `from`, `to`, `unit`, and optional `slewRate` and `slewUnit`, rather than flatten the endpoints into shared conditions. The same shape serves load steps, line steps, and switching edges in other families.

## 8. Provenance

Document-level `provenance` MAY record `datasheetSha256`, `sourceUrl`, `datasheetRevision`, `publishedDate`, `fetchedAt`, `extractionMethod`, `extractedAt`, `confidence` (0 to 1, advisory), and `verified`, which is true only after a validation suite has passed. `confidence` alone MUST NOT be read as verification.

## 9. Units

Values are normalized to base-SI units so numeric comparison across parts is sound. `unit` MUST be one of V, A, Hz, degC, ohm, F, s, W, C, J, S, deg, dB, V/V, %, ppm, ppm/degC, ppm/V, ppm/A, V/degC, A/degC, degC/W, K/W, V/us, A/us, V/sqrtHz, A/sqrtHz. A current of 500 mA is 0.5 with unit A. The unit mA is not permitted. Thermal resistance uses degC/W (equivalently K/W), energy such as single-pulse avalanche or switching loss uses J, transconductance uses S (siemens, equivalently A/V), phase margin uses deg (degrees of plane angle), current-noise density uses A/sqrtHz (the current analog of V/sqrtHz), and a current temperature coefficient such as input-bias-current drift uses A/degC. The fractional-rate family — ppm for a dimensionless change such as long-term drift or thermal hysteresis, and ppm/V and ppm/A for line and load regulation — joins ppm/degC so that a rate a datasheet prints per volt or per milliamp is captured as printed rather than lossily converted; the value stays comparable across parts and auditable against the page. A rate printed in uV/V or uV/mA MAY instead use the dimensionless V/V or the derived ohm (dVOUT/dIOUT) when that is how the part specifies it. `V/degC` carries a temperature-sensor output slope.

The unit enum is family-agnostic, so the core schema alone does not know that `output_voltage` is volts. A family dictionary parameter declares its canonical `unit` and, for parameters vendors specify more than one way, an `altUnits` list; a conforming validator SHOULD reject a measurement whose unit is neither the parameter's `unit` nor one of its `altUnits`, so an off-dimension unit (a temperature in volts) is caught. Likewise a numeric condition on a well-known axis SHOULD carry the axis's dimension (a `T_*` axis is degC, a `V_*` axis is V, an `I_*` axis is A, a frequency axis is Hz, a `C_*` axis is F). The reference conformance runner enforces both.

## 10. Conformance

Conformance has two layers, defined in full by [`CONFORMANCE.md`](../../CONFORMANCE.md).

**Layer 1 (JSON Schema, portable).** A document is schema-conforming if it validates against `schema/datasheet-1.0.schema.json` with any JSON Schema 2020-12 validator. This enforces the entire structure and the non-negotiable invariant. A validator is Layer-1 conforming if it accepts every fixture in `test/conformance/valid/` and rejects every fixture in `test/conformance/invalid/`.

**Layer 2 (family checks).** The core schema is family-agnostic and cannot know that `output_voltage` is volts, so three checks against the dictionary named by `component.family` are the consumer's responsibility: (C1) every parameter `key` is defined in that dictionary; (C2) every `measurement.unit` is the dictionary parameter's `unit` or one of its `altUnits`, so an off-dimension unit is rejected; (C3) a numeric condition on a well-known axis carries that axis's dimension. These are data-driven from the dictionary JSON and are small to reimplement in any language. A document is fully conforming if it passes both layers. The `test/conformance/dictionary-invalid/` fixtures are schema-valid documents that a Layer-2 conforming consumer MUST reject. The reference runner `scripts/validate.mjs` performs Layers 1 and 2; where prose and that code disagree, the code governs.

## Related work

IEC 61360, IEC CDD, and eCl@ss are property dictionaries without a condition field. IBIS and SPICE are condition-aware behavioral models rather than the datasheet table. Octopart, Nexar, and distributor APIs provide identity and flat specifications. JEDEC and IPC-2581 address registration and manufacturing. None represent a datasheet value together with its test conditions and provenance, which is this schema's contribution.
