# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com) and [Semantic Versioning](https://semver.org).

## [1.6.0]

Driven by a gap analysis extracting ten real manufacturer voltage-reference datasheets (TI, ADI, Renesas, Microchip — not via any pre-normalized source) into the schema and recording what did not fit. Eleven of twelve parts fit with additive vocabulary only; the sole structural case (the ovenized multi-block LTZ1000) is documented as an out-of-scope limitation rather than driving a re-architecture.

### Added
- Per-parameter **unit scoping** so an off-dimension unit is caught (a temperature in volts is rejected). The family-dictionary meta-schema gains an optional `altUnits` list; a parameter permits its canonical `unit` plus any `altUnits`, and `scripts/validate.mjs` rejects any measurement outside that set. `scripts/regression.mjs` additionally checks that a numeric condition on a well-known axis carries the right dimension (`T_*`→degC, `V_*`→V, `I_*`→A, `F`/`BW_*`→Hz, `C_*`→F). Negative fixtures in `test/conformance/dictionary-invalid/` (temperature-in-volts, voltage-in-degC); `altUnits` populated for the regulation/drift/hysteresis/accuracy parameters of `ldo` and `voltage_reference`.
- Measurement field `statistic` (`rms` | `peak_to_peak` | `peak` | `mean`) so a peak-to-peak and an RMS figure of the same quantity (reference output noise) are machine-distinguishable rather than differing only in a verbatim string. Tracked in the value snapshot.
- Unit `V/degC` (temperature-sensor output slope).
- `voltage_reference` dictionary: 15 parameters from the gap analysis — `short_circuit_current`, `reference_voltage` (adjustable/shunt internal reference, distinct from `output_voltage`), `reference_input_current`, `off_state_current`, `shutdown_current`, `enable_threshold_voltage`, `trim_range`, `esd_mm`, `thermal_resistance_junction_case`, a temperature-sensor sub-block (`temperature_sensor_output_voltage`, `temperature_sensor_slope`), and a heater sub-block (`heater_supply_voltage`, `heater_supply_current`, `heater_turn_on_current`, `heater_resistance`, groups `temperature_sensor`/`heater`). Now 41 parameters, 213 aliases.
- Recommended pin-function vocabulary extended: `REF`, `TRIM`, `NR`, `TEMP`, `SHDN`, `HEATER`, `VSET`, `GND_SENSE`, `OUT_FORCE`, `OUT_SENSE`, `KS`. Recommended condition axes extended: `V_S`, `I_R`, `I_C`, `C_NR`, `DIRECTION` (spec §5, §7.1).

## [1.5.0]

### Added
- Optional per-measurement trust fields (additive; every previously valid document stays valid): `guarantee` (`production_tested` | `by_design` | `by_characterization` | `typical`) records the datasheet's specification basis from the footnotes, independent of `limitClass`; `review` (`unchecked` | `confirmed` | `edited`) records extraction review state, mapping directly to an adopter's per-row review vocabulary; and per-value `confidence` (0–1) complements the document-level `provenance.confidence`. `review`/`confidence` are advisory and are not the `verified` flag (spec §7, §8). The value snapshot tracks `guarantee` (an extracted fact) but not `review`/`confidence` (advisory). Fixtures: `valid/measurement-trust-fields.json`; `invalid/bad-guarantee-value.json`, `invalid/bad-confidence-range.json`.
- `voltage_reference` dictionary: `output_capacitance_range` and `input_capacitance` (stability group), the load/bypass capacitance a reference needs for stability; used in the ADR4525 example (1–100 uF C_OUT). Dictionary now 26 parameters, 154 aliases.
- Unit enum: `ppm`, `ppm/V`, `ppm/A` (additive; every previously valid document stays valid). These complete the fractional-rate family alongside the existing `ppm/degC`, so a value a datasheet prints per volt (line regulation), per amp (load regulation), or as a bare fractional change (long-term drift, thermal hysteresis) is captured as printed and stays auditable against the source page, rather than lossily multiplied by VOUT into `V/V`/`ohm`/`%`. Positive and negative conformance fixtures added (`valid/ppm-units.json`; `invalid/bad-ppm-prefixed-unit.json`, which pins that a prefixed `ppm/mA` is still rejected). Normative note in `spec/v1.0/datasheet-spec.md` §9.
- Third component family, `voltage_reference` ([`dictionary/voltage_reference-1.0.json`](dictionary/voltage_reference-1.0.json), 24 parameters, 144 aliases), unifying series (3-terminal) and shunt (2-terminal) references in one vocabulary: the reference voltage is `output_voltage` for a series part and the reverse breakdown voltage for a shunt part, with shared aliases. Adds a shunt current condition axis `I_R` and the pin functions `CATHODE`/`ANODE`. Line/load regulation and drift/hysteresis use the new `ppm/V`, `ppm/A`, and `ppm` units (see above) so they are captured as printed, with the vendor's original form preserved in `conditionsVerbatim`.
- Three real, verified voltage-reference examples grounded in manufacturer datasheets via datasheets.md: TI LM4040 (10 V shunt), TI REF3025 (2.5 V series), and ADI ADR4525 (2.5 V precision series), spanning three manufacturers and both topologies.
- Regression suite (`scripts/regression.mjs`, `npm run regression`, folded into `npm test` and `npm run build` and CI). Hermetic — reads only committed files, no network, no PDF, no model. Checks (1) dictionary integrity the JSON Schema meta-schema cannot express: no duplicate keys, no alias collisions, every `unit` in the schema's closed enum, every `array` param declaring a `conditionAxis`; and (2) value snapshots of every example under `test/regression/snapshots/`, so a silently changed number, unit, condition, or source page fails the build. Regenerate intentionally with `npm run regression -- --update`.
- `CLAUDE.md` build guide: project thesis and invariant, guiding principles, the externally validated design pillars, the add-a-family golden path, two-axis versioning, the hermetic test model, and the GitHub Actions (OIDC) publish flow.

