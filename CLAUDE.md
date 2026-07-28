# datasheet-schema — build guide

## What this is

A machine-readable JSON Schema (2020-12) for the **design-grade specifications of an
electronic component**, as published in its datasheet. It represents three things that
no open standard captures together:

1. the **value** (with `min`/`typ`/`nom`/`max`),
2. the **test conditions** under which that value holds (a first-class, typed list), and
3. the **provenance** back to the source PDF page.

The reason all three matter: a bare value — `V_OUT = 3.3 V` — is not safe to design from.
You need the conditions it was measured under (`at I_OUT = 1 mA, T_J = 25 °C, V_IN = 4.3 V`),
whether it is a stress limit or an operating guarantee, and a pointer to the page so a
machine extraction can be **audited against the document it came from**. Parametric
databases (Octopart), classification dictionaries (IEC 61360, eCl@ss), and behavioral
models (IBIS, SPICE) each drop at least one of these. This schema is built around all
three. The nearest neighbor, `edatasheets`, is unmaintained and draft-07; this project's
design center is auditable extraction, and it is maintained.

**The audience is an extraction pipeline** (LLM/OCR reading PDFs) and the tools that
consume its output. Every design decision serves the goal of making extracted
specifications trustworthy and machine-checkable.

**Where extraction lives:** *not here.* This repo is the **contract and the exemplars**,
not a pipeline. PDF→JSON extraction runs in downstream consumers. The `examples/` here are
frozen outputs of past extraction runs, committed as validated reference documents. Nothing
in this repo fetches a PDF, calls a model, or needs the network — the whole test suite is
hermetic and runs identically in a network-isolated CI or publish job.

**Origin / end goal:** built to let an AI design a PCB end-to-end (the maintainer's Eurorack
synth boards) with no manual engineering effort. Datasheet ingestion is the bottleneck in
that flow, and no open, condition-and-provenance-aware schema existed. That is the north star:
specs an AI can ingest and *design from* safely.

## The non-negotiable invariant

> **Every value carries its `conditions` and traces to `provenance`.**

This is the schema's defining property. It does **not** change across any version, MINOR
or MAJOR. If a proposed change would let a value exist without a path to its conditions
and its source, the change is wrong, not the invariant. Everything else is negotiable.

## Externally validated — protect these

**Datasheets.md** (a commercial unified-datasheet effort, `dev.datasheets.md`) reviewed the
spec and the LDO/MOSFET dictionaries in detail and is folding this work into their own schema.
They independently singled out the following as solving real problems for them. Treat these as
**proven load-bearing decisions**: do not weaken or "simplify" them without a very strong
reason, because a real adopter depends on them.

1. **A test condition is a structured `param`/`value` pair, not free text.** This was called
   out as the single most valuable idea. Never let conditions degrade to a string blob.
2. **A parameter is an array of `measurements`** — a condition-swept spec (dropout per load,
   PSRR per frequency) never collapses into one row.
3. **`limitClass` is a first-class field on the value** (absolute_max / recommended /
   characterized), not a container or a layout artifact.
4. **Per-value provenance** to the source page.
5. **Deep, thoroughly-aliased vocabularies.** The dictionaries' alias sets were specifically
   praised as deeper than the adopter's own. Rich `aliases` are a **first-class deliverable**,
   not an afterthought — they are what makes cross-vendor extraction normalize to one key.
   Hold every new/edited parameter to this bar: enumerate the real vendor terms.

The license is **MIT** (relaxed from Apache-2.0 specifically to lower friction for adopters
like this). Attribution is welcomed but not required.

## Guiding principles

These are lifted from `spec/v1.0/datasheet-spec.md` §2 and `GOVERNANCE.md`. Follow them
when extending anything.

1. **Every value is conditioned.** `conditions` is first-class and typed, never a free-text
   blob. A parameter specified across several points (dropout per load current, PSRR per
   frequency) gets **one `measurement` per point**, not one measurement with a merged range.
