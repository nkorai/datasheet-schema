#!/usr/bin/env node
/**
 * Generates TypeScript types from the JSON Schema — schema stays the single
 * source of truth. Also emits an index that re-exports the schema object so
 * consumers get BOTH the typed object and the static type from one import.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from 'json-schema-to-typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'bindings/typescript');
mkdirSync(outDir, { recursive: true });

const schema = JSON.parse(readFileSync(join(root, 'schema/datasheet-1.0.schema.json'), 'utf8'));

const dts = await compile(schema, 'Datasheet', {
    additionalProperties: false,
    bannerComment: '/* AUTO-GENERATED from schema/datasheet-1.0.schema.json — do not edit. */',
    style: { singleQuote: true },
});

writeFileSync(join(outDir, 'datasheet.d.ts'), dts);

writeFileSync(
    join(outDir, 'index.js'),
    `/* AUTO-GENERATED. Re-exports the JSON Schema as a JS object. */
import datasheetSchema from '../../schema/datasheet-1.0.schema.json' with { type: 'json' };
import ldoDictionary from '../../dictionary/ldo-1.0.json' with { type: 'json' };
export { datasheetSchema, ldoDictionary };
export const SCHEMA_VERSION = '1.0';
`,
);

writeFileSync(
    join(outDir, 'index.d.ts'),
    `/* AUTO-GENERATED. */
export * from './datasheet.js';
export declare const datasheetSchema: Record<string, unknown>;
export declare const ldoDictionary: Record<string, unknown>;
export declare const SCHEMA_VERSION: '1.0';
`,
);

// json-schema-to-typescript emits .d.ts; provide a .js re-export target for the type module.
writeFileSync(join(outDir, 'datasheet.js'), 'export {};\n');

console.log('✓ generated bindings/typescript/{datasheet.d.ts,index.js,index.d.ts}');
