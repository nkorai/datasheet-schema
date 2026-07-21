#!/usr/bin/env node
/**
 * Generates the TypeScript binding: static types from the JSON Schema plus an
 * index that re-exports the schema object and every family dictionary. The
 * binding is intentionally dumb — types and data only, no runtime logic. Any
 * executable behavior (validation, extraction) belongs in a separate library,
 * not here. The schema stays the single source of truth.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from 'json-schema-to-typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'bindings/typescript');
mkdirSync(outDir, { recursive: true });

const schema = JSON.parse(readFileSync(join(root, 'schema/datasheet-1.0.schema.json'), 'utf8'));

const dts = await compile(schema, 'Datasheet', {
    additionalProperties: false,
    bannerComment: '/* AUTO-GENERATED from schema/datasheet-1.0.schema.json. do not edit. */',
    style: { singleQuote: true },
});
writeFileSync(join(outDir, 'datasheet.d.ts'), dts);
writeFileSync(join(outDir, 'datasheet.js'), 'export {};\n');

// Discover every family dictionary and give each a camelCase export name
// (ldo -> ldoDictionary, voltage_reference -> voltageReferenceDictionary).
const dictFiles = readdirSync(join(root, 'dictionary'))
    .filter((f) => f.endsWith('.json') && !f.startsWith('family-dictionary'))
    .sort();
const camel = (family) => family.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const dicts = dictFiles.map((f) => {
    const family = JSON.parse(readFileSync(join(root, 'dictionary', f), 'utf8')).family;
    return { family, file: f, exportName: `${camel(family)}Dictionary` };
});

const jsLines = [
    '/* AUTO-GENERATED. Re-exports the JSON Schema and family dictionaries as objects. Data only, no logic. */',
    "import datasheetSchema from '../../schema/datasheet-1.0.schema.json' with { type: 'json' };",
    ...dicts.map((d) => `import ${d.exportName} from '../../dictionary/${d.file}' with { type: 'json' };`),
    `export { datasheetSchema, ${dicts.map((d) => d.exportName).join(', ')} };`,
    `export const dictionaries = { ${dicts.map((d) => `'${d.family}': ${d.exportName}`).join(', ')} };`,
    "export const SCHEMA_VERSION = '1.0';",
    '',
].join('\n');
writeFileSync(join(outDir, 'index.js'), jsLines);

const dtsLines = [
    '/* AUTO-GENERATED. */',
    "export * from './datasheet.js';",
    'export declare const datasheetSchema: Record<string, unknown>;',
    ...dicts.map((d) => `export declare const ${d.exportName}: Record<string, unknown>;`),
    'export declare const dictionaries: Record<string, Record<string, unknown>>;',
    "export declare const SCHEMA_VERSION: '1.0';",
    '',
].join('\n');
writeFileSync(join(outDir, 'index.d.ts'), dtsLines);

console.log(`PASS generated bindings/typescript (types + schema + ${dicts.length} dictionaries: ${dicts.map((d) => d.family).join(', ')})`);
