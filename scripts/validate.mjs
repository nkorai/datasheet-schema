#!/usr/bin/env node
/**
 * Conformance runner. Validates:
 *   - every examples/*.json against the schema (must PASS)
 *   - every test/conformance/valid/*.json  (must PASS)
 *   - every test/conformance/invalid/*.json (must FAIL. the negative fixtures
 *     that define what wrong means. A schema you cannot fail is not a spec.
 *   - the LDO dictionary against the family-dictionary meta-schema
 *   - dictionary/schema cross-check: every parameter `key` used in the examples
 *     exists in the family dictionary
 *
 * Exit non-zero on any surprise.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const glob = (dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((f) => f.endsWith('.json')) : []);

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const schema = read('schema/datasheet-1.0.schema.json');
const dictMeta = read('dictionary/family-dictionary-1.0.schema.json');
const validate = ajv.compile(schema);
const validateDict = ajv.compile(dictMeta);

let failures = 0;
const pass = (m) => console.log(`  \x1b[32mPASS\x1b[0m ${m}`);
const fail = (m) => { console.log(`  \x1b[31mFAIL ${m}\x1b[0m`); failures += 1; };

console.log('\ndictionary meta-schema:');
for (const f of glob('dictionary')) {
    if (f.startsWith('family-dictionary')) continue;
    const ok = validateDict(read(`dictionary/${f}`));
    ok ? pass(f) : fail(`${f}. ${ajv.errorsText(validateDict.errors)}`);
}

// Per-family dictionary index: the key set, and the units each key permits
// (its canonical unit plus any altUnits), so a measurement can be scoped to the
// right dimension. output_voltage is volts; a temperature key is degC; an
// off-dimension unit (temperature in volts) is rejected.
const dictByFamily = new Map();
for (const f of glob('dictionary')) {
    if (f.startsWith('family-dictionary')) continue;
    const dict = read(`dictionary/${f}`);
    const units = new Map();
    for (const p of dict.parameters) units.set(p.key, new Set([p.unit, ...(p.altUnits ?? [])]));
    dictByFamily.set(dict.family, { keys: new Set(dict.parameters.map((p) => p.key)), units });
}

// Dictionary conformance for one document: unknown keys and off-dimension units.
// Returns a list of human-readable problems (empty = clean).
const dictionaryProblems = (doc) => {
    const family = doc.component?.family;
    const dict = dictByFamily.get(family);
    if (!dict) return [`no dictionary for family "${family}"`];
    const problems = [];
    for (const p of doc.parameters ?? []) {
        if (!dict.keys.has(p.key)) { problems.push(`key "${p.key}" not in the ${family} dictionary`); continue; }
        const allowed = dict.units.get(p.key);
        for (const m of p.measurements ?? []) {
            if (m.unit && !allowed.has(m.unit)) {
                problems.push(`"${p.key}" uses unit "${m.unit}", not permitted (allowed: ${[...allowed].join(', ')})`);
            }
        }
    }
    return problems;
};

console.log('\nexamples (must pass; keys and units must match the family dictionary):');
for (const f of glob('examples')) {
    const doc = read(`examples/${f}`);
    const ok = validate(doc);
    if (!ok) { fail(`${f}. ${ajv.errorsText(validate.errors)}`); continue; }
    const problems = dictionaryProblems(doc);
    problems.length ? fail(`${f}. ${problems.join('; ')}`) : pass(f);
}

console.log('\nconformance/valid (must pass):');
for (const f of glob('test/conformance/valid')) {
    const ok = validate(read(`test/conformance/valid/${f}`));
    ok ? pass(f) : fail(`${f}. ${ajv.errorsText(validate.errors)}`);
}

console.log('\nconformance/invalid (must FAIL schema validation):');
for (const f of glob('test/conformance/invalid')) {
    const ok = validate(read(`test/conformance/invalid/${f}`));
    ok ? fail(`${f}. validated but should have been rejected`) : pass(`${f} (correctly rejected)`);
}

// These are schema-valid documents that violate a dictionary rule (unknown key
// or off-dimension unit). They MUST be caught by the dictionary check, not the
// core schema — that is the point of the family-scoped unit enforcement.
console.log('\nconformance/dictionary-invalid (schema-valid, must FAIL the dictionary check):');
for (const f of glob('test/conformance/dictionary-invalid')) {
    const doc = read(`test/conformance/dictionary-invalid/${f}`);
    if (!validate(doc)) { fail(`${f}. expected schema-valid, but the schema itself rejected it (move to conformance/invalid)`); continue; }
    const problems = dictionaryProblems(doc);
    problems.length ? pass(`${f} (correctly rejected: ${problems[0]})`) : fail(`${f}. passed the dictionary check but should have been rejected`);
}

console.log(failures === 0 ? '\n\x1b[32mAll conformance checks passed.\x1b[0m\n' : `\n\x1b[31m${failures} failure(s).\x1b[0m\n`);
process.exit(failures === 0 ? 0 : 1);
