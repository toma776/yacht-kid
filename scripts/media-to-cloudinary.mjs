// Fișierele media → Cloudinary (planul gratuit, fără card), ca site-ul de pe Vercel să le servească în locul Vercel Blob.
// Adresa Cloudinary păstrează calea: `media/2024/10/foto.jpg` → https://res.cloudinary.com/<cont>/image/upload/media/2024/10/foto.jpg
// (public_id = calea fără extensie; extensia din adresă alege formatul livrat). Pe Vercel se schimbă doar MEDIA_BASE_URL.
// Rulare: node --env-file=.env.cloudinary.local scripts/media-to-cloudinary.mjs [--dry] [--limit N]   (se poate relua: sare peste ce există)
//   .env.cloudinary.local: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (din Settings → API Keys)
import {readFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {mediaFiles} from './media-files.mjs';

const dry = process.argv.includes('--dry');
const limit = +(process.argv[process.argv.indexOf('--limit') + 1] ?? 0) || Infinity;  // doar primele N (pentru o probă)
// Cheia: cele trei variabile separate sau CLOUDINARY_URL (cloudinary://<api_key>:<api_secret>@<cloud_name>)
const fromUrl = (process.env.CLOUDINARY_URL ?? '').match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/) ?? [];
const apiKey = process.env.CLOUDINARY_API_KEY ?? fromUrl[1], apiSecret = process.env.CLOUDINARY_API_SECRET ?? fromUrl[2];
const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? fromUrl[3];
if (!dry && (!cloud || !apiKey || !apiSecret || /^LIPESTE/.test(apiSecret))) {
  console.error('Lipsește cheia Cloudinary: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY și CLOUDINARY_API_SECRET (vezi .env.cloudinary.local).');
  process.exit(1);
}

const files = (await mediaFiles()).slice(0, limit);
const base = `https://res.cloudinary.com/${cloud ?? '<cloud_name>'}/image/upload`;
const publicId = key => key.replace(/\.[^./]+$/, '');

if (dry) {
  let bytes = 0; const missing = [];
  for (const f of files) { try { bytes += (await stat(f.src)).size; } catch { missing.push(f.key); } }
  console.log(`${files.length} fișiere, ${(bytes / 1048576).toFixed(0)} MB de urcat${missing.length ? `; ${missing.length} lipsesc local:\n- ${missing.join('\n- ')}` : ''}`);
  console.log(`Exemplu: ${files[0].key} → ${base}/${files[0].key}`);
  process.exit(0);
}

// Încărcarea semnată (Upload API): semnătura = sha1 al parametrilor, în ordine alfabetică, urmați de secret
const sign = params => createHash('sha1').update(Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + apiSecret).digest('hex');
async function upload(f) {
  const params = {overwrite: 'false', public_id: publicId(f.key), timestamp: String(Math.floor(Date.now() / 1000))};
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.append(k, v);
  form.append('api_key', apiKey);
  form.append('signature', sign(params));
  form.append('file', new Blob([await readFile(f.src)], {type: f.mime}), f.key.split('/').pop());
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {method: 'POST', body: form});
  if (!r.ok) throw new Error(`${r.status} ${(await r.json().catch(() => ({}))).error?.message ?? ''}`);
}

let done = 0, skipped = 0, failed = 0;
const todo = [...files];
const worker = async () => {
  for (let f; (f = todo.shift());) {
    try {
      // Există deja? (adresa publică răspunde; un PDF răspunde 401 cât livrarea PDF e oprită, deci se reîncearcă fără pagubă)
      if ((await fetch(`${base}/${f.key}`, {method: 'HEAD'})).ok) { skipped++; continue; }
      await upload(f);
      if (++done % 50 === 0) console.log(`  ${done} urcate`);
    } catch (e) { failed++; console.error(`  ${f.key}: ${e.message}`); }
  }
};
await Promise.all(Array.from({length: 4}, worker));
console.log(`Gata: ${done} urcate, ${skipped} existau deja, ${failed} eșuate. Pe Vercel: MEDIA_BASE_URL=${base}`);
