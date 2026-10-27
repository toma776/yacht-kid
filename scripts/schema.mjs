// Scrie db/schema.sql din registru, ca schema să se poată citi și compara în git. Sursa rămâne registrul.
import {writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {schemaSql} from '../src/core/schema.mjs';
import {checkRegistry} from '../src/registry/derive.mjs';

const errors = checkRegistry();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const dir = fileURLToPath(new URL('../db/', import.meta.url));
await mkdir(dir, {recursive: true});
await writeFile(`${dir}schema.sql`, schemaSql());
console.log('db/schema.sql scris');