2. **Every value is traceable.** A `characterized` value MUST carry `sourcePage`.
   `conditionsVerbatim` preserves the conditions exactly as printed, so normalization never
   loses information.
3. **Tables are semantics, not layout.** The absolute-maximum, recommended-operating, and
   electrical-characteristics tables of a datasheet are collapsed into one `parameters`
   array, distinguished by `limitClass` (`absolute_max` | `recommended` | `characterized`).
   A consumer MUST NOT treat an `absolute_max` value as an operating value. Never reintroduce
   separate containers for these — the distinction is a field, not a structure.
4. **One envelope, many families.** The measurement/condition/provenance/pinout structure is
   family-agnostic. Component-specific vocabulary lives in a **family dictionary**, not in
   the schema. **Adding a component family MUST NOT require a schema change.** If it seems to,
   the schema is too specific — generalize the envelope instead.
5. **Base-SI, always.** Values are normalized to base-SI units so cross-part numeric
   comparison is sound. 500 mA is `0.5` with unit `A`; `mA` is not a legal unit. The unit
   enum is closed (see Conventions). Adding a unit is a schema change with fixtures.
6. **Additive-only within a MAJOR.** A MINOR change (`1.0`→`1.1`) may only add optional
   fields, enum values, or dictionary parameters. Every previously valid document stays
   valid. Removing/renaming/newly-requiring anything is a MAJOR change with a new `$id`.
7. **Provenance is not confidence.** `verified: true` means a validation suite passed.
   `confidence` is advisory and MUST NOT be read as verification.

## Repository map

| Path | Role |
|---|---|
| `schema/datasheet-1.0.schema.json` | **The normative artifact.** Self-contained, no external `$ref`. Where prose and this disagree, this governs. |
| `dictionary/family-dictionary-1.0.schema.json` | Meta-schema every family dictionary validates against. |
| `dictionary/<family>-x.y.json` | Per-family canonical keys, units, groups, aliases, hints. `ldo` (62 params), `mosfet` (45), `voltage_reference` (41), `op_amp` (59), `dc_dc` (92), `diode` (39), `bjt` (55), `capacitor` (32), `resistor` (22), `inductor` (19), `jfet` (30), `comparator` (38), `analog_switch` (25), `adc` (92), `dac` (104), `crystal` (20), `led` (43), `laser_diode` (53), `photodiode` (52), `optocoupler` (93). |
| `spec/v1.0/datasheet-spec.md` | Human-readable normative spec (RFC-2119 language). |
| `CONFORMANCE.md` | The consumer's checklist: Layer 1 (portable JSON Schema) + Layer 2 (the 3 dictionary-driven family checks any consumer reimplements — key membership, unit scoping, axis dimension). Point adopters here. |
| `spec/v1.0/*.txt` | Corpus evidence: parameter-frequency analysis over the 39-datasheet LDO corpus. |
| `examples/*.datasheet.json` | Validated documents. 4 **real** LDOs + 1 illustrative MOSFET + 3 **real** voltage references. Double as regression fixtures. |
| `test/conformance/valid/` | Documents that MUST validate. |
| `test/conformance/invalid/` | Documents that MUST be rejected — they *define what "wrong" means*. |
| `scripts/validate.mjs` | The conformance runner (`npm test`). |
| `scripts/gen-types.mjs` | Generates the TypeScript bindings from the schema. |
| `bindings/typescript/` | **Dumb data binding** (npm entrypoint): generated `.d.ts` types + re-exports of the schema object and all family dictionaries. No logic. |
| `bindings/python/` | **Dumb data binding** (separate PyPI package): imports the schema + dictionaries as data, zero deps, no logic. Executable libraries (validation/extraction) ship separately, not here. |
| `.github/workflows/` | `validate.yml` (CI on push/PR), `publish.yml` (npm + Pages). |

## How to add a component family (the golden path)

This is the most common extension and it touches **no schema code**.

