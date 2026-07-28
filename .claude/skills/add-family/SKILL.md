---
name: add-family
description: >-
  The golden path for adding a new component family (or extending an existing one) to
  datasheet-schema — the corpus → dictionary → examples → adversarial-verify →
  completeness-critic → ship pipeline used to build adc, dac, crystal, led, laser_diode,
  and photodiode. Use when asked to "add a family", "expand the schema", "do the next
  family", run the corpus/family-expansion process, or when picking what to build next
  (see references/family-roadmap.md for the prioritized remaining list). Multi-agent and
  token-heavy by design; it depends on the Agent tool.
---

# Adding a component family to datasheet-schema

This codifies the exact, proven pipeline. Read `CLAUDE.md` (the project build guide) first —
it is the source of truth for the invariant, the unit enum, the two-axis versioning, and the
publish flow. This skill is *how to run the expansion*, not a replacement for those rules.

**The non-negotiable invariant** (never violate, never "simplify" away): every value carries
its `conditions` and traces to `provenance`. And **base-SI, always** — the unit enum is closed;
adding a unit is an additive schema change with a positive AND a negative fixture.

**Pick the family** from `references/family-roadmap.md` (highest-value first) unless the user
names one. Confirm it is a discrete, orderable component with a design-grade datasheet spec
table — not a module, a behavioral model, or a system IC (those are anti-goals).

---

## The pipeline (7 phases)

### Phase 1 — Corpus (fan out ~5 agents over ~20 real datasheets)

Spawn **5 `general-purpose` agents in one message** (they run concurrently):
- **4 sub-type extractors**, each covering ~4 real datasheets from a distinct sub-type of the
  family (e.g. for `led`: indicator / white-lighting / RGB / IR-UV). Partition so the union
  covers the family's real spread and the vendor-terminology diversity.
