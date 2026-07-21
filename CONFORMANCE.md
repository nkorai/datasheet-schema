# Conformance

What a consumer must check to validate a datasheet-schema document. There are two
layers. Layer 1 is portable JSON Schema and needs no code of ours. Layer 2 is a small
set of **family checks that JSON Schema cannot express** — you implement them, but they
are driven entirely by the language-agnostic dictionary JSON, so they are ~20 lines in
any language. The reference implementation is [`scripts/validate.mjs`](scripts/validate.mjs)
(Layers 1–2) and [`scripts/regression.mjs`](scripts/regression.mjs) (Layer 2 axis check
+ dictionary integrity); where this prose and that code disagree, the code governs.

A document is **schema-conforming** if it passes Layer 1, and **fully conforming** if it
also passes Layer 2 against the dictionary named by its `component.family`.

## Layer 1 — JSON Schema (portable, no custom code)

Validate the document against [`schema/datasheet-1.0.schema.json`](schema/datasheet-1.0.schema.json)
with any JSON Schema 2020-12 validator (ajv, python-jsonschema, gojsonschema, …). This
enforces the whole structure: required fields, the closed `unit` enum, `limitClass`, the
`^[a-z][a-z0-9_]*$` key and `^[A-Z][A-Z0-9_]*$` function patterns, that a `value` has at
least one of min/typ/nom/max, that a `characterized` measurement carries `sourcePage`, that
a numeric condition carries a `unit`, and the enums for `polarity`/`statistic`/`guarantee`/
`review`. **The non-negotiable invariant — every value can carry `conditions` and traces to
`provenance` — is structural and lives here.** No family knowledge is involved.

## Layer 2 — Family checks (you implement; JSON Schema cannot)

The core schema is family-agnostic: it does not know `output_voltage` is volts or that
`temperature_coefficient` is a temperature key. Only the family dictionary
(`dictionary/<family>-1.0.json`, selected by `component.family`) knows that. So a consumer
that wants full conformance implements these three checks against that dictionary. Each is
data-driven — you read the dictionary JSON, you do not hard-code any part.

### C1 — Key membership (MUST)
Every `parameters[].key` MUST be a `key` defined in the family dictionary.
```
family = doc.component.family
dict   = load("dictionary/" + family + "-1.0.json")
keys   = set(p.key for p in dict.parameters)
for p in doc.parameters:
    assert p.key in keys        # else: unknown key for this family
```

### C2 — Unit scoping (MUST — this is what stops "temperature in volts")
Every `measurement.unit` MUST be the dictionary parameter's canonical `unit`, or one of its
optional `altUnits`. This is the dimension guard: `output_voltage` permits only `V`;
`operating_temperature_range` only `degC`; multi-unit parameters (line/load regulation,
drift, hysteresis, accuracy) list their alternates in `altUnits`.
```
allowed = {}                          # key -> permitted units
for p in dict.parameters:
    allowed[p.key] = {p.unit} | set(p.altUnits or [])
for p in doc.parameters:
    for m in p.measurements:
        assert m.unit in allowed[p.key]   # else: off-dimension unit
```

### C3 — Condition-axis dimension (SHOULD)
A numeric condition on a well-known axis SHOULD carry that axis's dimension. Note-only axes
(no numeric value) carry no unit and are skipped. Unknown/family-specific axes are not
constrained (the axis vocabulary is open).
```
def expected(param):
    if param in ("F","BW_LOW","BW_HIGH"): return "Hz"
    if param == "ESR": return "ohm"
    if param in ("HEADROOM","RIPPLE"): return "V"
    if param.startswith("T_"): return "degC"
    if param.startswith("V_"): return "V"
    if param.startswith("I_"): return "A"
    if param.startswith("C_") and param != "C_OUT_TYPE": return "F"
    return None                       # unconstrained
for c in every condition with a numeric value/min/max and a unit:
    e = expected(c.param)
    if e is not None: assert c.unit == e
```

The negative fixtures under [`test/conformance/dictionary-invalid/`](test/conformance/dictionary-invalid)
pin C1/C2: they are schema-VALID documents (Layer 1 passes) that a conforming consumer MUST
reject at Layer 2 (a temperature in volts, an output voltage in degC).

## Producing conforming documents

An extraction pipeline is conforming if every document it emits passes Layers 1 and 2.
Beyond that, follow the conventions that are not machine-enforced: normalize to base-SI
units (a rate printed in ppm/mA becomes `ppm/A`), keep the printed form in
`conditionsVerbatim`, emit one measurement per condition point, one document per orderable
grade, and set `component.polarity: "negative"` for a negative-rail part so sign is declared
rather than inferred.

## For dictionary authors (adding or editing a family)

If you add or edit a `dictionary/<family>-*.json`, it must additionally pass the integrity
checks in `regression.mjs`, which JSON Schema also cannot express: no duplicate `key`s; no
alias collision (an alias equal to a key, or one alias claimed by two keys); every `unit`
and every `altUnits` entry in the schema's closed unit enum; and every `array: true`
parameter declaring a `conditionAxis`. These protect the vocabulary itself; they are not run
against consumer documents.

## Test fixtures as the definition of "wrong"

- [`test/conformance/valid/`](test/conformance/valid) — documents a validator MUST accept.
- [`test/conformance/invalid/`](test/conformance/invalid) — documents a validator MUST
  reject at Layer 1 (schema).
- [`test/conformance/dictionary-invalid/`](test/conformance/dictionary-invalid) — documents
  that pass Layer 1 but a conforming consumer MUST reject at Layer 2 (C1/C2).