1. Study real datasheets first. Every parameter you add MUST appear across real parts or in
   a manufacturer parameter glossary. The LDO dictionary's authority comes from a
   39-datasheet/20-manufacturer corpus; hold new families to the same bar and record the
   evidence in the PR.
2. Create `dictionary/<family>-1.0.json` conforming to the family meta-schema. Each parameter
   needs a canonical snake_case `key` (`^[a-z][a-z0-9_]*$`), a `name`, a **base-SI `unit`
   from the closed enum**, and a `group`. Add `aliases` (vendor terms that normalize to this
   key), a `hint` (extraction guidance), and for per-condition params set `array: true` with
   a `conditionAxis`.
3. If a real parameter needs a **unit or condition axis that doesn't exist yet**, that is a
   schema change (additive, MINOR) — add it to the enum/vocabulary *and* add positive+negative
   fixtures. Prefer reusing an existing unit before widening the enum.
4. Write at least one **validated example** `examples/<family>-*.datasheet.json`. Prefer a
   real part with real provenance over an illustration.
5. Pin functions: `function` is an open uppercase vocabulary (`^[A-Z][A-Z0-9_]*$`). Reuse the
   recommended set; add family-specific functions as needed (a FET uses G/D/S).
6. `npm run build` (regenerates types, runs conformance). Green before PR.
7. `CHANGELOG.md` entry; bump the schema/dictionary version per the two-axis rule below.

## How to change the data contract (rarer, heavier)

Per `GOVERNANCE.md`, a change to the schema itself MUST:

1. Update `schema/datasheet-1.0.schema.json` **and** the normative note in `spec/`.
2. Add/update conformance fixtures: **a positive that must pass and a negative that must
   fail.** A schema you cannot fail is not a specification.
3. Keep `npm test` green in CI.
4. Record it in `CHANGELOG.md`.
5. Respect additive-only for a MINOR. Anything non-additive is MAJOR → new `$id`, and every
   previously published schema URL stays hosted forever so existing `$ref`s never break.

## Versioning — two independent axes

Keep these distinct; conflating them is a common mistake.

| Axis | Scheme | Where | Meaning |
|---|---|---|---|
| **Schema** | `MAJOR.MINOR` | filename + `$id` (`datasheet-1.0`) | the data contract |
| **Package** | full semver | `package.json` | the npm release |

Several `1.4.x` npm releases can ship the same `datasheet-1.0` schema. A dictionary carries
its own `dictionaryVersion` (additive bumps as parameters are added).

## Testing

The whole suite is **hermetic**: it reads only committed files, never the network, never a
PDF, never a model. It runs identically in network-isolated CI and in the OIDC publish job.

**`npm test` runs two scripts:**

`scripts/validate.mjs` — *conformance* (is a document structurally valid?):
- every `examples/*.json` **validates** against the schema, and its parameter `key`s all
  exist in the dictionary named by its `component.family`;
- every `test/conformance/valid/*` validates; every `test/conformance/invalid/*` is
  **rejected** (the negative fixtures define what "wrong" means);
- every dictionary validates against the family meta-schema.

`scripts/regression.mjs` — *regression* (do past extractions keep working?):
- **dictionary integrity** the schema can't express: no duplicate keys, no alias collisions
  (an alias mapping to two keys, or an alias equal to a key), every dictionary `unit` is in
  the schema's closed enum, every `array: true` param declares a `conditionAxis`;
- **value snapshots** — a canonical projection of each example's *extracted values*
  (identity, pin functions, and every measurement's `limitClass`/`value`/`unit`/`conditions`/
  `stimulus`/`sourcePage`) is compared against a committed snapshot in
  `test/regression/snapshots/`. A silently changed number, unit, condition, or page **fails
  the build**. This is the offline guarantee that a schema change or an edit never quietly
  alters a past extraction.

When you intentionally change or add an example, regenerate snapshots with
`npm run regression -- --update` (or `UPDATE_SNAPSHOTS=1 npm run regression`) and commit them
in the same change — the update is the deliberate acknowledgement that the extraction changed.

