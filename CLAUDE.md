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
| `dictionary/<family>-x.y.json` | Per-family canonical keys, units, groups, aliases, hints. `ldo` (53 params), `mosfet` (28), `voltage_reference` (24). |
| `spec/v1.0/datasheet-spec.md` | Human-readable normative spec (RFC-2119 language). |
| `spec/v1.0/*.txt` | Corpus evidence: parameter-frequency analysis over the 39-datasheet LDO corpus. |
| `examples/*.datasheet.json` | Validated documents. 4 **real** LDOs + 1 illustrative MOSFET + 3 **real** voltage references. Double as regression fixtures. |
| `test/conformance/valid/` | Documents that MUST validate. |
| `test/conformance/invalid/` | Documents that MUST be rejected — they *define what "wrong" means*. |
| `scripts/validate.mjs` | The conformance runner (`npm test`). |
| `scripts/gen-types.mjs` | Generates the TypeScript bindings from the schema. |
| `bindings/typescript/` | Generated `.d.ts` + schema/dictionary re-exports (npm entrypoint). |
| `bindings/python/` | Pydantic v2 models, a two-stage validator, a flat-parametric importer, pytest suite. |
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

`bindings/python` has a pytest suite that round-trips every example through the pydantic
models *and* the JSON Schema. CI (`validate.yml`) runs the JS suite on every push and PR;
`npm run build` (used by the publish job) runs it too, so a release can't ship red.

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

- **Unit enum (closed):** `V A Hz degC ohm F s W C J dB V/V % ppm ppm/degC ppm/V ppm/A degC/W K/W V/us A/us V/sqrtHz`. No SI prefixes (a real per-mA/uV rate becomes `ppm/A` or `ohm`, never `ppm/mA`).
- **Parameter key:** `^[a-z][a-z0-9_]*$` (snake_case).
- **Pin function:** `^[A-Z][A-Z0-9_]*$` (open uppercase vocab).
- **Condition axis `param` vocab:** `T_J T_A V_IN V_OUT I_OUT I_LOAD F C_OUT C_IN ESR HEADROOM RIPPLE BW_LOW BW_HIGH V_EN C_OUT_TYPE` (extensible; a `unit` is required whenever a numeric `value`/`min`/`max` is present, omitted for note-only axes).
- **`limitClass`:** `absolute_max` | `recommended` | `characterized`.
- **Top-level required:** `schemaVersion` `component` `parameters` `provenance`.

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
