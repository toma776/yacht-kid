// Fișierele media din snapshot → Cloudflare R2, ca site-ul de pe Vercel să le servească (înlocuiește media-to-blob.mjs:
// Vercel Blob are trafic limitat pe planul gratuit, R2 are 10 GB și trafic de descărcare gratuit).
// Cheile sunt aceleași ca în Blob: `media/<filename>` și `brand/<cale>`. Ruta /media/<id>/ redirecționează la
// MEDIA_BASE_URL + cheie, deci pe Vercel se schimbă doar MEDIA_BASE_URL (adresa publică a bucket-ului).
// Rulare: node --env-file=.env.r2.local scripts/media-to-r2.mjs [--dry]   (se poate relua: sare peste ce există deja)
//   .env.r2.local: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL (opțional, doar afișat)
import {readFile, readdir, stat} from 'node:fs/promises';
import {join, extname} from 'node:path';
import {AwsClient} from 'aws4fetch';
import {openDb, all} from '../src/core/db.mjs';

const dry = process.argv.includes('--dry');
const {R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL} = process.env;
if (!dry && !(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET)) {
  console.error('Lipsesc R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY sau R2_BUCKET (vezi .env.r2.local).');
  process.exit(1);
}

// Aceeași listă ca la Vercel Blob: media din Brain (fără video: site-ul folosește variantele din public/video) + brandbook-ul
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
db.close();

if (dry) {
  let bytes = 0, missing = [];
  for (const f of files) { try { bytes += (await stat(f.src)).size; } catch { missing.push(f.key); } }
  console.log(`${files.length} fișiere, ${(bytes / 1048576).toFixed(0)} MB de urcat${missing.length ? `; ${missing.length} lipsesc local:\n- ${missing.join('\n- ')}` : ''}`);
  process.exit(0);
}

// API-ul S3 al R2: https://<cont>.r2.cloudflarestorage.com/<bucket>/<cheie>, semnat SigV4 (regiunea „auto”)
const r2 = new AwsClient({accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto'});
const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
const url = key => `${endpoint}/${key.split('/').map(encodeURIComponent).join('/')}`;

// Ce e deja în bucket (ListObjectsV2, câte 1000), ca o rulare repetată să urce doar ce lipsește
const existing = new Set();
for (let token = ''; ;) {
  const r = await r2.fetch(`${endpoint}?list-type=2&max-keys=1000${token ? `&continuation-token=${encodeURIComponent(token)}` : ''}`);
  if (!r.ok) { console.error(`Listarea bucket-ului a eșuat: ${r.status} ${await r.text()}`); process.exit(1); }
  const xml = await r.text();
  for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) existing.add(m[1].replace(/&amp;/g, '&'));
  token = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1];
  if (!token) break;
}

const todo = files.filter(f => !existing.has(f.key));
console.log(`${files.length} fișiere, ${files.length - todo.length} deja în R2, ${todo.length} de urcat`);
let done = 0, failed = 0;
const worker = async () => {
  for (let f; (f = todo.shift());) {
    try {
      const r = await r2.fetch(url(f.key), {method: 'PUT', body: await readFile(f.src),
        headers: {'content-type': f.mime, 'cache-control': 'public, max-age=31536000, immutable'}});
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      if (++done % 50 === 0) console.log(`  ${done} urcate`);
    } catch (e) { failed++; console.error(`  ${f.key}: ${e.message}`); }
  }
};
await Promise.all(Array.from({length: 6}, worker));
console.log(`Gata: ${done} urcate, ${failed} eșuate.${R2_PUBLIC_URL ? ` Pe Vercel: MEDIA_BASE_URL=${R2_PUBLIC_URL}` : ''}`);