The bindings (`bindings/typescript`, `bindings/python`) are pure data re-exports with no
logic, so there is nothing to test in them beyond "the JSON imports"; the JS conformance +
regression suite is the gate. CI (`validate.yml`) runs it on every push and PR; `npm run
build` (used by the publish job) runs it too, so a release can't ship red.

## Publishing (do not run npm publish locally)

npm publishing is done by **GitHub Actions**, not from a laptop. `publish.yml` publishes to
npm only on **`workflow_dispatch`** (never on push), via npm **trusted publishing (OIDC) with
provenance** — there is no token and `npm login` is not involved. To release:

```
# bump package.json + finalize CHANGELOG, commit, push, then:
gh workflow run publish.yml --ref main
```

Pushes to `main` redeploy the GitHub Pages site (landing page + the hosted, permanent schema
URLs that `$id` resolves to). The Pages job runs on push; the npm job does not.

## Conventions (quick reference)

- **Unit enum (closed):** `V A Hz degC ohm F H s W C J S deg dB V/V % ppm ppm/degC ppm/degC2 ppm/V ppm/A V/degC A/degC degC/W K/W V/us A/us V/sqrtHz A/sqrtHz A2s bits Vs 1 m cd lm W/sr K lm/W m/degC W/A m/A A/W W/sqrtHz m2`. No SI prefixes (a real per-mA/uV rate becomes `ppm/A` or `ohm`, never `ppm/mA`). `S` is siemens (transconductance = A/V), `deg` is phase-margin degrees, `A/sqrtHz` is current-noise density, `H` is henries (recommended/integrated inductance), `A2s` is ampere-squared-seconds (a rectifier's I²t fusing rating). `bits` is a dimensionless base-2 count (fractional allowed) for a data converter's resolution/ENOB/effective/noise-free resolution. `Vs` is volt-seconds, a DAC's glitch impulse / digital feedthrough (a printed nV·s is `1e-9`; the distinct glitch *magnitude* stays `V`). `ppm/degC2` is ppm per °C² (ppm·K⁻²), a tuning-fork crystal's second-order (parabolic) turnover coefficient — `Δf/f = coeff·(T−T_turnover)²`; distinct from the linear `ppm/degC` and not interconvertible with it, so it is a first-class value, never buried in verbatim. The LED photometric/radiometric units: `m` (wavelength/bandwidth, nm→m ×1e-9; **optical-length quantities *and* safety-insulation distances only** — an optocoupler's creepage/clearance/internal-insulation-thickness in `m` (mm→m ×1e-3) are legitimate design-grade values, but a mechanical package *outline* is still never a measurement), `cd` (luminous intensity, mcd→cd), `lm` (luminous flux), `W/sr` (radiant intensity, mW/sr→W/sr; radiant flux stays `W`), `K` (absolute CCT — a 5000 K colour point, NOT 5000 degC), `lm/W` (efficacy), `m/degC` (wavelength drift, nm/K). A visible LED is photometric (cd/lm), an IR/UV emitter radiometric (W/sr/W) — never both; CRI and CIE x/y stay `1`. The laser_diode units: `W/A` (slope/differential efficiency dP/dI — a printed mW/mA is the identical number) and `m/A` (wavelength current-tuning dλ/dI — nm/mA→m/A ×1e-9). A laser's linewidth is a frequency width in `Hz` (a multimode part's spectral width stays `m`); SMSR and RIN stay `dB` (RIN's /Hz reference in verbatim, the ADC-NSD precedent); M²/NA stay `1`. laser_diode reuses the emitter envelope; its monitor photodiode is an optional `monitor_pd` block, its TEC/thermistor an optional `cooler` block (shared MPN), the driver IC is out. The photodiode (photodetector) units INVERT the emitter's: `A/W` responsivity (photocurrent per incident watt — reciprocal of `W/A`; using `W/A` for a detector inverts the transfer direction, caught by the negative fixture), `W/sqrtHz` NEP (completes the `V/sqrtHz`/`A/sqrtHz` family), `m2` photosensitive area (mm²→m² ×1e-6; distinct from a wavelength/diameter in `m`). Avalanche gain/excess-noise/k-factor stay `1`; D* (Jones) is derived not stored; a detector's illumination stimulus (irradiance W/m² or lux) stays verbatim — those units are deliberately NOT in the enum (they belong to future phototransistor/ALS families). A printed `%/degC` breakdown tempco converts to `ppm/degC` (×10⁴); RF power in `dBm` converts to `W` (`10^((dBm−30)/10)`); a converter's INL/DNL/offset in **LSB** converts to `ppm`-of-FSR (`LSB×1e6/2ᴺ`); a dBFS/dBc/dBFS-per-Hz figure stays `dB` — the printed form is kept in `conditionsVerbatim` and none of LSB/dBFS/dBc/dBm enters the enum. The optocoupler family (the first since the passives to need **zero new units**) reuses the enum wholesale: current transfer ratio→`%` (altUnit `1`), every isolation rating (VISO/VIORM/VIOTM/VIOSM/VPR)→`V` with the printed Vrms/Vpeak distinction carried by the measurement `statistic` (rms/peak), not a unit; CMTI and triac dv/dt→`V/us` (kV/µs ×1e3, but a printed V/µs is stored as-is — the trap); data rate→`Hz` (MBd ×1e6, binary NRZ); linear-coupler transfer gain K3=K2/K1 and K1/K2→`1`; CTI→`V` (a tracking index literally in volts, altUnit `1`); creepage/clearance/insulation-thickness→`m` (per the broadened `m` note above). Deliberate non-adds kept verbatim: partial-discharge charge (pC — a test-acceptance criterion, not a device value; VPR in `V` is the value), humidity `%RH`, and `MBd` baud. A single-value isolation withstand is stored in the `max` slot with `absolute_max` (the diode VRRM precedent), so the headline rating is queryable on one bound across parts.
- **`component.polarity`** (`positive` | `negative` | `bipolar`, optional, default positive): declare a negative-rail regulator/reference so a consumer never infers rail sign from the sign of numbers. On a negative part, ranges keep numeric ordering (`min` is the more-negative bound); differential magnitudes (dropout, headroom, offset) stay positive.
- **Unit scoping (dimension safety):** the enum is family-agnostic, so the core schema can't know `output_voltage` is volts. Each dictionary parameter declares its canonical `unit` plus, for genuinely multi-unit params (line/load regulation, drift, hysteresis, accuracy), an `altUnits` list. `scripts/validate.mjs` **rejects** any measurement whose unit isn't the param's `unit`/`altUnits` (temperature in volts fails), and `scripts/regression.mjs` checks numeric conditions on well-known axes carry the right dimension (`T_*`→degC, `V_*`→V, `I_*`→A, `F/BW_*`→Hz, `C_*`→F). Negative fixtures live in `test/conformance/dictionary-invalid/`.
- **Parameter key:** `^[a-z][a-z0-9_]*$` (snake_case).
- **Pin function:** `^[A-Z][A-Z0-9_]*$` (open uppercase vocab).
- **Condition axis `param` vocab:** `T_J T_A T_C T_SP T_L T_RISE V_IN V_OUT V_EN V_S V_CM V_GS V_DS V_DG V_G1_G2 V_FB V_SW V_CC V_CCX V_SS V_C V_SENSE V_RREF V_R V_DC V_AC V_D V_L V_CE V_CB V_EB V_OVERDRIVE I_OUT I_LOAD I_R I_C I_D I_S I_G I_CC I_DC I_F I_T I_PP I_Z I_RR I_B I_E F F_SW DI_DT DUTY PULSE_WIDTH L_DROP C_OUT C_IN C_NR C_FF C_SET C_L C_SS C_RAMP ESR R_L R_S R_F R_G R_T R_ILIM R_TC R_BE A_V ACCURACY HEADROOM RIPPLE BW_LOW BW_HIGH C_OUT_TYPE F_IN F_S F_OUT F_CLK DATA_RATE GAIN A_IN A_OUT V_REF V_SUPPLY OSR WEIGHTING BUFFER RANGE PHASE BW_POINT STEP ACCURACY CODE INTERP REFERENCE MODE SWITCH DRIVER N_PS WAVEFORM PACKAGE BOARD DIRECTION DL AGING_PERIOD RESONANCE TEST EMITTER CCT P_OUT LAMBDA M OUTPUT OUTPUT_STATE CHANNEL I_PD V_PD V_DET I_TM V_MT` (op-amps add V_CM/R_L/A_V/C_L/R_S; dc_dc adds F_SW/V_C/V_SENSE/V_RREF/I_CC/C_RAMP/R_TC plus note-only SWITCH/DRIVER/N_PS; diodes add I_F/V_R/I_T/I_PP/I_Z/I_RR/T_L and note-only WAVEFORM; BJTs add V_CE/V_CB/V_EB/I_B/I_E/R_BE; capacitor/inductor/resistor add I_DC (DC-bias/saturation), V_DC/V_AC (cap bias/AC level), T_RISE (temp rise), PULSE_WIDTH (pulse duration in **s** — NOT T_P, to avoid the T_*→degC rule), and note-only L_DROP (inductance-drop %); jfet adds V_DG/V_G1_G2; comparator adds V_OVERDRIVE; analog_switch adds V_D (+ V_S reused); adc adds F_IN/F_S/DATA_RATE/GAIN/A_IN/V_REF/V_SUPPLY (V_REF/V_SUPPLY→V, rest unconstrained) plus note-only OSR/WEIGHTING/BUFFER/RANGE/PHASE/BW_POINT, and `bits` is its resolution/ENOB unit; dac adds F_OUT/F_CLK/A_OUT plus note-only STEP/ACCURACY/CODE/INTERP/REFERENCE, and `Vs` is its glitch-impulse unit; crystal adds DL (drive level→W, the excitation ESR/tolerance are measured at) plus note-only MODE (fundamental/3rd_overtone/… selecting the ESR band), RESONANCE (series/parallel — a series part omits load_capacitance), AGING_PERIOD (first_year/10_year — aging is bounded ppm over a window, never `ppm/year`), TEST (shock/vibration/reflow/… bounding a permanent frequency shift), and `ppm/degC2` is its parabolic-turnover-coefficient unit + `1` (dimensionless) for `quality_factor` Q and `capacitance_ratio` C0/C1 — both pure numbers a completeness critic found printed as guaranteed rows (Statek prints Q; ABS07 prints 10000/30000) with no home, so `1` was added rather than drop a printed value. ESR is `array:true`/axis F but is single-valued per grade: the per-frequency-band table is a family ordering artifact and a wider-temp higher-ESR row is a *different grade*, so one document emits one ESR — array only for a deliberate multi-frequency family doc; led adds the note-only EMITTER (red/green/blue/white/amber — which die of a multi-color part a per-die value applies to, composing with I_F; a package-wide limit carries no EMITTER) and CCT (unit K, a white LED's colour-temperature point), reuses I_F/T_A/T_SP/PULSE_WIDTH/DUTY/R_L, and its new units are `m` (wavelength/bandwidth, nm→m; optical-length only, never mechanical outline), `cd`/`lm`/`lm/W` (photometric — visible parts), `W/sr` (radiant intensity — IR/UV parts; radiant flux stays `W`), `K` (absolute CCT, NOT degC), and `m/degC` (wavelength tempco); a part is photometric XOR radiometric; laser_diode adds P_OUT (rated optical output power→W, the point its threshold/voltage/wavelength/monitor-current are quoted at) and reuses I_F (drive current, the L-I sweep axis), T_C, V_R (monitor bias), PULSE_WIDTH/DUTY; its new units are `W/A` (slope efficiency) and `m/A` (wavelength current tuning); photodiode adds LAMBDA (incident wavelength→m, the axis responsivity/spectral-response sweeps over) and M (avalanche gain, dimensionless, the axis an APD's dark-current/bandwidth/excess-noise sweep over), reuses V_R/R_L, and its new units are `A/W` (responsivity), `W/sqrtHz` (NEP), `m2` (active area) — illumination stimulus (W/m²/lux) stays verbatim; optocoupler reuses I_F (LED drive, the CTR sweep axis)/V_CE/V_OUT/V_CC/V_EN/V_CM (the common-mode bias CMTI is measured at)/V_R/I_OUT/R_L/R_G/C_L/F/DUTY/PULSE_WIDTH/DATA_RATE and adds note-only OUTPUT (the output-type discriminator: phototransistor/darlington/logic/gate_drive/linear/photovoltaic/triac_driver — presence of the output-block keys is the primary signal, this axis disambiguates a value on a multi-stage part), OUTPUT_STATE (high/low — arrays a logic/gate-drive part's CMTI |CMH|/|CML| and supply currents onto one param), SWITCH (zero_cross/random_phase for a triac driver), CHANNEL (multi-channel parts), plus I_PD/V_PD/V_DET (a linear coupler's servo/output photodiode current and detector bias) and I_TM/V_MT (a triac driver's on-state current and main-terminal voltage); optocoupler adds **zero units**) (extensible; a `unit` is required whenever a numeric `value`/`min`/`max` is present, omitted for note-only axes like `DIRECTION`=source/sink/shunt or `WAVEFORM`=10/1000us). The dimension check in `regression.mjs` enforces `T_*`→degC (so `T_RISE` is a degC delta), `V_*`→V, `I_*`→A, `R_*`→ohm, `F`/`BW_*`→Hz, `C_*`→F; other axes (e.g. `DI_DT`=A/us, `A_V`=dimensionless, `N_PS`=V/V, `PULSE_WIDTH`=s, `L_DROP`=%) are unconstrained.
- **`limitClass`:** `absolute_max` | `recommended` | `characterized`.
- **Measurement optional fields:** `statistic` (`rms` | `peak_to_peak` | `peak` | `mean`) distinguishes a p-p from an RMS figure of the same quantity; `guarantee` (`production_tested` | `by_design` | `by_characterization` | `typical`) — the datasheet's basis, independent of `limitClass`; `review` (`unchecked` | `confirmed` | `edited`) and per-value `confidence` (0–1) — advisory extraction metadata, **not** the `verified` flag. The regression snapshot tracks `statistic` and `guarantee` (facts), not `review`/`confidence` (advisory).
- **Top-level required:** `schemaVersion` `component` `parameters` `provenance`.
- **One grade per document.** A document describes one orderable grade (one `mpn`). When a datasheet covers several grades whose specs differ (A/B/C/D initial accuracy, tempco), emit one document per grade rather than merging them, so no measurement is ambiguous about which grade it applies to (spec §4). `orderingVariants` still lists same-grade sibling codes (packing/reel-vs-tube).

## Anti-goals — do not do these

- Do not add a behavioral/simulation model (that's IBIS/SPICE) or PCB manufacturing data
  (IPC-2581). Scope is the guaranteed datasheet table.
- Do not let a value exist without a route to its conditions and provenance.
- Do not encode a datasheet's *table layout* in the structure; encode its *semantics*
  (`limitClass`).
- Do not push family-specific fields into the core schema; they belong in a dictionary.
- Do not accept a unit with an SI prefix, or invent units outside the enum without an
  additive schema change + fixtures.
- Do not redistribute manufacturer datasheet PDFs. The schema describes extracted factual
  specifications (not copyrightable); the PDFs are not ours to ship.
