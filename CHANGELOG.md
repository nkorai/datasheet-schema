# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com) and [Semantic Versioning](https://semver.org).

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
