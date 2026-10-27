// Fișierele media din snapshot → Vercel Blob, ca site-ul de pe Vercel să le servească (pe Vercel nu există discul local).
// Cheia în Blob e `media/<filename>`, aceeași cu a fișierului din snapshot: ruta /media/<id>/ redirecționează acolo.
// Videoclipurile originale nu urcă: site-ul folosește variantele comprimate din public/video.
// La fel public/brand/ (brandbook-ul clientului, ținut în afara repo-ului public) → `brand/<cale>`: pe Vercel,
// /brand/* se citește din Blob (rescrierea de rezervă din next.config.mjs).
// Rulare: node --env-file=.env.blob.local scripts/media-to-blob.mjs   (se poate relua: sare peste ce există deja)
import {readFile, readdir} from 'node:fs/promises';
import {join, extname} from 'node:path';
import {put, list} from '@vercel/blob';
import {openDb, all} from '../src/core/db.mjs';

if (!process.env.BLOB_READ_WRITE_TOKEN) { console.error('BLOB_READ_WRITE_TOKEN lipsește (vezi .env.blob.local).'); process.exit(1); }

const SNAPSHOT = join(process.cwd(), 'reference', 'snapshot', 'media');
const db = openDb({url: `file:${join(process.cwd(), 'data', 'brain.db')}`});
const MIME = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf'};
const BRAND = join(process.cwd(), 'public', 'brand');
const files = [
  ...(await all(db, `SELECT filename, mime FROM media WHERE mime NOT LIKE 'video/%' ORDER BY id`))
    .map(m => ({src: join(SNAPSHOT, m.filename), key: `media/${m.filename}`, mime: m.mime})),
  ...(await readdir(BRAND, {recursive: true, withFileTypes: true})).filter(d => d.isFile() && MIME[extname(d.name).toLowerCase()])
    .map(d => { const rel = join(d.parentPath, d.name).slice(BRAND.length + 1).replaceAll('\\', '/'); return {src: join(BRAND, rel), key: `brand/${rel}`, mime: MIME[extname(d.name).toLowerCase()]}; })
];

const existing = new Set();
for (let cursor; ;) {
  const page = await list({cursor, limit: 1000});
  page.blobs.forEach(b => existing.add(b.pathname));
  if (!page.hasMore) break;
  cursor = page.cursor;
}

const todo = files.filter(f => !existing.has(f.key));
console.log(`${files.length} fișiere, ${files.length - todo.length} deja în Blob, ${todo.length} de urcat`);
let done = 0, failed = 0, base = null;
const worker = async () => {
  for (let f; (f = todo.shift());) {
    try {
      const r = await put(f.key, await readFile(f.src), {access: 'public', contentType: f.mime, addRandomSuffix: false, cacheControlMaxAge: 31536000});
      base ??= r.url.slice(0, r.url.indexOf(`/${f.key.split('/')[0]}/`));
      if (++done % 50 === 0) console.log(`  ${done} urcate`);
    } catch (e) { failed++; console.error(`  ${f.key}: ${e.message}`); }
  }
};
await Promise.all(Array.from({length: 6}, worker));
console.log(`Gata: ${done} urcate, ${failed} eșuate.${base ? ` Adresa de bază: ${base}` : ''}`);
db.close();
