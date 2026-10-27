// Fișierele media din snapshot → Vercel Blob, ca site-ul de pe Vercel să le servească (pe Vercel nu există discul local).
// Cheia în Blob e `media/<filename>`, aceeași cu a fișierului din snapshot: ruta /media/<id>/ redirecționează acolo.
// Videoclipurile originale nu urcă: site-ul folosește variantele comprimate din public/video.
// Rulare: node --env-file=.env.blob.local scripts/media-to-blob.mjs   (se poate relua: sare peste ce există deja)
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {put, list} from '@vercel/blob';
import {openDb, all} from '../src/core/db.mjs';

if (!process.env.BLOB_READ_WRITE_TOKEN) { console.error('BLOB_READ_WRITE_TOKEN lipsește (vezi .env.blob.local).'); process.exit(1); }

const SNAPSHOT = join(process.cwd(), 'reference', 'snapshot', 'media');
const db = openDb({url: `file:${join(process.cwd(), 'data', 'brain.db')}`});
const media = (await all(db, `SELECT id, filename, mime FROM media WHERE mime NOT LIKE 'video/%' ORDER BY id`));

const existing = new Set();
for (let cursor; ;) {
  const page = await list({prefix: 'media/', cursor, limit: 1000});
  page.blobs.forEach(b => existing.add(b.pathname));
  if (!page.hasMore) break;
  cursor = page.cursor;
}

const todo = media.filter(m => !existing.has(`media/${m.filename}`));
console.log(`${media.length} fișiere, ${existing.size} deja în Blob, ${todo.length} de urcat`);
let done = 0, failed = 0, base = null;
const worker = async () => {
  for (let m; (m = todo.shift());) {
    try {
      const r = await put(`media/${m.filename}`, await readFile(join(SNAPSHOT, m.filename)),
        {access: 'public', contentType: m.mime, addRandomSuffix: false, cacheControlMaxAge: 31536000});
      base ??= r.url.slice(0, r.url.indexOf('/media/'));
      if (++done % 50 === 0) console.log(`  ${done} urcate`);
    } catch (e) { failed++; console.error(`  ${m.id} ${m.filename}: ${e.message}`); }
  }
};
await Promise.all(Array.from({length: 6}, worker));
console.log(`Gata: ${done} urcate, ${failed} eșuate.${base ? ` Adresa de bază: ${base}` : ''}`);
db.close();
