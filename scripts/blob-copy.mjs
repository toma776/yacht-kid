// npm run blob:copy — copiază imaginile site-ului din repo (public/m) în Blob-ul vostru.
//
// Citește din .env.local (îl aduce `npx vercel env pull .env.local`):
//   BLOB_READ_WRITE_TOKEN  depozitul vostru, nou (Storage → Create → Blob, legat de proiect, cu Development bifat)
//
// Se poate rula de oricâte ori: fișierele deja copiate (aceeași cale, aceeași mărime) sunt sărite. La final confirmă
// fiecare fișier; după aceea ștergeți MEDIA_IN_REPO din proiect și faceți Redeploy (TRANSFER.md).
import fs from 'node:fs';
import path from 'node:path';
import {put, list} from '@vercel/blob';
import {storeId, AGENCY_BLOB_STORE} from '../src/site/media-source.mjs';

const ENV_FILE = '.env.local';
const DIR = path.join(process.cwd(), 'public', 'm');
const PARALLEL = 6;
const TYPES = {webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg'};

if (fs.existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
const token = (process.env.BLOB_READ_WRITE_TOKEN ?? '').trim();
const stop = message => { console.error(`\n✗ ${message}\n`); process.exit(1); };
if (!token) stop('Lipsește BLOB_READ_WRITE_TOKEN în .env.local. Creați Blob-ul vostru (Storage → Create → Blob, legat de proiect, cu Development bifat), apoi: npx vercel env pull .env.local');
if (storeId(token) === AGENCY_BLOB_STORE) stop('BLOB_READ_WRITE_TOKEN este încă tokenul depozitului agenției. Ștergeți-l din proiect (Settings → Environment Variables), creați Blob-ul vostru, apoi: npx vercel env pull .env.local');
if (!fs.existsSync(DIR)) stop('Nu există public/m: rulați comanda din folderul proiectului.');

const files = fs.readdirSync(DIR).filter(f => !f.startsWith('.'));
const have = new Map();
let cursor;
do {
  const page = await list({prefix: 'm/', cursor, limit: 1000, token});
  for (const b of page.blobs) have.set(b.pathname, b.size);
  cursor = page.cursor;
} while (cursor);

const todo = files.filter(f => have.get(`m/${f}`) !== fs.statSync(path.join(DIR, f)).size);
console.log(`${files.length} fișiere în public/m; ${files.length - todo.length} deja în Blob, ${todo.length} de copiat.`);
let done = 0, failed = 0;
for (let i = 0; i < todo.length; i += PARALLEL) {
  await Promise.all(todo.slice(i, i + PARALLEL).map(async f => {
    try {
      // O singură operație pe fișier (fără multipart): costă mai puțin din limita lunară a Blob-ului
      await put(`m/${f}`, fs.readFileSync(path.join(DIR, f)), {access: 'public', addRandomSuffix: false, allowOverwrite: true,
        contentType: TYPES[f.split('.').pop().toLowerCase()], cacheControlMaxAge: 31536000, multipart: false, token});
      done++;
    } catch (e) {
      failed++;
      console.error(`  ✗ ${f}: ${e.message}`);
    }
  }));
  process.stdout.write(`\r  ${done} / ${todo.length}`);
}

// Confirmarea: fiecare fișier din public/m există în Blob, cu aceeași mărime
const check = new Map();
cursor = undefined;
do {
  const page = await list({prefix: 'm/', cursor, limit: 1000, token});
  for (const b of page.blobs) check.set(b.pathname, b.size);
  cursor = page.cursor;
} while (cursor);
const missing = files.filter(f => check.get(`m/${f}`) !== fs.statSync(path.join(DIR, f)).size);
console.log(`\n${missing.length ? '✗' : '✓'} ${files.length - missing.length} / ${files.length} fișiere confirmate în Blob${failed ? `, ${failed} erori` : ''}.`);
if (missing.length) { console.log(`  Lipsesc: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '…' : ''}. Rulați din nou npm run blob:copy.`); process.exit(1); }
console.log('Acum: în Vercel, Settings → Environment Variables, ștergeți MEDIA_IN_REPO, apoi Redeploy.');
