// Transferul la client, rulat O DATĂ de client, după ce a primit repo-ul GitHub și proiectul Vercel (vezi TRANSFER.md):
//   1. baza: copia completă din baza Neon a agenției (SOURCE_DATABASE_URL, primită privat) în baza Neon a clientului
//      (DATABASE_URL, pusă de integrarea Neon pe proiectul lui);
//   2. imaginile: public/m/* → Vercel Blob-ul clientului (BLOB_READ_WRITE_TOKEN, pus de Blob-ul conectat la proiect),
//      la aceleași nume (m/<id>.webp); la final scrie adresa publică a Blob-ului, care devine MEDIA_BLOB_URL pe Vercel.
// Se poate relua: imaginile deja urcate sunt sărite, iar baza e rescrisă integral.
//   node --env-file=.env.transfer.local scripts/transfer-client.mjs            (ambele)
//   node --env-file=.env.transfer.local scripts/transfer-client.mjs --media    (doar imaginile)
//   node --env-file=.env.transfer.local scripts/transfer-client.mjs --db       (doar baza)
import {spawnSync} from 'node:child_process';
import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {put, list} from '@vercel/blob';

const only = ['--media', '--db'].find(f => process.argv.includes(f));
const doDb = !only || only === '--db', doMedia = !only || only === '--media';
const missing = [doDb && !process.env.DATABASE_URL && 'DATABASE_URL', doDb && !process.env.SOURCE_DATABASE_URL && 'SOURCE_DATABASE_URL',
  doMedia && !process.env.BLOB_READ_WRITE_TOKEN && 'BLOB_READ_WRITE_TOKEN'].filter(Boolean);
if (missing.length) { console.error(`  ✗ Lipsesc din .env.transfer.local: ${missing.join(', ')} (vezi TRANSFER.md).`); process.exit(1); }
if (doDb && process.env.SOURCE_DATABASE_URL === process.env.DATABASE_URL) { console.error('  ✗ SOURCE_DATABASE_URL și DATABASE_URL sunt aceeași bază.'); process.exit(1); }

if (doDb) {
  console.log('1. Baza: copia din baza agenției în baza ta Neon…');
  const r = spawnSync(process.execPath, ['scripts/pg-copy.mjs', '--from', 'source', '--to', 'neon'], {stdio: 'inherit', env: process.env});
  if (r.status !== 0) { console.error('  ✗ Copierea bazei a eșuat; nimic nu s-a schimbat în baza ta.'); process.exit(1); }
}

if (doMedia) {
  console.log('2. Imaginile: public/m → Vercel Blob…');
  const dir = join(process.cwd(), 'public', 'm');
  const files = (await readdir(dir)).filter(f => !f.startsWith('.'));
  const have = new Set();
  let cursor;
  do { const page = await list({prefix: 'm/', cursor, limit: 1000}); page.blobs.forEach(b => have.add(b.pathname)); cursor = page.cursor; } while (cursor);
  const TYPES = {webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg'};
  let base = null, sent = 0;
  const todo = files.filter(f => !have.has(`m/${f}`));
  // Câte 8 în paralel: destul de repede, fără să lovească limitele de rată ale Blob-ului
  for (let i = 0; i < todo.length; i += 8) {
    await Promise.all(todo.slice(i, i + 8).map(async f => {
      const b = await put(`m/${f}`, await readFile(join(dir, f)), {access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: TYPES[f.split('.').pop().toLowerCase()], cacheControlMaxAge: 31536000});
      base ??= new URL(b.url).origin;
      sent++;
    }));
    process.stdout.write(`\r   ${sent + have.size} / ${files.length}`);
  }
  if (!base) { const first = (await list({prefix: 'm/', limit: 1})).blobs[0]; base = first && new URL(first.url).origin; }
  console.log(`\n  ✓ ${sent} imagini urcate, ${have.size} existau deja.`);
  console.log(`\n   MEDIA_BLOB_URL=${base}`);
  console.log('   Pune această valoare în variabilele proiectului Vercel (Production și Preview), apoi fă redeploy.');
}
console.log('\nGata. Pașii următori sunt în TRANSFER.md.');
