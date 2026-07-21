#!/usr/bin/env node
/**
 * Regression runner. Hermetic: reads only committed files, never the network,
 * never a PDF, never a model. Two jobs:
 *
 *   1. Dictionary integrity — invariants the JSON Schema meta-schema cannot
 *      express: no duplicate keys, no alias collisions, every unit in the
 *      schema's closed enum, every array param declares a conditionAxis.
 *
 *   2. Value snapshots — a canonical projection of each example's extracted
 *      values (identity, pin functions, and every measurement's limitClass,
 *      value, unit, conditions, stimulus, and source page) is compared against
 *      a committed snapshot in test/regression/snapshots/. A silently changed
 *      number, unit, condition, or page fails the build. This is the offline
 *      guarantee that a schema change or an edit never quietly alters a past
 *      extraction.
 *
 * Run with --update (or UPDATE_SNAPSHOTS=1) to (re)write snapshots when an
 * example is intentionally changed or added. Commit the snapshots in the same
 * change: the update is the deliberate acknowledgement that the data moved.
 *
 * Exit non-zero on any surprise.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const glob = (dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((f) => f.endsWith('.json')) : []);

const UPDATE = process.argv.includes('--update') || process.env.UPDATE_SNAPSHOTS === '1';
const SNAP_DIR = 'test/regression/snapshots';

let failures = 0;
const pass = (m) => console.log(`  \x1b[32mPASS\x1b[0m ${m}`);
const fail = (m) => { console.log(`  \x1b[31mFAIL ${m}\x1b[0m`); failures += 1; };

// Deterministic serialization: sort object keys recursively so a snapshot is
// stable regardless of authoring order. Arrays keep their order (it is meaning).
const sortKeys = (v) => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') {
        return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
    }
    return v;
};
const canonical = (v) => JSON.stringify(sortKeys(v), null, 2) + '\n';

// ---------------------------------------------------------------------------
// 1. Dictionary integrity
// ---------------------------------------------------------------------------
const schema = read('schema/datasheet-1.0.schema.json');
const unitEnum = (() => {
    let found = null;
    const walk = (o) => {
        if (!o || typeof o !== 'object') return;
        if (o.unit && Array.isArray(o.unit.enum) && o.unit.enum.includes('V')) found = new Set(o.unit.enum);
        for (const k of Object.keys(o)) walk(o[k]);
    };
    walk(schema);
    return found;
})();

console.log('\ndictionary integrity:');
if (!unitEnum) fail('could not locate the unit enum in the schema');
for (const f of glob('dictionary')) {
    if (f.startsWith('family-dictionary')) continue;
    const dict = read(`dictionary/${f}`);
    const params = dict.parameters ?? [];
    const problems = [];

    const keys = params.map((p) => p.key);
    const dupKeys = keys.filter((k, i) => keys.indexOf(k) !== i);
    if (dupKeys.length) problems.push(`duplicate keys: ${[...new Set(dupKeys)].join(', ')}`);

    const keySet = new Set(keys);
    const aliasOwner = new Map(); // normalized alias -> key
    for (const p of params) {
        for (const raw of p.aliases ?? []) {
            const a = raw.toLowerCase().trim();
            if (keySet.has(a) && a !== p.key) problems.push(`alias "${raw}" on "${p.key}" collides with an existing key`);
            if (aliasOwner.has(a) && aliasOwner.get(a) !== p.key) {
                problems.push(`alias "${raw}" claimed by both "${aliasOwner.get(a)}" and "${p.key}"`);
            }
            aliasOwner.set(a, p.key);
        }
    }

    for (const p of params) {
        if (unitEnum && !unitEnum.has(p.unit)) problems.push(`"${p.key}" unit "${p.unit}" is not in the schema unit enum`);
        for (const u of p.altUnits ?? []) {
            if (unitEnum && !unitEnum.has(u)) problems.push(`"${p.key}" altUnit "${u}" is not in the schema unit enum`);
            if (u === p.unit) problems.push(`"${p.key}" altUnit "${u}" duplicates its canonical unit`);
        }
        if (p.array && !p.conditionAxis) problems.push(`"${p.key}" is array:true but declares no conditionAxis`);
    }

    problems.length ? fail(`${f}\n      - ${problems.join('\n      - ')}`) : pass(`${f} (${params.length} params, ${aliasOwner.size} aliases)`);
}

// ---------------------------------------------------------------------------
// 1b. Condition-axis dimension check: a numeric condition on a well-known axis
// must carry the right dimension of unit (T_* is degC, V_* is V, I_* is A, a
// frequency axis is Hz, a capacitance axis is F). Unknown/family-specific axes
// are skipped (the vocab is open). This is the same "temperature is not volts"
// guard the dictionary applies to values, extended to conditions.
const expectedAxisUnit = (param) => {
    if (param === 'F' || param === 'BW_LOW' || param === 'BW_HIGH') return 'Hz';
    if (param === 'ESR') return 'ohm';
    if (param === 'HEADROOM' || param === 'RIPPLE') return 'V';
    if (param.startsWith('T_')) return 'degC';
    if (param.startsWith('V_')) return 'V';
    if (param.startsWith('I_')) return 'A';
    if (param.startsWith('C_') && param !== 'C_OUT_TYPE') return 'F';
    if (param.startsWith('F_')) return 'Hz';
    return null; // unknown axis: not enforced
};

console.log('\ncondition-axis dimensions (examples):');
for (const f of glob('examples')) {
    const doc = read(`examples/${f}`);
    const problems = [];
    for (const p of doc.parameters ?? []) {
        for (const m of p.measurements ?? []) {
            for (const c of m.conditions ?? []) {
                const numeric = c.value !== undefined || c.min !== undefined || c.max !== undefined;
                if (!numeric || !c.unit) continue; // note-only axes carry no unit
                const exp = expectedAxisUnit(c.param);
                if (exp && c.unit !== exp) problems.push(`${p.key}: condition ${c.param} has unit "${c.unit}", expected "${exp}"`);
            }
        }
    }
    problems.length ? fail(`${f}\n      - ${problems.join('\n      - ')}`) : pass(f);
}

// ---------------------------------------------------------------------------
// 2. Example value snapshots
// ---------------------------------------------------------------------------

// Project only the extracted-spec fields. Cosmetic edits (description, notes,
// human-readable name) are deliberately excluded so doc-string tweaks do not
// trip regression; a changed value, unit, condition, class, or page does.
// guarantee is an extracted datasheet fact, so it belongs in the snapshot; review
// and confidence describe the extraction (advisory) and are intentionally excluded
// so review-workflow state changes do not churn the value snapshot.
const projectMeasurement = (m) => ({
    limitClass: m.limitClass ?? null,
    value: m.value ?? null,
    unit: m.unit ?? null,
    conditions: (m.conditions ?? []).map((c) => ({
        param: c.param ?? null,
        value: c.value ?? null,
        min: c.min ?? null,
        max: c.max ?? null,
        unit: c.unit ?? null,
        note: c.note ?? null,
    })),
    stimulus: m.stimulus ?? null,
    statistic: m.statistic ?? null,
    guarantee: m.guarantee ?? null,
    sourcePage: m.sourcePage ?? null,
    sourceTable: m.sourceTable ?? null,
});

const projectDoc = (doc) => ({
    mpn: doc.component?.mpn ?? null,
    manufacturer: doc.component?.manufacturer ?? null,
    family: doc.component?.family ?? null,
    pinout: (doc.pinout ?? []).map((p) => ({ number: p.number, name: p.name, function: p.function })),
    parameters: (doc.parameters ?? []).map((p) => ({
        key: p.key,
        group: p.group ?? null,
        aliases: [...(p.aliases ?? [])].sort(),
        measurements: (p.measurements ?? []).map(projectMeasurement),
    })),
});

// Report the first differing JSON path between two projections.
const firstDiff = (a, b, path = '$') => {
    if (a === b) return null;
    const ta = a === null ? 'null' : Array.isArray(a) ? 'array' : typeof a;
    const tb = b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b;
    if (ta !== tb) return `${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`;
    if (ta === 'array') {
        if (a.length !== b.length) return `${path}: array length ${a.length} -> ${b.length}`;
        for (let i = 0; i < a.length; i++) { const d = firstDiff(a[i], b[i], `${path}[${i}]`); if (d) return d; }
        return null;
    }
    if (ta === 'object') {
        const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
        for (const k of keys) { const d = firstDiff(a[k], b[k], `${path}.${k}`); if (d) return d; }
        return null;
    }
    return `${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`;
};

console.log(UPDATE ? '\nexample snapshots (updating):' : '\nexample snapshots (must match committed):');
if (UPDATE && !existsSync(join(root, SNAP_DIR))) mkdirSync(join(root, SNAP_DIR), { recursive: true });

for (const f of glob('examples')) {
    const projection = projectDoc(read(`examples/${f}`));
    const snapPath = `${SNAP_DIR}/${f.replace(/\.json$/, '')}.snapshot.json`;
    const current = canonical(projection);

    if (UPDATE) {
        writeFileSync(join(root, snapPath), current);
        pass(`${f} -> ${snapPath}`);
        continue;
    }
    if (!existsSync(join(root, snapPath))) {
        fail(`${f}: no snapshot at ${snapPath}. Run: npm run regression -- --update`);
        continue;
    }
    const saved = readFileSync(join(root, snapPath), 'utf8');
    if (saved === current) { pass(f); continue; }
    const diff = firstDiff(JSON.parse(saved), projection) ?? '(formatting only)';
    fail(`${f}: extracted values drifted from the snapshot\n      first change: ${diff}\n      if intended: npm run regression -- --update`);
}

if (UPDATE) {
    console.log('\n\x1b[33mSnapshots written. Review the diff and commit them with the change.\x1b[0m\n');
    process.exit(0);
}
console.log(failures === 0 ? '\n\x1b[32mAll regression checks passed.\x1b[0m\n' : `\n\x1b[31m${failures} failure(s).\x1b[0m\n`);
process.exit(failures === 0 ? 0 : 1);
