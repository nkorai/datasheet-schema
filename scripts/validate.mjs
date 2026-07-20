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

const ldoKeys = new Set(read('dictionary/ldo-1.0.json').parameters.map((p) => p.key));

console.log('\nexamples (must pass, keys must be in dictionary):');
for (const f of glob('examples')) {
    const doc = read(`examples/${f}`);
    const ok = validate(doc);
    if (!ok) { fail(`${f}. ${ajv.errorsText(validate.errors)}`); continue; }
    const unknown = (doc.parameters ?? []).map((p) => p.key).filter((k) => !ldoKeys.has(k));
    unknown.length ? fail(`${f}. parameter keys not in dictionary: ${unknown.join(', ')}`) : pass(f);
}

console.log('\nconformance/valid (must pass):');
for (const f of glob('test/conformance/valid')) {
    const ok = validate(read(`test/conformance/valid/${f}`));
    ok ? pass(f) : fail(`${f}. ${ajv.errorsText(validate.errors)}`);
}

console.log('\nconformance/invalid (must FAIL):');
for (const f of glob('test/conformance/invalid')) {
    const ok = validate(read(`test/conformance/invalid/${f}`));
    ok ? fail(`${f}. validated but should have been rejected`) : pass(`${f} (correctly rejected)`);
}

console.log(failures === 0 ? '\n\x1b[32mAll conformance checks passed.\x1b[0m\n' : `\n\x1b[31m${failures} failure(s).\x1b[0m\n`);
process.exit(failures === 0 ? 0 : 1);
