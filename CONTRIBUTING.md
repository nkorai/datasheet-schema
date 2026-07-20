# Contributing

Thanks for helping build an open standard for design-grade component specs.

- **Add a parameter to a family dictionary**: edit `dictionary/<family>-x.y.json`,
  give it a canonical snake_case `key`, a base-SI `unit`, a `group`, and vendor
  `aliases`. Justify it with real datasheets in the PR.
- **Add a component family**: create `dictionary/<family>-1.0.json` conforming to
  `dictionary/family-dictionary-1.0.schema.json`. The core schema does not change.
- **Change the data contract**: see `GOVERNANCE.md`. You must add conformance
  fixtures (a positive that must pass and a negative that must fail) and keep
  `npm test` green.

Run `npm run build` (generate types + conformance) before opening a PR.
