# Changelog

All notable changes to this project follow [Keep a Changelog](https://keepachangelog.com)
and [Semantic Versioning](https://semver.org).

## [1.0.0] — unreleased

### Added
- Initial `datasheet-1.0` schema (JSON Schema 2020-12, self-contained).
- The `Measurement` atom: value (`min`/`typ`/`nom`/`max`) + unit + typed
  `conditions[]` + `provenance` — the conditioned-value + provenance model
  no existing standard captures.
- `limitClass` enum (`absolute_max` | `recommended` | `characterized`) unifying
  the three datasheet tables.
- Pluggable family dictionaries; `ldo-1.0` dictionary (50 parameters) validated
  against a 39-datasheet / 20-manufacturer / 916-page corpus.
- Conformance suite (positive + negative fixtures), TypeScript bindings,
  npm packaging with raw JSON Schema exports.
