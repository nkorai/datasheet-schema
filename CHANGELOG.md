# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com) and [Semantic Versioning](https://semver.org).

## [1.0.0] unreleased

### Added
- Initial `datasheet-1.0` schema, JSON Schema 2020-12, self-contained.
- The Measurement object: a value with min, typ, nom, and max, plus unit, typed conditions, and provenance. This is the conditioned-value and provenance model that existing standards omit.
- The `limitClass` enum with values absolute_max, recommended, and characterized, unifying the separate datasheet tables.
- Pluggable family dictionaries, and the `ldo-1.0` dictionary of 51 parameters, validated against a corpus of 39 datasheets from 20 manufacturers totaling 916 pages.
- Conformance suite with positive and negative fixtures, TypeScript bindings, and npm packaging with raw JSON Schema exports.
