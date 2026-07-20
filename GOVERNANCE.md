# Governance

## Versioning

Two independent axes, kept distinct:

| Axis | Versions | Scheme | Lives in |
|---|---|---|---|
| **Schema** | the data contract | `MAJOR.MINOR` | the schema filename + `$id` (`datasheet-1.0`) |
| **Package** | the npm release | full semver | `package.json` |

Many `1.0.x` package releases may ship the same `datasheet-1.0` schema.

## Compatibility policy

- **MINOR** (`1.0` → `1.1`): additive only — new optional fields, new enum
  values, new dictionary parameters. Backward compatible; existing valid
  documents stay valid.
- **MAJOR** (`1.x` → `2.0`): removals, renames, or newly-required fields. Ships
  a new `$id`; **every previously published schema URL stays hosted forever** so
  existing `$ref`s never break.
- **The invariant**: every value always carries `conditions` and traces to
  `provenance`. That never becomes optional — it is the schema's identity.

## Changes

Changes are proposed as GitHub issues/PRs. A change to the data contract must:
1. update the schema + a normative note in `spec/`,
2. add or update conformance fixtures (positive and negative),
3. pass `npm test` (the conformance suite) in CI,
4. be recorded in `CHANGELOG.md`.

New component families are added as new dictionary files under `dictionary/`
without changing the core schema.
