// Fișierele pe care site-ul de pe Vercel le servește din stocarea externă (Cloudinary, R2): media din Brain, fără video
// (site-ul folosește variantele comprimate din public/video), plus brandbook-ul din public/brand (ținut în afara
// repo-ului public). Cheia e calea publică: `media/<filename>` și `brand/<cale>`; ruta /media/<id>/ redirecționează
// la MEDIA_BASE_URL + cheie, iar /brand/* se rescrie la fel (next.config.mjs).
import {readdir} from 'node:fs/promises';
import {join, extname} from 'node:path';
import {openDb, all} from '../src/core/db.mjs';

const MIME = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf'};

export async function mediaFiles(root = process.cwd()) {
  const snapshot = join(root, 'reference', 'snapshot', 'media'), brand = join(root, 'public', 'brand');
  const db = openDb({url: `file:${join(root, 'data', 'brain.db')}`});
  const media = (await all(db, `SELECT filename, mime FROM media WHERE mime NOT LIKE 'video/%' ORDER BY id`))
    .map(m => ({src: join(snapshot, m.filename), key: `media/${m.filename}`, mime: m.mime}));
  db.close();
  const brandFiles = (await readdir(brand, {recursive: true, withFileTypes: true})).filter(d => d.isFile() && MIME[extname(d.name).toLowerCase()])
    .map(d => { const rel = join(d.parentPath, d.name).slice(brand.length + 1).replaceAll('\\', '/'); return {src: join(brand, rel), key: `brand/${rel}`, mime: MIME[extname(d.name).toLowerCase()]}; });
  return [...media, ...brandFiles];
}
