# Governance

## Versioning

Two independent axes are kept distinct.

| Axis | Versions | Scheme | Location |
|---|---|---|---|
| Schema | The data contract. | MAJOR.MINOR | The schema filename and `$id`, for example `datasheet-1.0`. |
| Package | The npm release. | Full semantic version | `package.json`. |

Several `1.0.x` package releases may ship the same `datasheet-1.0` schema.

## Compatibility policy

A MINOR change, for example `1.0` to `1.1`, is additive only. It may add optional fields, new enum values, or new dictionary parameters. Existing valid documents remain valid.

A MAJOR change, for example `1.x` to `2.0`, may remove, rename, or newly require fields. It ships a new `$id`. Every previously published schema URL remains hosted so existing references do not break.

One requirement does not change across versions. Every value carries `conditions` and traces to `provenance`. This is the schema's defining property.

## Changes

Changes are proposed as GitHub issues or pull requests. A change to the data contract must do the following.

1. Update the schema and a normative note in `spec/`.
2. Add or update conformance fixtures, both a positive fixture that must pass and a negative fixture that must fail.
3. Pass `npm test`, the conformance suite, in CI.
4. Record the change in `CHANGELOG.md`.

New component families are added as new dictionary files under `dictionary/` without changing the core schema.