### Removed
- LDO dictionary `has_active_discharge`, an unusable capability flag surfaced by the new integrity check: a boolean has no base-SI unit and so could never appear in a measurement. The capability is signalled by the presence of `active_discharge_resistance`. Dictionary version 1.2. No valid document could have used the key, so nothing that validated before is affected.

## [1.4.0]

### Changed
- Relicensed from Apache-2.0 to MIT. The project has a single copyright holder and no external contributors, so the relicense is unencumbered. Versions already published under Apache-2.0 remain available under that license.

## [1.3.0]

### Added
- A second component family, `mosfet`, proving the schema is family-agnostic. [`dictionary/mosfet-1.0.json`](dictionary/mosfet-1.0.json) defines 28 canonical parameters for discrete power MOSFETs, with an illustrative example. The validator now checks each example's keys against the dictionary named by its `component.family`.
- Units `J` (energy, for single-pulse avalanche), `degC/W` and `K/W` (thermal resistance) to the unit enum. Thermal resistance previously had no correct unit.
- Python bindings in [`bindings/python`](bindings/python): pydantic v2 models, a validator that parses through the models and the JSON Schema, a flat-parametric importer, and a test suite.
- Four real, verified LDO reference examples (TLV70033, XC6206P332MR, ME6211C33M5G, HT7533), spanning four manufacturers.

### Changed
- A pin `function` is now an open uppercase vocabulary matching `^[A-Z][A-Z0-9_]*$` rather than a closed regulator-only enum, so a family such as `mosfet` can use G, D, S. All previously valid pin functions remain valid. A lowercase function is now a negative conformance fixture.

## [1.2.0]

### Added
- LDO dictionary: `output_current` (rated continuous output current, the headline current rating, distinct from `current_limit`), `operating_temperature_range`, and `storage_temperature_range`. These are among the most common rows in the corpus and were previously absent. The additions are backward compatible; documents valid under the 1.0 dictionary remain valid. Dictionary version 1.1.

## [1.1.0]

### Changed
- A condition axis unit is now required only when the axis carries a numeric value, min, or max. Note-only axes such as a package name or capacitor type no longer require a unit. This loosens a constraint, so all previously valid documents remain valid.
- Added PACKAGE and BOARD to the recommended condition vocabulary.

## [1.0.2]

### Changed
- README: added a prior-art section positioning against edatasheets, JEDEC JEP30, Cyanobyte, and CCSDS SOIS EDS. Schema unchanged.

## [1.0.1]

### Changed
- Published through the trusted-publishing workflow with a provenance attestation. No functional change from 1.0.0.

## [1.0.0]

### Added
- Initial `datasheet-1.0` schema, JSON Schema 2020-12, self-contained.
- The Measurement object: a value with min, typ, nom, and max, plus unit, typed conditions, and provenance. This is the conditioned-value and provenance model that existing standards omit.
- The `limitClass` enum with values absolute_max, recommended, and characterized, unifying the separate datasheet tables.
- Pluggable family dictionaries, and the `ldo-1.0` dictionary of 51 parameters, validated against a corpus of 39 datasheets from 20 manufacturers totaling 916 pages.
- Conformance suite with positive and negative fixtures, TypeScript bindings, and npm packaging with raw JSON Schema exports.