- **1 scope + unit-synthesis agent** that extracts 4 more parts AND settles: the scope boundary
  (what's in vs a separate future family), the definitive new-unit list, and any new condition
  axes / pin functions.

Each extractor agent MUST:
- Fetch the **real manufacturer PDF** (WebSearch/WebFetch), read it, and transcribe values *as
  printed* with the printed unit, the verbatim test conditions, and the source page. If a site
  bot-blocks the fetch, substitute an equivalent readable part and say so. **Never fabricate** —
  flag any value not verified against a real datasheet.
- Be handed the **current closed unit enum** verbatim, and told to flag EVERY quantity whose
  natural unit is not in it, with a base-SI recommendation + the normalization factor.
- Return: (1) per-part tables, (2) the union of parameters with appearance frequency, (3)
  unit-gap findings, (4) **real vendor alias terms per parameter** (the praised first-class
  deliverable — enumerate every printed symbol/phrase).

Wait for all five. As they return, note the emerging unit set and scope.

### Phase 2 — Lock the design (you, not an agent)

From the corpus, decide and write down:
- **Scope boundary** — one coherent vocabulary. Split off adjacent devices as *separate future
  families* the way LED/laser driver ICs are kept out of the emitter families. "One envelope,
  many families" is the test: if half the keys would be N/A for any given part, split.
- **New units** — the minimum set that captures a *printed, guaranteed, comparable* value.
  - Add a unit only when there is no faithful existing representation. Reuse aggressively.
  - Deliberate NON-adds go in `conditionsVerbatim` (photometric lux, irradiance W/m², dBm,
    dBc/Hz, Jones D*, LSB, the multiplicative ×/°C dark-current factor). Document *why* each is
    excluded — an explicit boundary, not an accident.
  - Each unit mirrors an existing one where possible (A/W is the reciprocal of W/A; W/sqrtHz
    completes the V/sqrtHz family) — say so in the enum description.
- **New condition axes** and **pin functions** (both open vocab, extend freely).

### Phase 3 — Schema change (only if a unit is genuinely new)

Edit `schema/datasheet-1.0.schema.json`: append the unit(s) to the `enum` AND extend the
`unit` title description explaining each. Then add fixtures:
- `test/conformance/valid/<positive>.json` — a document using the new unit that MUST validate.
- `test/conformance/dictionary-invalid/<negative>.json` — schema-valid but *wrong dimension*
  (e.g. responsivity in `W/A` instead of `A/W`), which the family unit-scoping check MUST
  reject. A schema you cannot fail is not a specification.

`scripts/regression.mjs` reads the enum from the schema, so no code change is needed.

### Phase 4 — Dictionary (you write it, deep aliases)

Create `dictionary/<family>-1.0.json` (`dictionaryVersion` "1.0"). Each param: snake_case
`key` (`^[a-z][a-z0-9_]*$`), `name`, base-SI `unit`, `group`, and — held to the adopter bar —
a **deep `aliases`** set enumerating every real vendor symbol/phrase (include Greek glyphs:
λ, θ, η, Δν, Φ, plus the primary symbol like `Popt`). Add `array: true` + `conditionAxis` for
condition-swept params, `altUnits` for genuinely multi-unit params, `optional: true` unless the
param is *universal* to the family (do NOT mark a param required if real complete datasheets
omit it — that would reject valid extractions; this is the `nep`-was-wrongly-required lesson).
Write a `hint` with the base-SI normalization factor and the modeling guidance.

Validate immediately: `npm run validate` (meta-schema) + `npm run regression` (integrity: no
dup keys, no alias collisions — watch case-insensitive ones like `Ct`/`CT`, `VR`/`Vr` — every
unit in the enum, every array param has a conditionAxis).

### Phase 5 — Examples (fan out ~5 agents, one per sub-type)

Spawn **5 builder agents**, each for a specific real part chosen to exercise a distinct feature
(a new unit, an array axis, a sub-type block, a modeling edge case). Each agent:
- Reads the dictionary, the schema, and a recent example for the envelope shape.
- Is given the specific part + source URL + the corpus values, and told: **fetch the real PDF,
  compute its SHA-256, verify EVERY value against the page** (correct anything that disagrees),
  use ONLY dictionary keys, normalize to base-SI, set `limitClass` correctly, and self-validate
  (`npm run validate` then `npm run regression -- --update`) until green.
- Reports its SHA, any disagreements, and any datasheet value with no dictionary key (a free
  completeness signal).

Prefer a real part with real provenance over an illustration. One document = one orderable
grade (one MPN); emit sibling grades as separate documents, packing/reel variants as
`orderingVariants`.

### Phase 6 — The critical check (fan out 3 agents; this is the point of the whole thing)

Spawn in one message:
- **2 adversarial verifiers** (split the examples). Each REFUTES: re-fetches the PDF,
  recomputes the SHA-256 and confirms it matches, recomputes every base-SI conversion, checks
  min/typ/max labels against the *physical table column*, checks `limitClass` and `sourcePage`,
  and hunts for invented values, dropped specs, and unit inversions. Reports CONFIRMED/DEFECT
  per measurement with severity.
- **1 completeness critic** on the dictionary: what real, printed, guaranteed parameters or
  vendor aliases are MISSING, grounded in 4-6 more real datasheets. It reliably surfaces
  additive keys and alias gaps.

**Verify claims against the bytes, not the agent.** A verifier can hallucinate (one claimed a
"catastrophic provenance defect" — the committed SHA resolved to a *different* part; re-fetching
and hashing the PDF myself proved the file was correct and the verifier had misread). When a
verifier and a builder disagree on what a hashed PDF contains, settle it by fetching and
inspecting the bytes yourself — never trust an assertion over verifiable fact.

### Phase 7 — Apply fixes, docs, ship

Fold the critical-check findings into ONE batch: dictionary touch-up (bump `dictionaryVersion`
to 1.1; new keys + aliases + hint fixes), example value fixes, then `npm run regression --
--update` to regenerate the changed snapshots (the deliberate acknowledgement that an extraction
changed). Confirm the schema diff is *exactly* the intended units.

Update docs in lockstep — the family count and unit line appear in several places:
- `CLAUDE.md`: the family-table row (`<family> (N params)`), the unit-enum line + its
  description sentence, the condition-axis line.
- `README.md`: the "N families" prose, the families table row, the examples paragraph.
- `CHANGELOG.md`: a concrete `## [x.y.z]` entry (NEVER `[Unreleased]`) with an "### Added"
  block and a "### Note on verification" documenting what the critical check caught.
- `package.json`: bump the semver.

Then: green `npm run build`; **remove any stray manufacturer PDFs corpus agents left in the repo
root** (`rm -f *.pdf` — redistributing datasheet PDFs is an anti-goal; `git ls-files '*.pdf'`
must stay empty); `git add -A && git commit` (co-author line per CLAUDE.md) and `git push origin
main` (redeploys Pages); `gh workflow run publish.yml --ref main` (npm OIDC — never `npm publish`
locally); verify `npm view datasheet-schema version dist-tags.latest`.

Finally, update the auto-memory `datasheet-schema-intent.md` with the shipped family, its units,
its scope decisions, and any process lesson.

---

## Hard-won lessons (each cost a real bug or a near-miss)

- **Base-SI normalization is the #1 error source.** kHz→Hz is ×1e3 (1200 kHz = 1.2e6, NOT 1.2e9 —
  a 1000× error shipped in a hint once); nm→m ×1e-9; mm²→m² ×1e-6; mcd→cd ×1e-3; mW/sr→W/sr ×1e-3;
  %/°C→ppm/degC ×1e4; kΩ→ohm ×1e3. When an agent's physics sanity-check contradicts your prompt,
  the agent is usually right — trust the sanity-check.
- **Capture what's printed, comparably.** A printed guaranteed scalar with no key defeats the
  schema's purpose for that value even if it lands in verbatim. When the completeness critic finds
  one (a crystal's Q, an LED's Duv, a photodiode's TCID), add the key — that's the point of the pass.
- **One grade per document.** A multi-bin/multi-frequency table is a *family ordering artifact*
  across MPNs; emit only the band/grade the part's own MPN names. Folding sibling grades in is the
  grade-mixing defect (caught in a crystal ESR array and an LED wavelength range).
- **A per-degree *slope* (`ppm/degC`, `V/degC`) is a delta:** per-K equals per-°C, same number.
- **Deliberate non-adds are a feature.** Keep dBm/dBc/dBFS/LSB/lux/W-m²/Jones out of the enum and
  in verbatim; document the boundary so the next person doesn't "fix" it.
- **Alias depth wins extractions.** Missing the primary vendor symbol (`Popt`, `θ⊥`, `Sλ`) means the
  extractor gets no hit. Sweep the Greek/glyph forms every time.
